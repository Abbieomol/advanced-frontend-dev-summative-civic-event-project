/**
 * pages/my-registrations.js
 * Lists the signed-in user's registrations (GET /event-registrations/my-registrations),
 * split into Upcoming, Past and Cancelled tabs, with a Cancel option.
 */
$(function () {
  // ROLE GUARD (signed-in users)
  if (!Auth.requireLogin()) return;
  // ROLE GUARD (normal users only): admins don't register for events, so
  // they are sent to the events list instead.
  if (Auth.isAdmin()) { window.location.replace('events.html'); return; }
  Layout.init();

  const $list = $('#reg-list');
  let registrations = [];
  let activeTab = 'upcoming';

  function groupOf(r) {
    if (r.status === 'cancelled') return 'cancelled';
    const end = r.ends_at || r.starts_at;
    return end && new Date(end) < new Date() ? 'past' : 'upcoming';
  }

  function load() {
    $list.attr('aria-busy', 'true').html(UI.skeletonRows(3));
    Registrations.load()
      .then(function (data) {
        registrations = data.sort(function (a, b) { return new Date(a.starts_at) - new Date(b.starts_at); });
        render();
      })
      .fail(function (err) { UI.errorState($list, err.message, load); })
      .always(function () { $list.attr('aria-busy', 'false'); });
  }

  function rowHtml(r) {
    const group = groupOf(r);
    const badge = {
      upcoming: '<span class="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">Registered</span>',
      past: '<span class="rounded bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">Attended / ended</span>',
      cancelled: '<span class="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">Cancelled</span>'
    }[group];

    return '<article class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">' +
      '<div class="flex-1">' +
        badge +
        '<h2 class="mt-1 font-semibold"><a class="hover:underline" href="event.html?id=' + encodeURIComponent(r.event_id) + '">' + UI.escapeHtml(r.title) + '</a></h2>' +
        '<p class="text-sm text-slate-700"><time datetime="' + UI.escapeHtml(r.starts_at) + '">' + UI.escapeHtml(UI.formatDateRange(r.starts_at, r.ends_at)) + '</time> · ' + UI.escapeHtml(r.location || 'Location to be confirmed') + '</p>' +
      '</div>' +
      '<div class="flex gap-2">' +
        '<a href="event.html?id=' + encodeURIComponent(r.event_id) + '" class="btn btn-secondary btn-sm">View event</a>' +
        (group === 'upcoming' ? '<button type="button" class="cancel-btn btn btn-secondary btn-sm text-red-700" data-id="' + UI.escapeHtml(r.event_id) + '" data-title="' + UI.escapeHtml(r.title) + '">Cancel</button>' : '') +
      '</div>' +
    '</article>';
  }

  function render() {
    // Update tab counts and selected state
    ['upcoming', 'past', 'cancelled'].forEach(function (tab) {
      const n = registrations.filter(function (r) { return groupOf(r) === tab; }).length;
      const $tab = $('[data-tab="' + tab + '"]');
      $tab.find('.count').text('(' + n + ')');
      const selected = tab === activeTab;
      $tab.attr('aria-selected', String(selected)).attr('tabindex', selected ? '0' : '-1')
        .toggleClass('border-brand-700 text-brand-800', selected)
        .toggleClass('border-transparent text-slate-600', !selected);
    });
    $list.attr('aria-labelledby', 'tab-' + activeTab);

    const rows = registrations.filter(function (r) { return groupOf(r) === activeTab; });
    if (!rows.length) {
      const empty = {
        upcoming: ['No upcoming registrations', 'Browse events and save your place.', 'events.html', 'Browse events'],
        past: ['No past events yet', 'Events you attended will appear here.'],
        cancelled: ['Nothing cancelled', 'Registrations you cancel will appear here.']
      }[activeTab];
      $list.html(UI.emptyState.apply(null, empty));
    } else {
      $list.html(rows.map(rowHtml).join(''));
    }
  }

  // Tabs: click, or arrow keys to move between them (WAI-ARIA tabs pattern)
  $('[role=tab]').on('click', function () { activeTab = $(this).data('tab'); render(); });
  $('[role=tablist]').on('keydown', '[role=tab]', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const $tabs = $('[role=tab]');
    let i = $tabs.index(this) + (e.key === 'ArrowRight' ? 1 : -1);
    i = (i + $tabs.length) % $tabs.length;
    $tabs.eq(i).trigger('click').trigger('focus');
  });

  $list.on('click', '.cancel-btn', function () {
    const $btn = $(this);
    const id = $btn.data('id');
    UI.confirm({
      title: 'Cancel your registration?',
      message: 'You\'ll lose your place at "' + $btn.data('title') + '". This system does not let you register again for the same event afterwards.',
      confirmLabel: 'Yes, cancel it',
      cancelLabel: 'Keep my place',
      danger: true
    }).then(function () {
      UI.setLoading($btn, true, 'Cancelling…');
      Registrations.cancel(id)
        .then(function () {
          UI.toast('Registration cancelled.', 'info');
          registrations.forEach(function (r) { if (r.event_id === id) r.status = 'cancelled'; });
          render();
        })
        .fail(function () { UI.setLoading($btn, false); });
    });
  });

  load();
});
