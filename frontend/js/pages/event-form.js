// Admin form to create or edit an event (event-form.html?id=... to edit).
// Sent as FormData so the image can go with it.

$(function () {
  // ROLE GUARD: admins only
  if (!Auth.requireAdmin()) return;
  Layout.init();

  const editId = UI.param('id');
  const $form = $('#event-form');
  const $submit = $form.find('[type=submit]');
  let currentImageUrl = '';

  // datetime-local inputs want "YYYY-MM-DDTHH:MM" in local time
  function toLocalInput(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function showPreview(url, alt) {
    $('#image-preview').html(url
      ? '<img src="' + UI.escapeHtml(url) + '" alt="' + UI.escapeHtml(alt) + '" class="h-full w-full object-contain">'
      : 'No image chosen');
  }

  if (editId) {
    $('#form-title').text('Edit event');
    document.title = 'Edit event · ' + CONFIG.APP_NAME;
    $submit.text('Save changes');
    $form.find('input, textarea, button').prop('disabled', true);

    Api.get('/events/' + encodeURIComponent(editId), null, { silent: true })
      .then(function (res) {
        const e = res.data;
        $('#title').val(e.title);
        $('#description').val(e.description || '');
        $('#location').val(e.location || '');
        $('#starts_at').val(toLocalInput(e.starts_at));
        $('#ends_at').val(toLocalInput(e.ends_at));
        currentImageUrl = e.metadata && e.metadata.image_url ? Api.fileUrl(e.metadata.image_url) : '';
        showPreview(currentImageUrl, 'Current image for ' + e.title);
        $('#image-hint').text('JPG, PNG or GIF, up to 2 MB.');
        $('nav[aria-label=Breadcrumb] a').attr('href', 'event.html?id=' + encodeURIComponent(editId)).text('‹ Back to event');
        $form.find('input, textarea, button').prop('disabled', false);
      })
      .fail(function (err) {
        UI.formAlert($form, err.status === 404 ? 'This event no longer exists.' : err.message);
      });
  }

  // check the image and show a preview before uploading
  $('#image').on('change', function () {
    UI.clearErrors($form);
    const file = this.files[0];
    if (!file) { showPreview(currentImageUrl, 'Current image'); $('#clear-image').addClass('hidden'); return; }

    const problem = UI.checkFile(file, 'image');
    if (problem) {
      UI.fieldError($('#image'), problem);
      $(this).val('');
      showPreview(currentImageUrl, 'Current image');
      return;
    }
    const reader = new FileReader();
    reader.onload = function (e) { showPreview(e.target.result, 'Preview of ' + file.name); };
    reader.readAsDataURL(file);
    $('#clear-image').removeClass('hidden');
  });

  $('#clear-image').on('click', function () {
    $('#image').val('').trigger('change').trigger('focus');
  });

  $form.on('submit', function (e) {
    e.preventDefault();
    UI.clearErrors($form);

    const title = $.trim($('#title').val());
    const location = $.trim($('#location').val());
    const startsVal = $('#starts_at').val();
    const endsVal = $('#ends_at').val();
    let valid = true;

    if (!title) { UI.fieldError($('#title'), 'Enter a title.'); valid = false; }
    if (!location) { UI.fieldError($('#location'), 'Enter a location.'); valid = false; }
    if (!startsVal) { UI.fieldError($('#starts_at'), 'Choose when the event starts.'); valid = false; }
    if (!endsVal) { UI.fieldError($('#ends_at'), 'Choose when the event ends.'); valid = false; }
    if (startsVal && endsVal && new Date(endsVal) <= new Date(startsVal)) {
      UI.fieldError($('#ends_at'), 'The end must be after the start.'); valid = false;
    }
    if (!valid) { $form.find('[aria-invalid=true]').first().trigger('focus'); return; }

    const data = new FormData();
    data.append('title', title);
    data.append('description', $.trim($('#description').val()));
    data.append('location', location);
    data.append('starts_at', new Date(startsVal).toISOString());
    data.append('ends_at', new Date(endsVal).toISOString());
    const file = $('#image')[0].files[0];
    if (file) data.append('image', file);

    UI.setLoading($submit, true, editId ? 'Saving…' : 'Creating…');
    const $progress = $('#upload-progress');
    const request = editId
      ? Api.put('/events/' + encodeURIComponent(editId), data, { silent: true, onProgress: file ? function (p) { UI.setProgress($progress, p); } : null })
      : Api.post('/events', data, { silent: true, onProgress: file ? function (p) { UI.setProgress($progress, p); } : null });

    request
      .then(function (res) {
        UI.flash(editId ? 'Event updated.' : 'Event created. Everyone has been notified.', 'success');
        window.location.replace('event.html?id=' + encodeURIComponent(res.data.id));
      })
      .fail(function (err) {
        UI.setLoading($submit, false);
        $progress.addClass('hidden');
        if (err.status !== 401) {
          UI.formAlert($form, err.message);
          $form.find('.form-alert').attr('tabindex', '-1').trigger('focus');
        }
      });
  });
});
