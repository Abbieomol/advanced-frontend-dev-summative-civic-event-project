/**
 * layout.js
 * Builds the shared header (logo, search, links, notification bell,
 * profile menu) and footer on every signed-in page, so navigation is
 * identical everywhere and only written once.
 *
 * A page opts in with:
 *   <body data-page="events">           (highlights the current link)
 *   <div id="site-header"></div> ... <div id="site-footer"></div>
 */
const Layout = (function () {

  // Links shown in the main navigation. "role" limits who sees each one.
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
        ? 'block rounded-md px-3 py-2 text-base font-medium ' + (current ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-100')
        : 'rounded-md px-3 py-2 text-sm font-medium ' + (current ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-100');
      // ROLE GUARD (UI): admin-only links carry data-role="admin" and are
      // removed for normal users by Auth.applyRoleVisibility().
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
          '<a href="dashboard.html" class="flex items-center gap-2 font-bold text-teal-800">' +
            '<span class="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-white" aria-hidden="true">CE</span>' +
            '<span class="hidden sm:inline">' + CONFIG.APP_NAME + '</span>' +
          '</a>' +

          '<nav aria-label="Main" class="ml-4 hidden items-center gap-1 lg:flex">' + navLinksHtml(currentPage, false) + '</nav>' +

          '<form id="global-search" role="search" class="ml-auto hidden md:block" action="events.html">' +
            '<label for="global-search-input" class="sr-only">Search events</label>' +
            '<input id="global-search-input" name="q" type="search" placeholder="Search events…" class="input w-56 py-1.5 text-sm">' +
          '</form>' +

          '<a href="notifications.html" id="bell" class="relative ml-auto rounded-full p-2 text-slate-700 hover:bg-slate-100 md:ml-0" aria-label="Notifications">' +
            '<svg aria-hidden="true" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0"/></svg>' +
            '<span id="bell-count" class="absolute -right-0.5 -top-0.5 hidden min-w-[1.25rem] rounded-full bg-red-600 px-1 text-center text-xs font-bold text-white"></span>' +
          '</a>' +

          '<div class="relative">' +
            '<button type="button" id="profile-button" class="flex items-center gap-2 rounded-full p-1 hover:bg-slate-100" aria-haspopup="true" aria-expanded="false" aria-controls="profile-menu">' +
              '<span class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white" aria-hidden="true">' + UI.escapeHtml(initials) + '</span>' +
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
      '</header>';
  }

  function footerHtml() {
    const year = new Date().getFullYear();
    return '' +
      '<footer class="mt-16 border-t border-slate-200 bg-slate-900 text-slate-300">' +
        '<div class="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">' +
          '<div>' +
            '<p class="font-bold text-white">' + CONFIG.APP_NAME + '</p>' +
            '<p class="mt-2 text-sm">Your city\'s events, announcements and services in one accessible place.</p>' +
          '</div>' +
          '<div>' +
            '<p class="font-semibold text-white">Help &amp; contact</p>' +
            '<ul class="mt-2 space-y-1 text-sm">' +
              '<li><a class="underline hover:text-white" href="mailto:' + CONFIG.SUPPORT_EMAIL + '">' + CONFIG.SUPPORT_EMAIL + '</a></li>' +
              '<li>City Hall Help Desk: Mon–Fri, 8am–5pm</li>' +
              '<li><a class="underline hover:text-white" href="events.html">Browse events</a></li>' +
            '</ul>' +
          '</div>' +
          '<div>' +
            '<p class="font-semibold text-white">Accessibility</p>' +
            '<p class="mt-2 text-sm">This site supports keyboard navigation, screen readers, captions and transcripts. If something doesn\'t work for you, email us and we\'ll help.</p>' +
          '</div>' +
        '</div>' +
        '<p class="border-t border-slate-800 py-4 text-center text-xs">&copy; ' + year + ' ' + CONFIG.APP_NAME + '. All rights reserved.</p>' +
      '</footer>';
  }

  // ---------- Dropdown and mobile menu behaviour ----------
  function bindMenus() {
    const $btn = $('#profile-button'), $menu = $('#profile-menu');

    function closeProfile() { $menu.addClass('hidden'); $btn.attr('aria-expanded', 'false'); }

    $btn.on('click', function (e) {
      e.stopPropagation();
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

    // Keep the current search term in the box on the events page
    const q = UI.param('q');
    if (q) $('#global-search-input, #mobile-search-input').val(q);
  }

  // ---------- Notification bell ----------
  // The API has no "mark as read" endpoint, so read notification IDs are
  // remembered in localStorage per user. notifications.html uses the same store.
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

  function refreshBell() {
    return Api.get('/notifications', null, { silent: true }).then(function (res) {
      const list = res.data || [];
      const unread = list.filter(function (n) { return !ReadStore.isRead(n.id); }).length;
      const $count = $('#bell-count');
      $count.text(unread > 99 ? '99+' : unread).toggleClass('hidden', unread === 0);
      $('#bell').attr('aria-label', 'Notifications, ' + unread + ' unread');
      return list;
    });
  }

  /**
   * Call once per signed-in page, after Auth.requireLogin().
   */
  function init() {
    const page = $('body').data('page');
    $('#site-header').replaceWith(headerHtml(page));
    $('#site-footer').replaceWith(footerHtml());
    Auth.applyRoleVisibility(document);
    bindMenus();
    refreshBell();
    UI.showFlash();
  }

  return { init: init, refreshBell: refreshBell, ReadStore: ReadStore };
})();
