/**
 * pages/promo.js
 * Promo detail (GET /promos/:id): HTML5 video with an English captions track
 * that is ON by default, a captions on/off button, the browser's controls
 * (play/pause, volume, fullscreen), and a full transcript below the video.
 */
$(function () {
  // ROLE GUARD (signed-in users)
  if (!Auth.requireLogin()) return;
  Layout.init();

  const id = UI.param('id');
  const $detail = $('#detail');
  let item = null;

  if (!id) {
    $detail.attr('aria-busy', 'false').html(UI.emptyState('No promo selected', 'Choose one from the list.', 'promos.html', 'All promos'));
    return;
  }

  function load() {
    Api.get('/promos/' + encodeURIComponent(id), null, { silent: true })
      .then(function (res) {
        item = res.data;
        // ROLE GUARD (UI): unpublished promos are hidden from normal users.
        if (item.published === false && !Auth.isAdmin()) {
          $detail.html(UI.emptyState('Promo not available', "This promo isn't published.", 'promos.html', 'All promos'));
          return;
        }
        document.title = item.title + ' · ' + CONFIG.APP_NAME;
        render();
      })
      .fail(function (err) {
        if (err.status === 404) $detail.html(UI.emptyState('Promo not found', 'It may have been removed.', 'promos.html', 'All promos'));
        else UI.errorState($detail, err.message, load);
      })
      .always(function () { $detail.attr('aria-busy', 'false'); });
  }

  function render() {
    const url = Api.fileUrl(item.video_url);
    const hasCaptions = !!$.trim(item.caption_text || '');

    $detail.html(
      // ROLE GUARD (UI): admin toolbar
      '<div class="mb-3 flex flex-wrap items-center gap-2" data-role="admin" hidden>' + UI.statusBadge(item.published) +
        '<button type="button" id="publish-btn" class="btn btn-secondary btn-sm">' + (item.published === false ? 'Publish' : 'Unpublish') + '</button>' +
        '<a href="promo-form.html?id=' + encodeURIComponent(item.id) + '" class="btn btn-secondary btn-sm">Edit</a>' +
        '<button type="button" id="delete-btn" class="btn btn-danger btn-sm">Delete</button></div>' +

      // No fixed aspect ratio: square or portrait videos keep their shape
      // (centred, at most 70% of the screen height) instead of being stretched.
      '<div class="overflow-hidden rounded-2xl bg-ink">' +
        '<video id="video" controls playsinline preload="metadata" class="mx-auto block max-h-[70vh] w-full object-contain" aria-label="' + UI.escapeHtml(item.title) + '">' +
          '<source src="' + UI.escapeHtml(url) + '">' +
          '<p class="p-4 text-white">Your browser can\'t play this video. <a class="underline" href="' + UI.escapeHtml(url) + '" download>Download it</a> instead. The transcript is below.</p>' +
        '</video>' +
      '</div>' +
      '<div class="mt-3 flex flex-wrap items-center gap-3">' +
        (hasCaptions ? '<button type="button" id="cc-toggle" class="btn btn-secondary btn-sm" aria-pressed="true">Captions: On</button>' : '<p class="text-sm text-slate-600">No captions were provided for this video.</p>') +
        '<p class="text-sm text-slate-600">Use the player controls for volume and full screen.</p>' +
      '</div>' +
      '<p id="video-error" class="mt-3 hidden rounded-lg bg-red-50 p-3 text-sm text-red-900" role="alert">This video can\'t be played in your browser. <a class="underline" href="' + UI.escapeHtml(url) + '" download>Download the video</a>, or read the transcript below.</p>' +

      '<h1 class="mt-6 text-3xl font-bold leading-tight">' + UI.escapeHtml(item.title) + '</h1>' +
      '<p class="mt-1 text-sm text-slate-600">Added <time datetime="' + UI.escapeHtml(item.created_at) + '">' + UI.escapeHtml(UI.formatDate(item.created_at)) + '</time></p>' +
      '<p class="mt-4 whitespace-pre-line leading-relaxed text-slate-700">' + UI.escapeHtml(item.description || '') + '</p>' +

      '<section class="mt-8" aria-labelledby="transcript-heading">' +
        '<h2 id="transcript-heading" class="text-xl font-semibold">Transcript</h2>' +
        '<p class="mt-2 whitespace-pre-line rounded-lg bg-white p-4 leading-relaxed text-slate-700 ring-1 ring-slate-200">' +
          (hasCaptions ? UI.escapeHtml(item.caption_text) : 'No transcript is available. Email ' + CONFIG.SUPPORT_EMAIL + ' if you need this video in another format.') + '</p>' +
      '</section>'
    );
    Auth.applyRoleVisibility($detail);
    setupVideo(hasCaptions);
  }

  function setupVideo(hasCaptions) {
    const video = document.getElementById('video');
    video.addEventListener('error', function () { $('#video-error').removeClass('hidden'); }, true);
    if (!hasCaptions) return;

    // Build the captions track once we know the video's length, then show it.
    function addTrack() {
      if (video.querySelector('track')) return;
      const src = Captions.toVttUrl(item.caption_text, video.duration);
      const track = document.createElement('track');
      track.kind = 'captions';
      track.label = 'English';
      track.srclang = 'en';
      track.src = src;
      track.default = true;
      video.appendChild(track);
      // "default" isn't always honoured for tracks added by script, so force it on.
      setTimeout(function () { if (video.textTracks[0]) video.textTracks[0].mode = 'showing'; }, 0);
    }
    if (video.readyState >= 1) addTrack(); else video.addEventListener('loadedmetadata', addTrack);
    // If metadata never loads (e.g. unsupported format), still add timed captions.
    setTimeout(addTrack, 3000);

    $('#cc-toggle').on('click', function () {
      const t = video.textTracks[0];
      if (!t) return;
      const on = t.mode !== 'showing';
      t.mode = on ? 'showing' : 'hidden';
      $(this).attr('aria-pressed', String(on)).text('Captions: ' + (on ? 'On' : 'Off'));
    });
  }

  // ----- Admin actions -----
  $detail.on('click', '#publish-btn', function () {
    ContentAdmin.setPublished('promos', 'promo', item, item.published === false, $(this))
      .then(function (updated) { $.extend(item, updated); render(); Layout.refreshBell(); });
  });
  $detail.on('click', '#delete-btn', function () {
    ContentAdmin.remove('promos', 'promo', item, $(this)).then(function () {
      UI.flash('"' + item.title + '" was deleted.', 'success');
      window.location.replace('promos.html');
    });
  });

  load();
});
