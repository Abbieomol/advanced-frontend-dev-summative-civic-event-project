// Event details page: info, map link, register/cancel, attendees (admin) and feedback

$(function () {
  // ROLE GUARD: logged-in users only
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
        // ROLE GUARD: normal users can't open unpublished events
        if (event.published === false && !Auth.isAdmin()) {
          $detail.html(UI.emptyState('Event not available', "This event isn't published yet.", 'events.html', 'Browse events'));
          return;
        }
        document.title = event.title + ' · ' + CONFIG.APP_NAME;
        render();
        loadAttendees();
        Feedback.init($('#feedback'), event);
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
    // object-contain so portrait posters aren't cropped, with a blurred copy behind
    return '<div class="relative flex justify-center overflow-hidden rounded-2xl bg-ink">' +
      '<img src="' + UI.escapeHtml(url) + '" alt="" aria-hidden="true" class="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-xl">' +
      '<img src="' + UI.escapeHtml(url) + '" alt="' + UI.escapeHtml('Image for ' + event.title) + '" class="relative max-h-[30rem] w-auto max-w-full object-contain" onerror="this.parentNode.remove()">' +
    '</div>';
  }

  function mapLink() {
    if (!event.location) return '';
    return '<a class="text-sm font-semibold text-brand-800 underline" target="_blank" rel="noopener" ' +
      'href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(event.location) + '">' +
      'Open in Google Maps<span class="sr-only"> (opens in a new tab)</span></a>';
  }

  function registrationPanel() {
    const status = Registrations.status(event.id);
    let body;

    // ROLE GUARD: admins manage events instead of registering
    if (Auth.isAdmin()) {
      body = '<p class="text-sm text-slate-700">You\'re signed in as an admin. Admins manage events; registration is for residents.</p>';
    } else if (EventCard.isPast(event)) {
      body = '<p class="text-sm text-slate-700">This event has ended.</p>';
    } else if (status === 'registered') {
      body = '<p class="flex items-center gap-2 font-semibold text-emerald-800"><span aria-hidden="true">✓</span> You\'re registered</p>' +
        '<p class="mt-1 text-sm text-slate-600">We\'ll see you there. Can\'t make it? Free up your place for someone else.</p>' +
        '<button type="button" id="cancel-btn" class="btn btn-secondary mt-4 w-full">Cancel registration</button>';
    // backend blocks re-registering after a cancel, so explain instead of showing a button
    } else if (status === 'cancelled') {
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
          // ROLE GUARD: admin toolbar
          '<div class="mb-3 flex flex-wrap gap-2" data-role="admin" hidden>' +
            '<a href="event-form.html?id=' + encodeURIComponent(event.id) + '" class="btn btn-secondary btn-sm">Edit event</a>' +
            '<button type="button" id="delete-event" class="btn btn-danger btn-sm">Delete event</button>' +
          '</div>' +
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
    Auth.applyRoleVisibility($detail);
  }

  // ROLE GUARD: attendee list is admin-only (the endpoint is too)
  function loadAttendees() {
    if (!Auth.isAdmin()) return;
    const $body = $('#attendees-body').html(UI.skeletonRows(2));
    Api.get('/event-registrations/event/' + encodeURIComponent(event.id) + '/attendees', null, { silent: true })
      .then(function (res) {
        const people = res.data || [];
        if (!people.length) { $body.html('<p class="text-slate-600">No one has registered yet.</p>'); return; }
        $body.html(
          '<p class="text-sm text-slate-600">' + people.length + ' registered</p>' +
          '<div class="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white">' +
            '<table class="w-full text-left text-sm"><caption class="sr-only">People registered for ' + UI.escapeHtml(event.title) + '</caption>' +
            '<thead class="bg-slate-50 text-slate-600"><tr><th scope="col" class="px-4 py-2">Name</th><th scope="col" class="px-4 py-2">Email</th><th scope="col" class="px-4 py-2">Registered</th></tr></thead><tbody>' +
            people.map(function (p) {
              return '<tr class="border-t border-slate-100"><td class="px-4 py-2 font-medium">' + UI.escapeHtml(p.full_name) + '</td>' +
                '<td class="px-4 py-2"><a class="underline" href="mailto:' + UI.escapeHtml(p.email) + '">' + UI.escapeHtml(p.email) + '</a></td>' +
                '<td class="px-4 py-2">' + UI.escapeHtml(UI.formatDate(p.created_at)) + '</td></tr>';
            }).join('') +
            '</tbody></table></div>'
        );
      })
      .fail(function (err) { UI.errorState($body, err.message, loadAttendees); });
  }

  $detail.on('click', '#delete-event', function () {
    EventCard.confirmDelete(event.id, event.title, $(this)).then(function () {
      UI.flash('"' + event.title + '" was deleted.', 'success');
      window.location.replace('events.html');
    });
  });

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
