// Builds the header, footer, notification drawer and admin sidebar on every page

const Layout = (function () {

  const NAV_LINKS = [
    { page: 'dashboard', href: 'dashboard.html', label: 'Home' },
    { page: 'events', href: 'events.html', label: 'Events' },
    { page: 'announcements', href: 'announcements.html', label: 'Announcements' },
    { page: 'promos', href: 'promos.html', label: 'Promos' },
    { page: 'admin-dashboard', href: 'admin-dashboard.html', label: 'Dashboard', role: 'admin' },
    { page: 'admin-users', href: 'admin-users.html', label: 'Admin', role: 'admin' }
  ];

  function navLinksHtml(currentPage, mobile) {
    return NAV_LINKS.map(function (link) {
      const current = link.page === currentPage;
      const cls = mobile
        ? 'block rounded-md px-3 py-2 text-base font-medium ' + (current ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-100')
        : 'rounded-md px-3 py-2 text-sm font-medium ' + (current ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-100');
      // ROLE GUARD: admin links get data-role="admin" so normal users never see them
      return '<a href="' + link.href + '" class="' + cls + '"' +
        (current ? ' aria-current="page"' : '') +
        (link.role ? ' data-role="' + link.role + '"' : '') + '>' + link.label + '</a>';
    }).join('');
  }

  function headerHtml(currentPage) {
    const user = Auth.user() || { full_name: '', email: '', role: '' };
    const initials = (user.full_name || '?').split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('').toUpperCase();

    return '' +
      '<a href="#main" class="skip-link">Skip to main content</a>' +
      '<header class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">' +
        '<div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">' +
          '<a href="dashboard.html" class="flex items-center gap-2 font-bold text-brand-800">' +
            '<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-ink font-bold text-sun-400" aria-hidden="true">CE</span>' +
            '<span class="hidden sm:inline">' + CONFIG.APP_NAME + '</span>' +
          '</a>' +

          '<nav aria-label="Main" class="ml-4 hidden items-center gap-1 lg:flex">' + navLinksHtml(currentPage, false) + '</nav>' +

          '<form id="global-search" role="search" class="ml-auto hidden md:block" action="events.html">' +
            '<label for="global-search-input" class="sr-only">Search events</label>' +
            '<input id="global-search-input" name="q" type="search" placeholder="Search events…" class="input w-56 py-1.5 text-sm">' +
          '</form>' +

          '<div class="relative ml-auto md:ml-0">' +
            '<button type="button" id="bell" class="relative rounded-full p-2 text-slate-700 hover:bg-slate-100" aria-label="Notifications" aria-haspopup="true" aria-expanded="false" aria-controls="notif-panel">' +
              '<svg aria-hidden="true" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0"/></svg>' +
              '<span id="bell-count" class="absolute -right-0.5 -top-0.5 hidden min-w-[1.25rem] rounded-full bg-sun-400 px-1 text-center text-xs font-bold text-ink ring-2 ring-white"></span>' +
            '</button>' +
            '<div id="notif-panel" class="fixed inset-x-2 top-16 hidden max-h-[75vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96" role="region" aria-label="Recent notifications">' +
              '<div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">' +
                '<p class="font-semibold">Notifications</p>' +
                '<button type="button" id="notif-mark-all" class="text-sm font-semibold text-brand-800 underline">Mark all as read</button>' +
              '</div>' +
              '<ul id="notif-list" class="max-h-[55vh] divide-y divide-slate-100 overflow-y-auto"></ul>' +
              '<a href="notifications.html" class="block border-t border-slate-100 px-4 py-3 text-center text-sm font-semibold text-brand-800 hover:bg-slate-50">View all notifications</a>' +
            '</div>' +
          '</div>' +

          '<div class="relative">' +
            '<button type="button" id="profile-button" class="flex items-center gap-2 rounded-full p-1 hover:bg-slate-100" aria-haspopup="true" aria-expanded="false" aria-controls="profile-menu">' +
              '<span class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white" aria-hidden="true">' + UI.escapeHtml(initials) + '</span>' +
              '<span class="sr-only">Open profile menu for ' + UI.escapeHtml(user.full_name) + '</span>' +
            '</button>' +
            '<div id="profile-menu" class="absolute right-0 mt-2 hidden w-60 rounded-xl border border-slate-200 bg-white py-2 shadow-lg">' +
              '<div class="border-b border-slate-100 px-4 pb-2">' +
                '<p class="truncate font-semibold text-slate-900">' + UI.escapeHtml(user.full_name) + '</p>' +
                '<p class="truncate text-sm text-slate-600">' + UI.escapeHtml(user.email) + '</p>' +
                '<p class="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase text-slate-700">' + UI.escapeHtml(user.role) + '</p>' +
              '</div>' +
              '<a href="profile.html" class="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">My profile</a>' +
              '<a href="my-registrations.html" class="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100" data-role="user">My registrations</a>' +
              '<button type="button" id="logout-button" class="block w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50">Sign out</button>' +
            '</div>' +
          '</div>' +

          '<button type="button" id="mobile-menu-button" class="rounded-md p-2 text-slate-700 hover:bg-slate-100 lg:hidden" aria-expanded="false" aria-controls="mobile-menu">' +
            '<span class="sr-only">Open main menu</span>' +
            '<svg aria-hidden="true" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16"/></svg>' +
          '</button>' +
        '</div>' +

        '<nav id="mobile-menu" aria-label="Main mobile" class="hidden border-t border-slate-200 px-4 py-3 lg:hidden">' +
          '<form role="search" action="events.html" class="mb-3 md:hidden">' +
            '<label for="mobile-search-input" class="sr-only">Search events</label>' +
            '<input id="mobile-search-input" name="q" type="search" placeholder="Search events…" class="input">' +
          '</form>' +
          navLinksHtml(currentPage, true) +
        '</nav>' +
        '<div class="nairobi-stripe" aria-hidden="true"></div>' +
      '</header>';
  }

  function footerHtml() {
    const year = new Date().getFullYear();
    return '' +
      '<footer class="mt-16 bg-ink text-neutral-300">' +
        '<div class="nairobi-stripe" aria-hidden="true"></div>' +
        '<div class="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">' +
          '<div>' +
            '<p class="font-bold text-sun-400">' + CONFIG.APP_NAME + '</p>' +
            '<p class="mt-2 text-sm">Your city\'s events, announcements and services in one accessible place.</p>' +
          '</div>' +
          '<div>' +
            '<p class="font-semibold text-sun-400">Help &amp; contact</p>' +
            '<ul class="mt-2 space-y-1 text-sm">' +
              '<li><a class="underline hover:text-white" href="mailto:' + CONFIG.SUPPORT_EMAIL + '">' + CONFIG.SUPPORT_EMAIL + '</a></li>' +
              '<li>City Hall Help Desk: Mon–Fri, 8am–5pm</li>' +
              '<li><a class="underline hover:text-white" href="events.html">Browse events</a></li>' +
            '</ul>' +
          '</div>' +
          '<div>' +
            '<p class="font-semibold text-sun-400">Accessibility</p>' +
            '<p class="mt-2 text-sm">This site supports keyboard navigation, screen readers, captions and transcripts. If something doesn\'t work for you, email us and we\'ll help.</p>' +
          '</div>' +
        '</div>' +
        '<p class="border-t border-neutral-800 py-4 text-center text-xs">&copy; ' + year + ' ' + CONFIG.APP_NAME + '. All rights reserved.</p>' +
      '</footer>';
  }

  function bindMenus() {
    const $btn = $('#profile-button'), $menu = $('#profile-menu');

    function closeProfile() { $menu.addClass('hidden'); $btn.attr('aria-expanded', 'false'); }

    $btn.on('click', function (e) {
      e.stopPropagation();
      $('#notif-panel').addClass('hidden'); $('#bell').attr('aria-expanded', 'false');
      const open = $menu.hasClass('hidden');
      $menu.toggleClass('hidden', !open);
      $btn.attr('aria-expanded', String(open));
      if (open) $menu.find('a, button').first().focus();
    });
    $(document).on('click', function (e) {
      if (!$(e.target).closest('#profile-menu').length) closeProfile();
    });
    $(document).on('keydown', function (e) {
      if (e.key === 'Escape' && !$menu.hasClass('hidden')) { closeProfile(); $btn.focus(); }
    });

    $('#mobile-menu-button').on('click', function () {
      const open = $('#mobile-menu').hasClass('hidden');
      $('#mobile-menu').toggleClass('hidden', !open);
      $(this).attr('aria-expanded', String(open));
    });

    $('#logout-button').on('click', function () { Auth.logout('logout'); });

    const q = UI.param('q');
    if (q) $('#global-search-input, #mobile-search-input').val(q);
  }

  // There's no "mark as read" endpoint, so read notifications are saved in localStorage
  const ReadStore = {
    key: function () { return 'ce_read_notifications_' + ((Auth.user() || {}).id || 'anon'); },
    ids: function () {
      try { return JSON.parse(localStorage.getItem(this.key())) || []; } catch (e) { return []; }
    },
    markRead: function (id) {
      const ids = this.ids();
      if (ids.indexOf(id) === -1) { ids.push(id); localStorage.setItem(this.key(), JSON.stringify(ids)); }
    },
    isRead: function (id) { return this.ids().indexOf(id) !== -1; }
  };

  let notifications = [];

  // Link a notification to its event / announcement / promo using its metadata
  function notificationLink(n) {
    const m = n.metadata || {};
    if (m.event_id) return { href: 'event.html?id=' + encodeURIComponent(m.event_id), label: 'View event' };
    if (m.announcement_id) return { href: 'announcement.html?id=' + encodeURIComponent(m.announcement_id), label: 'Listen to announcement' };
    if (m.promo_id) return { href: 'promo.html?id=' + encodeURIComponent(m.promo_id), label: 'Watch promo' };
    return null;
  }

  function updateCount() {
    const unread = notifications.filter(function (n) { return !ReadStore.isRead(n.id); }).length;
    $('#bell-count').text(unread > 99 ? '99+' : unread).toggleClass('hidden', unread === 0);
    $('#bell').attr('aria-label', 'Notifications, ' + unread + ' unread');
    return unread;
  }

  function renderPanel() {
    const $list = $('#notif-list');
    if (!notifications.length) {
      $list.html('<li class="px-4 py-6 text-center text-sm text-slate-600">You\'re all caught up. No notifications yet.</li>');
      return;
    }
    $list.html(notifications.slice(0, 6).map(function (n) {
      const unread = !ReadStore.isRead(n.id);
      return '<li><a href="notifications.html?id=' + encodeURIComponent(n.id) + '" class="notif-item flex gap-3 px-4 py-3 hover:bg-slate-50" data-id="' + UI.escapeHtml(n.id) + '">' +
        '<span class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ' + (unread ? 'bg-brand-600' : 'bg-transparent') + '" aria-hidden="true"></span>' +
        '<span class="min-w-0 flex-1">' +
          '<span class="block text-sm ' + (unread ? 'font-semibold text-slate-900' : 'text-slate-700') + '">' + UI.escapeHtml(n.title) + (unread ? '<span class="sr-only"> (unread)</span>' : '') + '</span>' +
          '<span class="block truncate text-sm text-slate-600">' + UI.escapeHtml(n.message) + '</span>' +
          '<span class="block text-xs text-slate-500">' + UI.escapeHtml(UI.timeAgo(n.created_at)) + '</span>' +
        '</span></a></li>';
    }).join(''));
  }

  function refreshBell() {
    return Api.get('/notifications', null, { silent: true }).then(function (res) {
      notifications = res.data || [];
      updateCount();
      renderPanel();
      return notifications;
    });
  }

  function bindBell() {
    const $bell = $('#bell'), $panel = $('#notif-panel');
    function close() { $panel.addClass('hidden'); $bell.attr('aria-expanded', 'false'); }
    $bell.on('click', function (e) {
      e.stopPropagation();
      $('#profile-menu').addClass('hidden'); $('#profile-button').attr('aria-expanded', 'false');
      const open = $panel.hasClass('hidden');
      $panel.toggleClass('hidden', !open);
      $bell.attr('aria-expanded', String(open));
      if (open) { refreshBell(); $panel.find('a, button').first().trigger('focus'); }
    });
    $(document).on('click', function (e) { if (!$(e.target).closest('#notif-panel').length) close(); });
    $(document).on('keydown', function (e) {
      if (e.key === 'Escape' && !$panel.hasClass('hidden')) { close(); $bell.trigger('focus'); }
    });
    // opening one marks it read straight away
    $panel.on('click', '.notif-item', function () { ReadStore.markRead($(this).data('id')); });
    $('#notif-mark-all').on('click', function () {
      notifications.forEach(function (n) { ReadStore.markRead(n.id); });
      updateCount(); renderPanel();
      UI.toast('All notifications marked as read.', 'success');
    });
  }

  const ADMIN_LINKS = [
    { page: 'admin-dashboard', href: 'admin-dashboard.html', label: 'Overview' },
    { page: 'admin-users', href: 'admin-users.html', label: 'Users' },
    { page: 'event-form', href: 'event-form.html', label: '+ New event' },
    { page: 'announcement-form', href: 'announcement-form.html', label: '+ New announcement' },
    { page: 'promo-form', href: 'promo-form.html', label: '+ New promo' },
    { page: 'notifications', href: 'notifications.html', label: 'Manage notifications' }
  ];

  // ROLE GUARD: the admin sidebar is only rendered on admin pages, and it's data-role="admin" too
  function renderAdminNav() {
    const $slot = $('#admin-nav');
    if (!$slot.length) return;
    const page = $('body').data('page');
    $slot.replaceWith(
      '<nav aria-label="Admin" data-role="admin" class="mb-6 lg:mb-0">' +
        '<p class="mb-2 hidden text-xs font-semibold uppercase tracking-wide text-slate-500 lg:block">Admin</p>' +
        '<ul class="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1 lg:pb-0">' +
        ADMIN_LINKS.map(function (l) {
          const cur = l.page === page;
          return '<li class="shrink-0"><a href="' + l.href + '"' + (cur ? ' aria-current="page"' : '') +
            ' class="block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ' +
            (cur ? 'bg-brand-700 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 lg:bg-transparent lg:ring-0') + '">' + l.label + '</a></li>';
        }).join('') +
        '</ul></nav>'
    );
  }

  // Call this on every logged-in page (after requireLogin)
  function init() {
    const page = $('body').data('page');
    $('#site-header').replaceWith(headerHtml(page));
    $('#site-footer').replaceWith(footerHtml());
    renderAdminNav();
    Auth.applyRoleVisibility(document);
    bindMenus();
    bindBell();
    refreshBell();
    UI.showFlash();
  }

  return { init: init, refreshBell: refreshBell, updateCount: updateCount, notificationLink: notificationLink, ReadStore: ReadStore };
})();
