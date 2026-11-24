// Admin actions shared by announcements and promos: publish/unpublish and delete.
// ROLE GUARD: only admins see the buttons that call these (backend checks too).

const ContentAdmin = (function () {

  function setPublished(resource, noun, item, publish, $btn) {
    if ($btn) UI.setLoading($btn, true, publish ? 'Publishing…' : 'Unpublishing…');
    return Api.patch('/' + resource + '/' + encodeURIComponent(item.id) + (publish ? '/publish' : '/unpublish'), {})
      .then(function (res) {
        if (resource === 'promos') PromoCache.clear();
        UI.toast(publish
          ? '"' + item.title + '" is now live. Everyone has been notified.'
          : '"' + item.title + '" is now hidden from residents.', 'success');
        return res.data;
      })
      .always(function () { if ($btn) UI.setLoading($btn, false); });
  }

  function remove(resource, noun, item, $btn) {
    const done = $.Deferred();
    UI.confirm({
      title: 'Delete this ' + noun + '?',
      message: '"' + item.title + '" will be removed for everyone. This can\'t be undone.',
      confirmLabel: 'Delete ' + noun,
      cancelLabel: 'Keep it',
      danger: true
    }).then(function () {
      if ($btn) UI.setLoading($btn, true, 'Deleting…');
      Api.del('/' + resource + '/' + encodeURIComponent(item.id))
        .then(function () {
          if (resource === 'promos') PromoCache.clear();
          UI.toast('"' + item.title + '" was deleted.', 'success');
          done.resolve();
        })
        .fail(function () { if ($btn) UI.setLoading($btn, false); done.reject(); });
    });
    return done.promise();
  }

  return { setPublished: setPublished, remove: remove };
})();

// Cache the promos list for a minute. Cleared whenever an admin changes something.
const PromoCache = {
  KEY: 'ce_promos_cache',
  get: function () {
    try {
      const c = JSON.parse(sessionStorage.getItem(this.KEY));
      return c && Date.now() - c.at < CONFIG.PROMOS_CACHE_MS ? c.data : null;
    } catch (e) { return null; }
  },
  set: function (data) { sessionStorage.setItem(this.KEY, JSON.stringify({ at: Date.now(), data: data })); },
  clear: function () { sessionStorage.removeItem(this.KEY); }
};
