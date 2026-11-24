// Feedback section on the event page.
// Only admins can fetch everyone's feedback, so normal users just see and edit their own.
// One feedback per user per event (the database enforces it).

const Feedback = (function () {
  let $section, $body, event, mine = null;

  function init($sec, ev) {
    $section = $sec; event = ev; $body = $sec.find('#feedback-body');
    $section.removeAttr('hidden');
    // ROLE GUARD: admins get every review + the average, users get their own
    Auth.isAdmin() ? loadAll() : loadMine();
  }

  function loadAll() {
    $body.html(UI.skeletonRows(2));
    Api.get('/event-feedback/event/' + encodeURIComponent(event.id), null, { silent: true })
      .then(function (res) {
        const list = res.data || [];
        if (!list.length) { $body.html('<p class="text-slate-600">No feedback yet.</p>'); return; }

        const avg = list.reduce(function (sum, f) { return sum + Number(f.rating); }, 0) / list.length;
        const counts = [5, 4, 3, 2, 1].map(function (star) {
          return { star: star, n: list.filter(function (f) { return Number(f.rating) === star; }).length };
        });

        $body.html(
          '<div class="grid gap-6 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-[12rem_1fr]">' +
            '<div><p class="text-4xl font-bold">' + avg.toFixed(1) + '</p>' +
              '<p class="text-lg">' + UI.stars(avg) + '</p>' +
              '<p class="text-sm text-slate-600">Average of ' + list.length + ' review' + (list.length === 1 ? '' : 's') + '</p></div>' +
            '<ul class="space-y-1" aria-label="Ratings breakdown">' + counts.map(function (c) {
              const pct = Math.round((c.n / list.length) * 100);
              return '<li class="flex items-center gap-2 text-sm"><span class="w-12">' + c.star + ' star</span>' +
                '<span class="h-2 flex-1 rounded bg-slate-100" aria-hidden="true"><span class="block h-2 rounded bg-amber-400" style="width:' + pct + '%"></span></span>' +
                '<span class="w-16 text-right text-slate-600">' + c.n + ' (' + pct + '%)</span></li>';
            }).join('') + '</ul>' +
          '</div>' +
          '<ul class="mt-4 space-y-3">' + list.map(reviewHtml).join('') + '</ul>'
        );
      })
      .fail(function (err) { UI.errorState($body, err.message, loadAll); });
  }

  function reviewHtml(f) {
    return '<li class="rounded-xl border border-slate-200 bg-white p-4">' +
      '<div class="flex flex-wrap items-center justify-between gap-2">' +
        '<p class="font-semibold">' + UI.escapeHtml(f.full_name || 'You') + '</p>' +
        '<p class="text-sm text-slate-500">' + UI.escapeHtml(UI.formatDate(f.created_at)) + '</p></div>' +
      '<p class="mt-1">' + UI.stars(f.rating) + '</p>' +
      (f.comment ? '<p class="mt-2 whitespace-pre-line text-slate-700">' + UI.escapeHtml(f.comment) + '</p>' : '') +
    '</li>';
  }

  function loadMine() {
    $body.html(UI.skeletonRows(1));
    Api.get('/event-feedback/my-feedback', null, { silent: true })
      .then(function (res) {
        mine = (res.data || []).filter(function (f) { return f.event_id === event.id; })[0] || null;
        mine ? showMine() : showForm();
      })
      .fail(function (err) { UI.errorState($body, err.message, loadMine); });
  }

  function showMine() {
    $body.html(
      '<p class="mb-2 text-sm text-slate-600">Thanks for your feedback. You can update it at any time.</p>' +
      '<ul>' + reviewHtml($.extend({}, mine, { full_name: 'Your feedback' })) + '</ul>' +
      '<button type="button" id="edit-feedback" class="btn btn-secondary btn-sm mt-3">Edit my feedback</button>' +
      '<p class="mt-3 text-sm text-slate-500">Overall ratings are shared with the organisers.</p>'
    );
    $('#edit-feedback').on('click', function () { showForm(mine); });
  }

  // Rating is 5 radio buttons styled as stars, so arrow keys work too
  function showForm(existing) {
    const rating = existing ? Number(existing.rating) : 0;
    let radios = '';
    for (let i = 1; i <= 5; i++) {
      radios += '<label class="star-label cursor-pointer text-3xl leading-none text-slate-300" data-value="' + i + '">' +
        '<input type="radio" name="rating" value="' + i + '" class="sr-only"' + (i === rating ? ' checked' : '') + '>' +
        '<span aria-hidden="true">★</span><span class="sr-only">' + i + ' star' + (i === 1 ? '' : 's') + '</span></label>';
    }

    $body.html(
      '<form id="feedback-form" class="space-y-4 rounded-xl border border-slate-200 bg-white p-5" novalidate>' +
        '<div class="form-alert hidden rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900" role="alert"></div>' +
        '<fieldset class="field" id="rating-field"><legend class="label">' + (existing ? 'Update your rating' : 'How was this event?') + ' <span aria-hidden="true">*</span></legend>' +
          '<div id="rating" class="flex gap-1" tabindex="-1">' + radios + '</div></fieldset>' +
        '<div class="field"><label for="comment" class="label">Comment (optional)</label>' +
          '<textarea id="comment" rows="3" maxlength="1000" class="input" placeholder="What did you enjoy? What could be better?">' + UI.escapeHtml(existing ? existing.comment || '' : '') + '</textarea></div>' +
        '<div class="flex gap-3"><button type="submit" class="btn btn-primary">' + (existing ? 'Update feedback' : 'Submit feedback') + '</button>' +
          (existing ? '<button type="button" id="cancel-edit" class="btn btn-secondary">Cancel</button>' : '') + '</div>' +
        (existing ? '' : '<p class="text-sm text-slate-500">You can leave one piece of feedback per event, and edit it later.</p>') +
      '</form>'
    );

    const $form = $('#feedback-form');
    paintStars($form);
    $form.on('change', 'input[name=rating]', function () { paintStars($form); });
    $form.on('focusin focusout', 'input[name=rating]', function (e) {
      $(this).closest('label').toggleClass('ring-2 ring-amber-500 rounded', e.type === 'focusin');
    });
    $('#cancel-edit').on('click', showMine);
    $form.on('submit', function (e) { e.preventDefault(); submit($form, existing); });
  }

  function paintStars($form) {
    const value = Number($form.find('input[name=rating]:checked').val() || 0);
    $form.find('.star-label').each(function () {
      $(this).toggleClass('text-amber-500', Number($(this).data('value')) <= value)
        .toggleClass('text-slate-300', Number($(this).data('value')) > value);
    });
  }

  function submit($form, existing) {
    UI.clearErrors($form);
    const rating = Number($form.find('input[name=rating]:checked').val() || 0);
    const comment = $.trim($('#comment').val());
    if (!rating) {
      UI.formAlert($form, 'Choose a rating from 1 to 5 stars.');
      $form.find('input[name=rating]').first().trigger('focus');
      return;
    }

    const $btn = $form.find('[type=submit]');
    UI.setLoading($btn, true, 'Sending…');
    const request = existing
      ? Api.put('/event-feedback/' + encodeURIComponent(existing.id), { rating: rating, comment: comment }, { silent: true })
      : Api.post('/event-feedback', { event_id: event.id, rating: rating, comment: comment }, { silent: true });

    request
      .then(function (res) {
        mine = $.extend({}, existing || {}, res.data);
        UI.toast(existing ? 'Your feedback has been updated.' : 'Thanks! Your feedback has been submitted.', 'success');
        showMine();
      })
      .fail(function (err) {
        UI.setLoading($btn, false);
        // already left feedback for this event
        if (err.status === 409) {
          UI.toast("You've already left feedback for this event. You can edit it instead.", 'info');
          loadMine();
        } else if (err.status !== 401) {
          UI.formAlert($form, err.message);
        }
      });
  }

  return { init: init };
})();
