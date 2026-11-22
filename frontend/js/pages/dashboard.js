/**
 * pages/dashboard.js
 * Home page after login: greeting, the user's activity numbers
 * (GET /dashboard/me) and the next three upcoming events.
 */
$(function () {
  // ROLE GUARD (signed-in users)
  if (!Auth.requireLogin()) return;
  Layout.init();

  const user = Auth.user();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  $('#greeting').text(greeting + ', ' + user.full_name.split(' ')[0]);

  // Sent here by Auth.requireAdmin() when a normal user opened an admin page
  if (UI.param('denied')) {
    UI.toast("That page is for administrators only. If you need access, contact " + CONFIG.SUPPORT_EMAIL + '.', 'error');
    history.replaceState(null, '', 'dashboard.html');
  }

  // Load the user's registrations once and share the result between sections
  // (re-fetch only if the previous attempt failed).
  let regsPromise = null;
  function registrations() {
    if (!regsPromise || regsPromise.state() === 'rejected') regsPromise = Registrations.load();
    return regsPromise;
  }

  function statCard(label, value, href) {
    return '<a href="' + href + '" class="card-hover block rounded-xl border border-slate-200 bg-white p-5">' +
      '<p class="text-sm font-medium text-slate-600">' + label + '</p>' +
      '<p class="mt-2 text-3xl font-bold text-slate-900">' + value + '</p></a>';
  }

  function loadStats() {
    const $stats = $('#stats').html(UI.skeletonRows(4));
    $.when(Api.get('/dashboard/me', null, { silent: true }), registrations())
      .then(function (res) {
        const d = res.data || {};
        // Postgres COUNT() comes back as a string, so convert with Number().
        // The API's registration count includes cancelled ones, so we count
        // active registrations from the registrations list instead.
        const active = Registrations.activeCount();
        const cards = [];
        // ROLE GUARD (UI): registrations and feedback only apply to normal users.
        if (!Auth.isAdmin()) {
          cards.push(statCard('My registrations', active, 'my-registrations.html'));
          cards.push(statCard('Feedback given', Number((d.feedbacks || {}).total_feedbacks || 0), 'my-registrations.html'));
        }
        cards.push(statCard('Announcements', Number((d.announcements || {}).total_announcements || 0), 'announcements.html'));
        cards.push(statCard('Promos', Number((d.promos || {}).total_promos || 0), 'promos.html'));
        $stats.html(cards.join(''));
      })
      .fail(function (err) { UI.errorState($stats, err.message, loadStats); })
      .always(function () { $stats.attr('aria-busy', 'false'); });
  }

  function loadUpcoming() {
    const $up = $('#upcoming').html(UI.skeletonCards(3));
    $.when(Api.get('/events', null, { silent: true }), registrations())
      .then(function (res) {
        const next = (res.data || [])
          .filter(function (e) { return e.published !== false && !EventCard.isPast(e); })
          .sort(function (a, b) { return new Date(a.starts_at) - new Date(b.starts_at); })
          .slice(0, 3);
        if (!next.length) {
          $up.html(UI.emptyState('No upcoming events', 'New events will show up here and in your notifications.'));
        } else {
          $up.html(next.map(EventCard.render).join(''));
          Auth.applyRoleVisibility($up);
        }
      })
      .fail(function (err) { UI.errorState($up, err.message, loadUpcoming); })
      .always(function () { $up.attr('aria-busy', 'false'); });
  }

  // After registering from a card, redraw the cards and refresh the numbers.
  EventCard.bindRegister($('#upcoming'), function () { loadUpcoming(); loadStats(); });
  EventCard.bindDelete($('#upcoming'), function () { loadUpcoming(); });
  loadStats();
  loadUpcoming();
});
