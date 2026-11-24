/**
 * pages/promos.js
 * Promos list (GET /promos). Each card shows a thumbnail (the video's first
 * frame, loaded only when the card scrolls into view), title, description
 * and a Play button that opens the promo page.
 * Normal users see published promos only; admins see all, with controls.
 */
$(function () {
  // ROLE GUARD (signed-in users)
  if (!Auth.requireLogin()) return;
  Layout.init();

  const $list = $('#list');
  let items = [];

  function load(force) {
    // Use the cached list if it's fresh (cleared after any admin change)
    const cached = force ? null : PromoCache.get();
    if (cached) { show(cached); return; }

    $list.attr('aria-busy', 'true').html(UI.skeletonCards(3));
    Api.get('/promos', { limit: 100 }, { silent: true })
      .then(function (res) { PromoCache.set(res.data || []); show(res.data || []); })
      .fail(function (err) { $('#results-count').text(''); UI.errorState($list, err.message, function () { load(true); }); })
      .always(function () { $list.attr('aria-busy', 'false'); });
  }

  function show(data) {
    // ROLE GUARD (UI): normal users only ever see published promos.
    items = data.filter(function (p) { return Auth.isAdmin() || p.published !== false; });
    render();
  }

  function cardHtml(p) {
    const title = UI.escapeHtml(p.title);
    return '<article class="card-hover flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white" data-id="' + UI.escapeHtml(p.id) + '">' +
      '<a href="promo.html?id=' + encodeURIComponent(p.id) + '" class="group relative block bg-slate-900" aria-label="Play ' + title + '">' +
        // Thumbnail: a muted, silent <video> showing the first frame. Its src
        // is only set when the card becomes visible (lazy loading).
        '<video class="thumb h-44 w-full object-cover opacity-95" muted playsinline preload="none" aria-hidden="true" tabindex="-1" data-src="' + UI.escapeHtml(Api.fileUrl(p.video_url)) + '#t=0.5"></video>' +
        '<span class="absolute inset-0 flex items-center justify-center" aria-hidden="true">' +
          '<span class="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-xl text-brand-800 shadow transition group-hover:scale-110">▶</span></span>' +
        '<span class="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold text-white" aria-hidden="true">CC</span>' +
      '</a>' +
      '<div class="flex flex-1 flex-col gap-2 p-4">' +
        '<div data-role="admin" hidden>' + UI.statusBadge(p.published) + '</div>' +
        '<h2 class="text-lg font-semibold leading-snug"><a class="hover:underline" href="promo.html?id=' + encodeURIComponent(p.id) + '">' + title + '</a></h2>' +
        '<p class="text-sm text-slate-600">' + UI.escapeHtml(UI.truncate(p.description, 120)) + '</p>' +
        '<div class="mt-auto flex flex-wrap gap-2 pt-3">' +
          '<a href="promo.html?id=' + encodeURIComponent(p.id) + '" class="btn btn-primary btn-sm" aria-label="Play ' + title + '">▶ Play</a>' +
          // ROLE GUARD (UI): admin-only controls
          '<button type="button" class="publish-btn btn btn-secondary btn-sm" data-role="admin" hidden>' + (p.published === false ? 'Publish' : 'Unpublish') + '</button>' +
          '<a href="promo-form.html?id=' + encodeURIComponent(p.id) + '" class="btn btn-secondary btn-sm" data-role="admin" hidden>Edit</a>' +
          '<button type="button" class="delete-btn btn btn-danger btn-sm" data-role="admin" hidden>Delete</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function render() {
    $('#results-count').text(items.length ? items.length + ' promo' + (items.length === 1 ? '' : 's') + '.' : '');
    if (!items.length) {
      $list.html(UI.emptyState('No promos yet', 'New videos will appear here and in your notifications.'));
      return;
    }
    $list.html(items.map(cardHtml).join(''));
    Auth.applyRoleVisibility($list);
    lazyThumbs();
  }

  // Lazy-load thumbnails: heavy media is only fetched when visible.
  function lazyThumbs() {
    const videos = $list.find('video.thumb').toArray();
    function loadThumb(v) { v.preload = 'metadata'; v.src = v.dataset.src; }
    if (!('IntersectionObserver' in window)) { videos.forEach(loadThumb); return; }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { loadThumb(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '200px' });
    videos.forEach(function (v) { io.observe(v); });
  }

  function itemFor(el) {
    const id = $(el).closest('article').data('id');
    return items.filter(function (p) { return p.id === id; })[0];
  }

  // ----- Admin actions -----
  $list.on('click', '.publish-btn', function () {
    const p = itemFor(this);
    ContentAdmin.setPublished('promos', 'promo', p, p.published === false, $(this))
      .then(function (updated) { $.extend(p, updated); render(); Layout.refreshBell(); });
  });
  $list.on('click', '.delete-btn', function () {
    const p = itemFor(this);
    ContentAdmin.remove('promos', 'promo', p, $(this)).then(function () {
      items = items.filter(function (x) { return x.id !== p.id; });
      render();
    });
  });

  load(false);
});
