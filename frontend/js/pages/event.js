/**
 * pages/event.js
 * Event detail: image, description, dates, location with a map link,
 * and the Register / Cancel registration panel.
 */
$(function () {
  // ROLE GUARD (signed-in users)
  if (!Auth.requireLogin()) return;
  Layout.init();

  const eventId = UI.param('id');
  const $detail = $('#event-detail');
  let event = null;

  if (!eventId) {
    $detail.attr('aria-busy', 'false').html(UI.emptyState('No event selected', 'Choose an event from the list.', 'events.html', 'Browse events'));
    return;
  }

  function load() {
    $.when(Api.get('/events/' + encodeURIComponent(eventId), null, { silent: true }), Registrations.load())
      .then(function (res) {
        event = res.data;
        // ROLE GUARD (UI): unpublished events are hidden from normal users.
        if (event.published === false && !Auth.isAdmin()) {
          $detail.html(UI.emptyState('Event not available', "This event isn't published yet.", 'events.html', 'Browse events'));
          return;
        }
        document.title = event.title + ' · ' + CONFIG.APP_NAME;
        render();
      })
      .fail(function (err) {
        if (err.status === 404) {
          $detail.html(UI.emptyState('Event not found', 'It may have been removed or the link is wrong.', 'events.html', 'Browse events'));
        } else {
          UI.errorState($detail, err.message, load);
        }
      })
      .always(function () { $detail.attr('aria-busy', 'false'); });
  }

  function imageHtml() {
    const url = event.metadata && event.metadata.image_url ? Api.fileUrl(event.metadata.image_url) : '';
    if (!url) return '';
    return '<img src="' + UI.escapeHtml(url) + '" alt="' + UI.escapeHtml('Image for ' + event.title) + '" class="h-64 w-full rounded-2xl object-cover sm:h-80" onerror="this.remove()">';
  }

  function mapLink() {
    if (!event.location) return '';
    return '<a class="text-sm font-semibold text-teal-800 underline" target="_blank" rel="noopener" ' +
      'href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(event.location) + '">' +
      'Open in Google Maps<span class="sr-only"> (opens in a new tab)</span></a>';
  }

  // The panel on the right: depends on role, date and registration status.
  function registrationPanel() {
    const status = Registrations.status(event.id);
    let body;

    if (Auth.isAdmin()) {
      // ROLE GUARD (UI): admins manage events rather than registering.
      body = '<p class="text-sm text-slate-700">You\'re signed in as an admin. Admins manage events; registration is for residents.</p>';
    } else if (EventCard.isPast(event)) {
      body = '<p class="text-sm text-slate-700">This event has ended.</p>';
    } else if (status === 'registered') {
      body = '<p class="flex items-center gap-2 font-semibold text-emerald-800"><span aria-hidden="true">✓</span> You\'re registered</p>' +
        '<p class="mt-1 text-sm text-slate-600">We\'ll see you there. Can\'t make it? Free up your place for someone else.</p>' +
        '<button type="button" id="cancel-btn" class="btn btn-secondary mt-4 w-full">Cancel registration</button>';
    } else if (status === 'cancelled') {
      // The backend keeps cancelled rows and rejects a second registration (409),
      // so we explain that instead of showing a Register button that would fail.
      body = '<p class="font-semibold text-slate-800">You cancelled your registration.</p>' +
        '<p class="mt-1 text-sm text-slate-600">This system doesn\'t allow registering again for the same event. Contact the organisers at <a class="underline" href="mailto:' + CONFIG.SUPPORT_EMAIL + '">' + CONFIG.SUPPORT_EMAIL + '</a> if you need a place.</p>';
    } else {
      body = '<p class="text-sm text-slate-700">Free to attend. Save your place so organisers know you\'re coming.</p>' +
        '<button type="button" id="register-btn" class="btn btn-primary mt-4 w-full">Register for this event</button>';
    }
    return '<aside class="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="reg-heading">' +
      '<h2 id="reg-heading" class="font-semibold text-slate-900">Your place</h2><div id="reg-body" class="mt-2" aria-live="polite">' + body + '</div></aside>';
  }

  function render() {
    $detail.html(
      imageHtml() +
      '<div class="mt-6 grid gap-8 lg:grid-cols-3">' +
        '<article class="lg:col-span-2">' +
          (event.published === false ? '<p class="mb-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Unpublished</p>' : '') +
          '<h1 class="text-3xl font-bold leading-tight">' + UI.escapeHtml(event.title) + '</h1>' +
          '<dl class="mt-4 grid gap-3 sm:grid-cols-2">' +
            '<div class="rounded-lg bg-white p-3 ring-1 ring-slate-200"><dt class="text-xs font-semibold uppercase text-slate-500">When</dt>' +
              '<dd class="mt-1 text-slate-800">' + UI.escapeHtml(UI.formatDateRange(event.starts_at, event.ends_at)) + '</dd></div>' +
            '<div class="rounded-lg bg-white p-3 ring-1 ring-slate-200"><dt class="text-xs font-semibold uppercase text-slate-500">Where</dt>' +
              '<dd class="mt-1 text-slate-800">' + UI.escapeHtml(event.location || 'To be confirmed') + '</dd><dd class="mt-1">' + mapLink() + '</dd></div>' +
          '</dl>' +
          '<h2 class="mt-8 text-xl font-semibold">About this event</h2>' +
          '<p class="mt-2 whitespace-pre-line leading-relaxed text-slate-700">' + UI.escapeHtml(event.description || 'No description provided.') + '</p>' +
        '</article>' +
        '<div>' + registrationPanel() + '</div>' +
      '</div>'
    );
  }

  // ----- Register / cancel -----
  $detail.on('click', '#register-btn', function () {
    const $btn = $(this);
    UI.setLoading($btn, true, 'Registering…');
    Registrations.register(event.id)
      .then(function () {
        UI.toast("You're registered for " + event.title + '!', 'success');
        render();
        $('#cancel-btn').trigger('focus');
      })
      .fail(function () { UI.setLoading($btn, false); });
  });

  $detail.on('click', '#cancel-btn', function () {
    const $btn = $(this);
    UI.confirm({
      title: 'Cancel your registration?',
      message: 'You\'ll lose your place at "' + event.title + '". Note: this system does not let you register again for the same event afterwards.',
      confirmLabel: 'Yes, cancel it',
      cancelLabel: 'Keep my place',
      danger: true
    }).then(function () {
      UI.setLoading($btn, true, 'Cancelling…');
      Registrations.cancel(event.id)
        .then(function () { UI.toast('Your registration has been cancelled.', 'info'); render(); })
        .fail(function () { UI.setLoading($btn, false); });
    });
  });

  load();
});
