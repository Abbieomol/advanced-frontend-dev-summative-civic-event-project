/**
 * pages/announcement-form.js
 * Admin create (POST /announcements, multipart with file key "audio") and
 * edit (PUT /announcements/:id) form.
 *
 * Backend note: PUT only updates title and published. It ignores a new audio
 * file, so in edit mode the file picker is replaced by the current audio.
 */
$(function () {
  // ROLE GUARD (admins only)
  if (!Auth.requireAdmin()) return;
  Layout.init();

  const editId = UI.param('id');
  const $form = $('#announcement-form');
  const $submit = $form.find('[type=submit]');
  let previewUrl = null;

  function showPreview(src) {
    $('#audio-preview').toggleClass('hidden', !src).find('audio').attr('src', src || '');
  }

  if (editId) {
    $('#form-title').text('Edit announcement');
    document.title = 'Edit announcement · ' + CONFIG.APP_NAME;
    $submit.text('Save changes');
    $('#audio').closest('.field').find('label[for=audio], #audio-hint, #audio').remove();
    $('#audio-field').prepend('<p class="label">Current audio</p><p class="mb-2 text-sm text-slate-600">The audio can\'t be replaced after upload. To use a different recording, create a new announcement and delete this one.</p>');
    $form.find('input, button').prop('disabled', true);

    Api.get('/announcements/' + encodeURIComponent(editId), null, { silent: true })
      .then(function (res) {
        $('#title').val(res.data.title);
        $('#published').prop('checked', res.data.published !== false);
        showPreview(Api.fileUrl(res.data.audio_url));
        $('#preview-label').text('Current audio');
        $form.find('input, button').prop('disabled', false);
      })
      .fail(function (err) { UI.formAlert($form, err.status === 404 ? 'This announcement no longer exists.' : err.message); });
  }

  // Check type/size before upload, then preview the chosen file
  $form.on('change', '#audio', function () {
    UI.clearErrors($form);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const file = this.files[0];
    if (!file) { showPreview(null); return; }
    const problem = UI.checkFile(file, 'audio');
    if (problem) { UI.fieldError($('#audio'), problem); $(this).val(''); showPreview(null); return; }
    previewUrl = URL.createObjectURL(file);
    showPreview(previewUrl);
  });

  $form.on('submit', function (e) {
    e.preventDefault();
    UI.clearErrors($form);
    const title = $.trim($('#title').val());
    const published = $('#published').is(':checked');
    const file = editId ? null : $('#audio')[0].files[0];
    let valid = true;

    if (!title) { UI.fieldError($('#title'), 'Enter a title.'); valid = false; }
    if (!editId && !file) { UI.fieldError($('#audio'), 'Choose an audio file to upload.'); valid = false; }
    if (!valid) { $form.find('[aria-invalid=true]').first().trigger('focus'); return; }

    UI.setLoading($submit, true, editId ? 'Saving…' : 'Uploading…');
    let request;
    if (editId) {
      request = Api.put('/announcements/' + encodeURIComponent(editId), { title: title, published: published }, { silent: true });
    } else {
      const data = new FormData();
      data.append('title', title);
      data.append('published', published ? 'true' : 'false');
      data.append('audio', file);
      request = Api.post('/announcements', data, { silent: true, onProgress: function (p) { UI.setProgress($('#upload-progress'), p); } });
    }

    request
      .then(function (res) {
        // The backend creates a notification for every new announcement.
        UI.flash(editId ? 'Announcement updated.' : 'Announcement created. Residents have been notified.', 'success');
        window.location.replace('announcement.html?id=' + encodeURIComponent(res.data.id));
      })
      .fail(function (err) {
        UI.setLoading($submit, false);
        $('#upload-progress').addClass('hidden');
        if (err.status !== 401) UI.formAlert($form, err.message);
      });
  });
});
