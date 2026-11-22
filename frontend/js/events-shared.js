/**
 * events-shared.js
 * Code used by several event pages (dashboard, events list, event detail,
 * my registrations): the current user's registrations and the event card.
 */

/**
 * Registrations: remembers which events the signed-in user is registered for.
 * The backend keeps cancelled registrations (status = 'cancelled'), so we
 * look at the status, not just whether a row exists.
 */
const Registrations = (function () {
  let byEvent = {};

  function load() {
    // ROLE GUARD (UI): only normal users register, so admins skip this call.
    if (Auth.isAdmin()) { byEvent = {}; return $.Deferred().resolve([]).promise(); }
    return Api.get('/event-registrations/my-registrations', null, { silent: true }).then(function (res) {
      byEvent = {};
      (res.data || []).forEach(function (r) { byEvent[r.event_id] = r; });
      return res.data || [];
    });
  }

  function status(eventId) {
    return byEvent[eventId] ? byEvent[eventId].status : null; // 'registered' | 'cancelled' | null
  }

  function register(eventId) {
    return Api.post('/event-registrations/register', { event_id: eventId }, { silent: true })
      .then(function (res) { byEvent[eventId] = res.data; return res; })
      .fail(function (err) {
        if (err.status === 409 && status(eventId) === 'cancelled') {
          err.message = "You cancelled your place for this event earlier, and the system doesn't allow registering again. Please contact the organisers if you need a place.";
        } else if (err.status === 409) {
          err.message = "You're already registered for this event.";
        }
        if (err.status !== 401) UI.toast(err.message, 'error');
      });
  }

  function cancel(eventId) {
    return Api.post('/event-registrations/cancel', { event_id: eventId }, { silent: true })
      .then(function (res) { byEvent[eventId] = res.data; return res; })
      .fail(function (err) { if (err.status !== 401) UI.toast(err.message, 'error'); });
  }

  // Number of events the user currently holds a place for
  function activeCount() {
    return Object.keys(byEvent).filter(function (id) { return byEvent[id].status === 'registered'; }).length;
  }

  return { load: load, status: status, register: register, cancel: cancel, activeCount: activeCount };
})();

/**
 * EventCard: renders one event as a card. Used on the events list and dashboard.
 */
const EventCard = (function () {

  function isPast(event) {
    const end = event.ends_at || event.starts_at;
    return end ? new Date(end) < new Date() : false;
  }

  function imageHtml(event) {
    const url = event.metadata && event.metadata.image_url ? Api.fileUrl(event.metadata.image_url) : '';
    if (url) {
      return '<img src="' + UI.escapeHtml(url) + '" alt="' + UI.escapeHtml('Image for ' + event.title) + '" loading="lazy" class="h-40 w-full object-cover" onerror="this.replaceWith(EventCard.placeholder())">';
    }
    return EventCard.placeholder().outerHTML;
  }

  // Shown when an event has no image (or it fails to load).
  function placeholder() {
    const div = document.createElement('div');
    div.className = 'flex h-40 w-full items-center justify-center bg-gradient-to-br from-teal-600 to-slate-800 text-white';
    div.setAttribute('aria-hidden', 'true');
    div.innerHTML = '<svg class="h-12 w-12 opacity-80" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>';
    return div;
  }

  function badgesHtml(event) {
    let html = '';
    if (event.published === false) html += '<span class="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Unpublished</span>';
    if (isPast(event)) html += '<span class="rounded bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">Ended</span>';
    else if (Registrations.status(event.id) === 'registered') html += '<span class="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">✓ You\'re registered</span>';
    else if (Registrations.status(event.id) === 'cancelled') html += '<span class="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">Registration cancelled</span>';
    return html ? '<div class="flex flex-wrap gap-2">' + html + '</div>' : '';
  }

  function actionsHtml(event) {
    const title = UI.escapeHtml(event.title);
    let html = '<a href="event.html?id=' + encodeURIComponent(event.id) + '" class="btn btn-secondary btn-sm" aria-label="View details for ' + title + '">View details</a>';

    // ROLE GUARD (UI): the Register button is for normal users only
    // (data-role="user"); applyRoleVisibility removes it for admins.
    if (!isPast(event) && !Registrations.status(event.id)) {
      html += '<button type="button" class="register-btn btn btn-primary btn-sm" data-role="user" data-id="' + UI.escapeHtml(event.id) + '" aria-label="Register for ' + title + '">Register</button>';
    }
    return '<div class="mt-auto flex flex-wrap gap-2 pt-4">' + html + '</div>';
  }

  function render(event) {
    return '' +
      '<article class="card-hover flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white" data-event-id="' + UI.escapeHtml(event.id) + '">' +
        imageHtml(event) +
        '<div class="flex flex-1 flex-col gap-2 p-4">' +
          badgesHtml(event) +
          '<h3 class="text-lg font-semibold leading-snug text-slate-900">' +
            '<a class="hover:underline" href="event.html?id=' + encodeURIComponent(event.id) + '">' + UI.escapeHtml(event.title) + '</a>' +
          '</h3>' +
          '<p class="text-sm text-slate-700"><span class="sr-only">When: </span><time datetime="' + UI.escapeHtml(event.starts_at) + '">' + UI.escapeHtml(UI.formatDate(event.starts_at)) + '</time></p>' +
          '<p class="text-sm text-slate-700"><span class="sr-only">Where: </span>' + UI.escapeHtml(event.location || 'Location to be confirmed') + '</p>' +
          '<p class="text-sm text-slate-600">' + UI.escapeHtml(UI.truncate(event.description, 120)) + '</p>' +
          actionsHtml(event) +
        '</div>' +
      '</article>';
  }

  /**
   * Handles clicks on Register buttons inside $container (event delegation,
   * so it also works for cards rendered later). onChange re-renders.
   */
  function bindRegister($container, onChange) {
    $container.on('click', '.register-btn', function () {
      const $btn = $(this);
      const id = $btn.data('id');
      UI.setLoading($btn, true, 'Registering…');
      Registrations.register(id)
        .then(function () {
          UI.toast("You're registered! You'll find it under My registrations.", 'success');
          onChange();
        })
        .fail(function () { UI.setLoading($btn, false); });
    });
  }

  return { render: render, placeholder: placeholder, isPast: isPast, bindRegister: bindRegister };
})();
