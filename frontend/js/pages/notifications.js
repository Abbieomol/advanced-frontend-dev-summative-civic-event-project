/**
 * pages/notifications.js
 * Inbox for GET /notifications: the backend returns broadcast notifications
 * (recipient_id = null) plus any sent to this user.
 *  - All / Unread tabs, "Mark all as read"
 *  - Opening one shows the full message and a link to the related event,
 *    announcement or promo (from its metadata), and marks it read.
 *  - Admins can delete (DELETE /notifications/:id).
 *
 * "Read" is stored in the browser (Layout.ReadStore) because the API has no
 * mark-as-read endpoint. Updates are optimistic: the UI changes first.
 */
$(function () {
  // ROLE GUARD (signed-in users)
  if (!Auth.requireLogin()) return;
  Layout.init();

  const $items = $('#notif-items'), $detail = $('#notif-detail');
  const ReadStore = Layout.ReadStore;
  let list = [];
  let filter = 'all';
  let selectedId = UI.param('id');

  const TYPE_STYLE = {
    event: { label: 'Event', cls: 'bg-brand-100 text-brand-900' },
    announcement: { label: 'Announcement', cls: 'bg-sun-200 text-ink' },
    promo: { label: 'Promo', cls: 'bg-ink text-white' }
  };
  function typeBadge(type) {
    const t = TYPE_STYLE[type] || { label: type || 'General', cls: 'bg-slate-100 text-slate-800' };
    return '<span class="rounded px-2 py-0.5 text-xs font-semibold ' + t.cls + '">' + UI.escapeHtml(t.label) + '</span>';
  }

  function load() {
    $items.attr('aria-busy', 'true').html(UI.skeletonRows(4));
    Api.get('/notifications', null, { silent: true })
      .then(function (res) {
        list = res.data || [];
        render();
        if (selectedId) select(selectedId, false);
      })
      .fail(function (err) { UI.errorState($items, err.message, load); })
      .always(function () { $items.attr('aria-busy', 'false'); });
  }

  function render() {
    const unread = list.filter(function (n) { return !ReadStore.isRead(n.id); });
    $('#tab-all .count').text('(' + list.length + ')');
    $('#tab-unread .count').text('(' + unread.length + ')');
    $('[role=tab]').each(function () {
      const on = $(this).data('filter') === filter;
      $(this).attr('aria-selected', String(on)).attr('tabindex', on ? '0' : '-1')
        .toggleClass('border-brand-700 text-brand-800', on).toggleClass('border-transparent text-slate-600', !on);
    });
    $items.attr('aria-labelledby', 'tab-' + filter);
    Layout.updateCount();   // keep the bell count in step

    const shown = filter === 'unread' ? unread : list;
    if (!shown.length) {
      $items.html('<li>' + (filter === 'unread'
        ? UI.emptyState("You're all caught up", 'There are no unread notifications.')
        : UI.emptyState('No notifications yet', 'Updates about events, announcements and promos will appear here.')) + '</li>');
      return;
    }

    $items.html(shown.map(function (n) {
      const isUnread = !ReadStore.isRead(n.id);
      const selected = n.id === selectedId;
      return '<li class="flex items-stretch gap-2">' +
        '<button type="button" class="open-btn flex min-w-0 flex-1 gap-3 rounded-xl border p-4 text-left ' +
          (selected ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50') + '" data-id="' + UI.escapeHtml(n.id) + '"' +
          (selected ? ' aria-current="true"' : '') + '>' +
          '<span class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ' + (isUnread ? 'bg-brand-600' : 'bg-transparent') + '" aria-hidden="true"></span>' +
          '<span class="min-w-0 flex-1">' +
            '<span class="flex flex-wrap items-center gap-2">' + typeBadge(n.type) +
              '<span class="text-xs text-slate-500">' + UI.escapeHtml(UI.timeAgo(n.created_at)) + '</span></span>' +
            '<span class="mt-1 block ' + (isUnread ? 'font-semibold text-slate-900' : 'text-slate-800') + '">' + UI.escapeHtml(n.title) +
              (isUnread ? '<span class="sr-only"> (unread)</span>' : '') + '</span>' +
            '<span class="block truncate text-sm text-slate-600">' + UI.escapeHtml(n.message) + '</span>' +
          '</span>' +
        '</button>' +
        // ROLE GUARD (UI): admin-only delete
        '<button type="button" class="delete-btn btn btn-secondary btn-sm self-center text-red-700" data-role="admin" hidden data-id="' + UI.escapeHtml(n.id) + '" aria-label="Delete notification: ' + UI.escapeHtml(n.title) + '">Delete</button>' +
      '</li>';
    }).join(''));
    Auth.applyRoleVisibility($items);
  }

  function select(id, moveFocus) {
    const n = list.filter(function (x) { return x.id === id; })[0];
    if (!n) {
      $detail.html('<p class="text-slate-600">That notification is no longer available.</p>');
      return;
    }
    selectedId = id;
    ReadStore.markRead(id);   // optimistic: marked read as soon as it's opened
    history.replaceState(null, '', 'notifications.html?id=' + encodeURIComponent(id));

    const link = Layout.notificationLink(n);
    $detail.html(
      '<div class="flex flex-wrap items-center gap-2">' + typeBadge(n.type) +
        '<time class="text-sm text-slate-500" datetime="' + UI.escapeHtml(n.created_at) + '">' + UI.escapeHtml(UI.formatDate(n.created_at)) + '</time></div>' +
      '<h2 id="detail-title" class="mt-3 text-2xl font-bold" tabindex="-1">' + UI.escapeHtml(n.title) + '</h2>' +
      '<p class="mt-3 whitespace-pre-line leading-relaxed text-slate-700">' + UI.escapeHtml(n.message) + '</p>' +
      '<p class="mt-2 text-sm text-slate-500">' + (n.recipient_id ? 'Sent to you' : 'Sent to everyone') + '</p>' +
      '<div class="mt-6 flex flex-wrap gap-3">' +
        (link ? '<a href="' + link.href + '" class="btn btn-primary">' + link.label + ' →</a>' : '') +
        '<button type="button" class="delete-btn btn btn-danger" data-role="admin" hidden data-id="' + UI.escapeHtml(n.id) + '">Delete notification</button>' +
      '</div>'
    );
    Auth.applyRoleVisibility($detail);
    render();
    if (moveFocus) $('#detail-title').trigger('focus');
  }

  // ----- Events -----
  $items.on('click', '.open-btn', function () { select($(this).data('id'), true); });

  $('[role=tab]').on('click', function () { filter = $(this).data('filter'); render(); });
  $('[role=tablist]').on('keydown', '[role=tab]', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const $tabs = $('[role=tab]');
    const i = ($tabs.index(this) + (e.key === 'ArrowRight' ? 1 : -1) + $tabs.length) % $tabs.length;
    $tabs.eq(i).trigger('click').trigger('focus');
  });

  $('#mark-all').on('click', function () {
    list.forEach(function (n) { ReadStore.markRead(n.id); });
    render();
    UI.toast('All notifications marked as read.', 'success');
  });

  // Admin delete: remove from the list straight away (optimistic UI), and put
  // it back if the server refuses.
  $('main').on('click', '.delete-btn', function () {
    const id = $(this).data('id');
    const n = list.filter(function (x) { return x.id === id; })[0];
    if (!n) return;
    UI.confirm({
      title: 'Delete this notification?',
      message: '"' + n.title + '" will be removed for every resident.',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep it',
      danger: true
    }).then(function () {
      const index = list.indexOf(n);
      list.splice(index, 1);
      if (selectedId === id) { selectedId = null; $detail.html('<p class="text-slate-600">Select a notification to read it in full.</p>'); history.replaceState(null, '', 'notifications.html'); }
      render();

      Api.del('/notifications/' + encodeURIComponent(id), { silent: true })
        .then(function () { UI.toast('Notification deleted.', 'success'); Layout.refreshBell(); })
        .fail(function (err) {
          list.splice(index, 0, n);   // revert
          render();
          if (err.status !== 401) UI.toast("Couldn't delete the notification: " + err.message, 'error');
        });
    });
  });

  load();
});
