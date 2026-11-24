// Announcements list. Play buttons use one shared Audio so only one plays at a time.

$(function () {
  // ROLE GUARD: logged-in users only
  if (!Auth.requireLogin()) return;
  Layout.init();

  const $list = $('#list');
  let items = [];
  const player = new Audio();
  let playingId = null;

  function load() {
    $list.attr('aria-busy', 'true').html(UI.skeletonRows(4));
    Api.get('/announcements', { limit: 100 }, { silent: true })
      .then(function (res) {
        // ROLE GUARD: normal users only see published ones
        items = (res.data || []).filter(function (a) { return Auth.isAdmin() || a.published !== false; });
        render();
      })
      .fail(function (err) { $('#results-count').text(''); UI.errorState($list, err.message, load); })
      .always(function () { $list.attr('aria-busy', 'false'); });
  }

  function cardHtml(a) {
    const playing = playingId === a.id;
    return '<article class="flex gap-4 rounded-xl border border-slate-200 bg-white p-4" data-id="' + UI.escapeHtml(a.id) + '">' +
      '<button type="button" class="play-btn flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white hover:bg-brand-800" ' +
        'aria-pressed="' + playing + '" aria-label="' + (playing ? 'Pause ' : 'Play ') + UI.escapeHtml(a.title) + '">' +
        '<span aria-hidden="true" class="text-lg">' + (playing ? '❚❚' : '▶') + '</span></button>' +
      '<div class="min-w-0 flex-1">' +
        '<div class="mb-1" data-role="admin" hidden>' + UI.statusBadge(a.published) + '</div>' +
        '<h2 class="font-semibold leading-snug"><a class="hover:underline" href="announcement.html?id=' + encodeURIComponent(a.id) + '">' + UI.escapeHtml(a.title) + '</a></h2>' +
        '<p class="mt-1 text-sm text-slate-600">' +
          '<span class="duration" data-src="' + UI.escapeHtml(Api.fileUrl(a.audio_url)) + '">Length: <span class="dur-text">–:––</span></span>' +
          ' · <time datetime="' + UI.escapeHtml(a.created_at) + '">' + UI.escapeHtml(UI.formatDate(a.created_at)) + '</time></p>' +
        '<div class="mt-3 flex flex-wrap gap-2">' +
          '<a href="announcement.html?id=' + encodeURIComponent(a.id) + '" class="btn btn-secondary btn-sm" aria-label="Open ' + UI.escapeHtml(a.title) + '">Open</a>' +
          // ROLE GUARD: admin-only buttons
          '<button type="button" class="publish-btn btn btn-secondary btn-sm" data-role="admin" hidden>' + (a.published === false ? 'Publish' : 'Unpublish') + '</button>' +
          '<a href="announcement-form.html?id=' + encodeURIComponent(a.id) + '" class="btn btn-secondary btn-sm" data-role="admin" hidden>Edit</a>' +
          '<button type="button" class="delete-btn btn btn-danger btn-sm" data-role="admin" hidden>Delete</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function render() {
    $('#results-count').text(items.length ? items.length + ' announcement' + (items.length === 1 ? '' : 's') + '.' : '');
    if (!items.length) {
      $list.html(UI.emptyState('No announcements yet', 'New announcements will appear here and in your notifications.'));
      return;
    }
    $list.html(items.map(cardHtml).join(''));
    Auth.applyRoleVisibility($list);
    loadDurations();
  }

  const durationCache = {};
  // the API doesn't store the length, so read it from each file
  function loadDurations() {
    $list.find('.duration').each(function () {
      const $d = $(this), src = $d.data('src');
      if (durationCache[src] !== undefined) { setDuration($d, durationCache[src]); return; }
      const probe = new Audio();
      probe.preload = 'metadata';
      probe.addEventListener('loadedmetadata', function () { durationCache[src] = probe.duration; setDuration($d, probe.duration); });
      probe.addEventListener('error', function () { $d.find('.dur-text').text('unavailable'); });
      probe.src = src;
    });
  }
  function setDuration($d, seconds) {
    $d.find('.dur-text').text(UI.formatDuration(seconds)).attr('aria-label', UI.durationWords(seconds));
  }

  function itemFor(el) {
    const id = $(el).closest('article').data('id');
    return items.filter(function (a) { return a.id === id; })[0];
  }

  $list.on('click', '.play-btn', function () {
    const a = itemFor(this);
    if (playingId === a.id) { player.pause(); return; }
    switching = true;
    player.src = Api.fileUrl(a.audio_url);
    player.play()
      .then(function () { switching = false; })
      .catch(function () {
        switching = false;
        UI.toast("This audio can't be played in your browser. Open the announcement to download it.", 'error');
        playingId = null; render();
      });
    playingId = a.id;
    render();
    $list.find('[data-id="' + a.id + '"] .play-btn').trigger('focus');
  });
  // changing the src fires a "pause" event, ignore that one
  let switching = false;
  function stopped() {
    if (switching) return;
    const id = playingId; playingId = null; render();
    if (id) $list.find('[data-id="' + id + '"] .play-btn').trigger('focus');
  }
  player.addEventListener('pause', stopped);
  player.addEventListener('ended', stopped);

  $list.on('click', '.publish-btn', function () {
    const a = itemFor(this);
    ContentAdmin.setPublished('announcements', 'announcement', a, a.published === false, $(this))
      .then(function (updated) { $.extend(a, updated); render(); Layout.refreshBell(); });
  });
  $list.on('click', '.delete-btn', function () {
    const a = itemFor(this);
    ContentAdmin.remove('announcements', 'announcement', a, $(this)).then(function () {
      if (playingId === a.id) player.pause();
      items = items.filter(function (x) { return x.id !== a.id; });
      render();
    });
  });

  load();
});
