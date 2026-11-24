// Wrapper around $.ajax so every request gets the token and the same error handling

const Api = (function () {

  function request(method, path, data, options) {
    options = options || {};

    const settings = {
      url: CONFIG.API_BASE_URL + path,
      method: method,
      timeout: CONFIG.REQUEST_TIMEOUT_MS,
      headers: {},
      dataType: 'json'
    };

    const jwt = Auth.token();
    // attach the token to every request
    if (jwt) settings.headers.Authorization = 'Bearer ' + jwt;

    // file uploads: let the browser set the multipart headers itself
    if (data instanceof FormData) {
      settings.data = data;
      settings.processData = false;
      settings.contentType = false;
    } else if (data !== undefined && data !== null && method !== 'GET') {
      settings.data = JSON.stringify(data);
      settings.contentType = 'application/json';
    } else if (data) {
      settings.data = data;
    }

    // upload progress bar
    if (options.onProgress) {
      settings.xhr = function () {
        const xhr = $.ajaxSettings.xhr();
        if (xhr.upload) {
          xhr.upload.addEventListener('progress', function (e) {
            if (e.lengthComputable) options.onProgress(Math.round((e.loaded / e.total) * 100));
          });
        }
        return xhr;
      };
    }

    return $.ajax(settings).then(
      function (body) { return body; },
      function (xhr, textStatus) {
        const error = normaliseError(xhr, textStatus);
        handleError(error, options, function retry() {
          return request(method, path, data, options);
        });
        return $.Deferred().reject(error).promise();
      }
    );
  }

  // Turn a failed request into { status, message, errors } with a readable message
  function normaliseError(xhr, textStatus) {
    const body = xhr.responseJSON || {};
    const error = {
      status: xhr.status,
      message: body.message || '',
      errors: body.errors || []
    };

    if (xhr.status === 0) {
      error.message = textStatus === 'timeout'
        ? 'The server took too long to respond.'
        : "Can't reach the server. Check your internet connection and that the backend is running.";
    } else if (body.errors && body.errors.length) {
      error.message = body.errors.map(function (e) { return e.message; }).join(' ');
    } else if (!error.message) {
      error.message = xhr.status >= 500
        ? 'Something went wrong on the server. Please try again in a moment.'
        : 'The request could not be completed.';
    }
    return error;
  }

  // 401 = token expired -> log out (except on the login form, where it just means wrong password)
  // 403 = not allowed, 0 = no connection (offer a retry)
  function handleError(error, options, retry) {
    if (error.status === 401 && !options.skipAuthRedirect) {
      Auth.logout('expired');
      return;
    }

    if (options.silent) return;

    if (error.status === 403) {
      UI.toast("You don't have permission to do that. If you think this is a mistake, contact an administrator at " + CONFIG.SUPPORT_EMAIL + '.', 'error');
      return;
    }

    if (error.status === 0) {
      UI.toast(error.message, 'error', { actionLabel: 'Retry', onAction: retry });
      return;
    }

    UI.toast(error.message, 'error');
  }

  return {
    request: request,
    get: function (path, query, options) { return request('GET', path, query, options); },
    post: function (path, body, options) { return request('POST', path, body, options); },
    put: function (path, body, options) { return request('PUT', path, body, options); },
    patch: function (path, body, options) { return request('PATCH', path, body, options); },
    del: function (path, options) { return request('DELETE', path, null, options); },

    // uploaded files can come back as full URLs or relative paths
    fileUrl: function (pathOrUrl) {
      if (!pathOrUrl) return '';
      if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
      return CONFIG.FILES_BASE_URL + '/' + String(pathOrUrl).replace(/^\/+/, '');
    }
  };
})();
