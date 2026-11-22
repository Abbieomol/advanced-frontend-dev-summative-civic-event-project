/**
 * pages/promo-form.js
 * Admin create (POST /promos) and edit (PUT /promos/:id) form, sent as
 * multipart/form-data with the file key "video". Title, description and
 * caption_text are required by the backend.
 */
$(function () {
  // ROLE GUARD (admins only)
  if (!Auth.requireAdmin()) return;
  Layout.init();

  const editId = UI.param('id');
  const $form = $('#promo-form');
  const $submit = $form.find('[type=submit]');
  let previewUrl = null;

  function showPreview(src) {
    $('#video-preview').toggleClass('hidden', !src).find('video').attr('src', src || '');
  }

  if (editId) {
    $('#form-title').text('Edit promo');
    document.title = 'Edit promo · ' + CONFIG.APP_NAME;
    $submit.text('Save changes');
    $('#video-required').remove();
    $('#video-hint').text('MP4, MOV, AVI or MKV, up to 8 MB. Choose a file only if you want to replace the current video.');
    $form.find('input, textarea, button').prop('disabled', true);

    Api.get('/promos/' + encodeURIComponent(editId), null, { silent: true })
      .then(function (res) {
        const p = res.data;
        $('#title').val(p.title);
        $('#description').val(p.description || '');
        $('#caption_text').val(p.caption_text || '');
        $('#published').prop('checked', p.published !== false);
        showPreview(Api.fileUrl(p.video_url));
        $('#preview-label').text('Current video');
        $form.find('input, textarea, button').prop('disabled', false);
      })
      .fail(function (err) { UI.formAlert($form, err.status === 404 ? 'This promo no longer exists.' : err.message); });
  }

  $('#video').on('change', function () {
    UI.clearErrors($form);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const file = this.files[0];
    if (!file) { showPreview(null); return; }
    const problem = UI.checkFile(file, 'video');
    if (problem) { UI.fieldError($('#video'), problem); $(this).val(''); showPreview(null); return; }
    previewUrl = URL.createObjectURL(file);
    showPreview(previewUrl);
    $('#preview-label').text('Preview of ' + file.name);
  });

  $form.on('submit', function (e) {
    e.preventDefault();
    UI.clearErrors($form);
    const title = $.trim($('#title').val());
    const description = $.trim($('#description').val());
    const caption = $.trim($('#caption_text').val());
    const published = $('#published').is(':checked');
    const file = $('#video')[0].files[0];
    let valid = true;

    if (!title) { UI.fieldError($('#title'), 'Enter a title.'); valid = false; }
    if (!description) { UI.fieldError($('#description'), 'Enter a short description.'); valid = false; }
    if (!editId && !file) { UI.fieldError($('#video'), 'Choose a video file to upload.'); valid = false; }
    if (!caption) { UI.fieldError($('#caption_text'), 'Add captions so the video is accessible.'); valid = false; }
    if (!valid) { $form.find('[aria-invalid=true]').first().trigger('focus'); return; }

    const data = new FormData();
    data.append('title', title);
    data.append('description', description);
    data.append('caption_text', caption);
    if (editId) data.append('published', published ? 'true' : 'false');
    if (file) data.append('video', file);

    UI.setLoading($submit, true, file ? 'Uploading…' : 'Saving…');
    const opts = { silent: true, onProgress: file ? function (p) { UI.setProgress($('#upload-progress'), p); } : null };
    const request = editId
      ? Api.put('/promos/' + encodeURIComponent(editId), data, opts)
      // New promos are always created as published by the backend, so if
      // "Published" is unticked we unpublish it straight after creating it.
      : Api.post('/promos', data, opts).then(function (res) {
          if (published) return res;
          return Api.patch('/promos/' + encodeURIComponent(res.data.id) + '/unpublish', {}, { silent: true })
            .then(function () { return res; });
        });

    request
      .then(function (res) {
        PromoCache.clear(); // the list changed, so drop the cached copy
        UI.flash(editId ? 'Promo updated.' : (published ? 'Promo created. Residents have been notified.' : 'Promo saved as unpublished.'), 'success');
        window.location.replace('promo.html?id=' + encodeURIComponent(res.data.id));
      })
      .fail(function (err) {
        UI.setLoading($submit, false);
        $('#upload-progress').addClass('hidden');
        if (err.status !== 401) UI.formAlert($form, err.message);
      });
  });
});
