/**
 * pages/admin-dashboard.js
 * Admin overview from GET /dashboard/admin: stat tiles plus two bar charts
 * (built with plain HTML/CSS, since only HTML, Tailwind and jQuery are allowed).
 * Each chart has hover/focus tooltips and a "Show as table" view.
 * Data refreshes every 60 seconds and with the Refresh button.
 */
$(function () {
  // ROLE GUARD (admins only): normal users are redirected; the API also
  // answers 403 to non-admins for /dashboard/admin.
  if (!Auth.requireAdmin()) return;
  Layout.init();

  const REFRESH_MS = 60000;
  const n = function (v) { return Number(v || 0); }; // Postgres COUNT() arrives as a string

  function load(manual) {
    const $tiles = $('#tiles');
    if (!$tiles.children().length) $tiles.html(UI.skeletonRows(4));
    const $btn = $('#refresh');
    if (manual) UI.setLoading($btn, true, 'Refreshing…');

    $.when(Api.get('/dashboard/admin', null, { silent: true }), Layout.refreshBell())
      .then(function (res, notifications) {
        const d = res.data || {};
        const unread = (notifications || []).filter(function (x) { return !Layout.ReadStore.isRead(x.id); }).length;
        renderTiles(d, unread);
        renderActivity(d);
        renderGrowth(d.user_growth || []);
        $('#updated').text('Updated ' + new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) + '.');
        if (manual) UI.toast('Dashboard refreshed.', 'success');
      })
      .fail(function (err) { UI.errorState($tiles, err.message, function () { load(true); }); })
      .always(function () { $tiles.attr('aria-busy', 'false'); if (manual) UI.setLoading($btn, false); });
  }

  // ---------- Stat tiles ----------
  function tile(label, value, sub, href) {
    return '<a href="' + href + '" class="card-hover block rounded-xl border border-slate-200 bg-white p-5">' +
      '<p class="text-sm font-medium text-slate-600">' + label + '</p>' +
      '<p class="mt-1 text-3xl font-bold tabular-nums text-slate-900">' + value.toLocaleString() + '</p>' +
      (sub ? '<p class="mt-1 text-xs text-slate-500">' + sub + '</p>' : '') + '</a>';
  }

  function renderTiles(d, unread) {
    const ev = d.events || {}, us = d.users || {};
    $('#tiles').html([
      tile('Total events', n(ev.total_events), n(ev.upcoming_events) + ' upcoming · ' + n(ev.past_events) + ' past', 'events.html'),
      tile('Users', n(us.total_users), n(us.active_users) + ' active · ' + n(us.inactive_users) + ' disabled', 'admin-users.html'),
      tile('Registrations', n((d.registrations || {}).total_registrations), 'Including cancelled', 'events.html'),
      tile('Feedback', n((d.feedbacks || {}).total_feedback), 'Reviews across all events', 'events.html'),
      tile('Promos', n((d.promos || {}).total_promos), '', 'promos.html'),
      tile('Announcements', n((d.announcements || {}).total_announcements), '', 'announcements.html'),
      tile('Notifications', n((d.notifications || {}).total_notifications), 'Sent in total', 'notifications.html'),
      tile('Unread notifications', unread, 'Unread by you', 'notifications.html')
    ].join(''));
  }

  // ---------- Bar charts ----------
  // Single series, one hue (teal), so no legend is needed: the title names it.
  // Bars have 4px rounded ends at the data end, a recessive grid, and a
  // tooltip on hover AND keyboard focus.
  // Round the axis top up to 2, 4, 6, 8 or 10 × a power of ten, so the
  // halfway gridline is always a whole number.
  function niceMax(max) {
    if (max <= 2) return 2;
    const pow = Math.pow(10, Math.floor(Math.log10(max)));
    const steps = [2, 4, 6, 8, 10];
    for (let i = 0; i < steps.length; i++) if (steps[i] * pow >= max) return steps[i] * pow;
    return 10 * pow;
  }

  function horizontalBars(rows) {
    const max = niceMax(Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1])));
    return '<ul class="space-y-3" role="list">' + rows.map(function (r) {
      const pct = (r.value / max) * 100;
      return '<li class="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3 text-sm">' +
        '<span class="text-slate-700">' + r.label + '</span>' +
        '<span class="relative h-6 rounded-sm bg-slate-50">' +
          '<span class="bar-hit absolute inset-y-0 left-0 block cursor-default rounded-r bg-teal-600 transition-[width] duration-500" style="width:' + Math.max(pct, r.value ? 1 : 0) + '%" ' +
            'tabindex="0" data-tip="' + r.label + ': ' + r.value.toLocaleString() + '" aria-label="' + r.label + ': ' + r.value + '"></span>' +
        '</span>' +
        '<span class="text-right font-semibold tabular-nums text-slate-900">' + r.value.toLocaleString() + '</span>' +
      '</li>';
    }).join('') + '</ul>';
  }

  function verticalBars(rows) {
    if (!rows.length) return '<p class="py-10 text-center text-slate-600">No sign-ups in the last 6 months.</p>';
    const max = niceMax(Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1])));
    const ticks = [max, max / 2, 0];
    return '<div class="grid grid-cols-[2rem_1fr] gap-2">' +
      '<div class="flex h-48 flex-col justify-between text-right text-xs text-slate-500" aria-hidden="true">' +
        ticks.map(function (t) { return '<span>' + Math.round(t) + '</span>'; }).join('') + '</div>' +
      '<div class="relative h-48 border-b border-slate-300">' +
        '<div class="absolute inset-x-0 top-0 border-t border-dashed border-slate-200"></div>' +
        '<div class="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200"></div>' +
        '<div class="absolute inset-0 flex items-end justify-around gap-[2px] px-2">' +
          rows.map(function (r) {
            const pct = (r.value / max) * 100;
            return '<span class="bar-hit flex h-full w-full max-w-[3rem] cursor-default items-end" tabindex="0" data-tip="' + r.label + ': ' + r.value + ' new user' + (r.value === 1 ? '' : 's') + '" ' +
              'aria-label="' + r.label + ': ' + r.value + ' new users">' +
              '<span class="block w-full rounded-t bg-teal-600 transition-[height] duration-500" style="height:' + pct + '%"></span></span>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<span></span>' +
      '<div class="flex justify-around px-2 text-xs text-slate-600" aria-hidden="true">' + rows.map(function (r) { return '<span class="w-full max-w-[3rem] text-center">' + r.short + '</span>'; }).join('') + '</div>' +
    '</div>';
  }

  function tableHtml(caption, head, rows) {
    return '<table class="w-full text-left text-sm"><caption class="sr-only">' + caption + '</caption>' +
      '<thead><tr class="border-b border-slate-200 text-slate-600"><th scope="col" class="py-1">' + head[0] + '</th><th scope="col" class="py-1 text-right">' + head[1] + '</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr class="border-b border-slate-100"><th scope="row" class="py-1 font-normal">' + r.label + '</th><td class="py-1 text-right tabular-nums">' + r.value + '</td></tr>'; }).join('') +
      '</tbody></table>';
  }

  function renderActivity(d) {
    const rows = [
      { label: 'Events', value: n((d.events || {}).total_events) },
      { label: 'Registrations', value: n((d.registrations || {}).total_registrations) },
      { label: 'Feedback', value: n((d.feedbacks || {}).total_feedback) },
      { label: 'Announcements', value: n((d.announcements || {}).total_announcements) },
      { label: 'Promos', value: n((d.promos || {}).total_promos) },
      { label: 'Notifications', value: n((d.notifications || {}).total_notifications) }
    ];
    $('#activity-chart').html(horizontalBars(rows));
    $('#activity-table').html(tableHtml('Platform activity totals', ['Type', 'Total'], rows));
  }

  function renderGrowth(growth) {
    const rows = growth.map(function (g) {
      const date = new Date(g.month + '-01T00:00:00');
      return {
        label: date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        short: date.toLocaleDateString(undefined, { month: 'short' }),
        value: n(g.new_users)
      };
    });
    $('#growth-chart').html(verticalBars(rows));
    $('#growth-table').html(rows.length ? tableHtml('New users per month', ['Month', 'New users'], rows) : '');
  }

  // ---------- Tooltip (mouse hover and keyboard focus) ----------
  const $tip = $('#chart-tip');
  $('main').on('mouseenter focus', '.bar-hit', function (e) {
    const r = this.getBoundingClientRect();
    $tip.text($(this).data('tip')).removeClass('hidden');
    const left = e.type === 'mouseenter' && e.clientX ? e.clientX : r.left + r.width / 2;
    $tip.css({ left: Math.min(left + 12, window.innerWidth - $tip.outerWidth() - 8), top: r.top - $tip.outerHeight() - 6 });
  });
  $('main').on('mousemove', '.bar-hit', function (e) {
    $tip.css({ left: Math.min(e.clientX + 12, window.innerWidth - $tip.outerWidth() - 8) });
  });
  $('main').on('mouseleave blur', '.bar-hit', function () { $tip.addClass('hidden'); });

  // Chart <-> table toggle
  $('.table-toggle').on('click', function () {
    const $t = $('#' + $(this).attr('aria-controls'));
    const show = $t.hasClass('hidden');
    $t.toggleClass('hidden', !show);
    $t.prev().toggleClass('hidden', show);
    $(this).attr('aria-expanded', String(show)).text(show ? 'Show as chart' : 'Show as table');
  });

  $('#refresh').on('click', function () { load(true); });
  setInterval(function () { if (!document.hidden) load(false); }, REFRESH_MS);
  load(false);
});
