/**
 * pages/announcement.js
 * Announcement detail (GET /announcements/:id): an accessible audio player
 * with play/pause, back/forward 10 seconds, speed, current time / duration,
 * the browser's own controls as well, and fallback text with a download link.
 */
$(function () {
  // ROLE GUARD (signed-in users)
  if (!Auth.requireLogin()) return;
  Layout.init();

  const id = UI.param('id');
  const $detail = $('#detail');
  let item = null;

  if (!id) {
    $detail.attr('aria-busy', 'false').html(UI.emptyState('No announcement selected', 'Choose one from the list.', 'announcements.html', 'All announcements'));
    return;
  }

  function load() {
    Api.get('/announcements/' + encodeURIComponent(id), null, { silent: true })
      .then(function (res) {
        item = res.data;
        // ROLE GUARD (UI): unpublished announcements are hidden from normal users.
        if (item.published === false && !Auth.isAdmin()) {
          $detail.html(UI.emptyState('Announcement not available', "This announcement isn't published.", 'announcements.html', 'All announcements'));
          return;
        }
        document.title = item.title + ' · ' + CONFIG.APP_NAME;
        render();
      })
      .fail(function (err) {
        if (err.status === 404) $detail.html(UI.emptyState('Announcement not found', 'It may have been removed.', 'announcements.html', 'All announcements'));
        else UI.errorState($detail, err.message, load);
      })
      .always(function () { $detail.attr('aria-busy', 'false'); });
  }

  // Guess the MIME type from the file extension for the <source> element
  function mimeFor(url) {
    const ext = (url.split('?')[0].split('.').pop() || '').toLowerCase();
    return { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', ogg: 'audio/ogg' }[ext] || '';
  }

  function render() {
    const url = Api.fileUrl(item.audio_url);
    $detail.html(
      // ROLE GUARD (UI): admin toolbar
      '<div class="mb-3 flex flex-wrap items-center gap-2" data-role="admin" hidden>' + UI.statusBadge(item.published) +
        '<button type="button" id="publish-btn" class="btn btn-secondary btn-sm">' + (item.published === false ? 'Publish' : 'Unpublish') + '</button>' +
        '<a href="announcement-form.html?id=' + encodeURIComponent(item.id) + '" class="btn btn-secondary btn-sm">Edit</a>' +
        '<button type="button" id="delete-btn" class="btn btn-danger btn-sm">Delete</button></div>' +
      '<h1 class="text-3xl font-bold leading-tight">' + UI.escapeHtml(item.title) + '</h1>' +
      '<p class="mt-1 text-slate-600">Published <time datetime="' + UI.escapeHtml(item.created_at) + '">' + UI.escapeHtml(UI.formatDate(item.created_at)) + '</time></p>' +

      '<section class="mt-6 rounded-2xl border border-slate-200 bg-white p-5" aria-label="Audio player">' +
        '<div class="flex flex-wrap items-center gap-3">' +
          '<button type="button" id="back-10" class="btn btn-secondary btn-sm" aria-label="Back 10 seconds">« 10s</button>' +
          '<button type="button" id="play" class="flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-xl text-white hover:bg-brand-800" aria-label="Play">' +
            '<span aria-hidden="true">▶</span></button>' +
          '<button type="button" id="fwd-10" class="btn btn-secondary btn-sm" aria-label="Forward 10 seconds">10s »</button>' +
          '<p class="ml-auto font-mono text-lg tabular-nums" aria-label="Playback position"><span id="cur">0:00</span> / <span id="dur">–:––</span></p>' +
        '</div>' +
        '<div class="mt-4"><label for="seek" class="sr-only">Seek</label>' +
          '<input id="seek" type="range" min="0" max="100" step="0.1" value="0" class="w-full accent-brand-700" aria-valuetext="0:00"></div>' +
        '<div class="mt-3 flex flex-wrap items-center gap-4 text-sm">' +
          '<label class="flex items-center gap-2">Speed <select id="speed" class="input w-auto py-1 text-sm">' +
            '<option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></label>' +
          '<label class="flex items-center gap-2">Volume <input id="volume" type="range" min="0" max="1" step="0.05" value="1" class="accent-brand-700"></label>' +
        '</div>' +
        // The browser's own player is kept too (fully keyboard accessible).
        '<audio id="audio" controls preload="metadata" class="mt-4 w-full">' +
          '<source src="' + UI.escapeHtml(url) + '"' + (mimeFor(url) ? ' type="' + mimeFor(url) + '"' : '') + '>' +
          // Fallback text for browsers that can't play the format
          '<p>Your browser can\'t play this audio. <a class="underline" href="' + UI.escapeHtml(url) + '" download>Download the audio file</a> instead.</p>' +
        '</audio>' +
        '<p id="audio-error" class="mt-3 hidden rounded-lg bg-red-50 p-3 text-sm text-red-900" role="alert">This audio format can\'t be played in your browser. ' +
          '<a class="underline" href="' + UI.escapeHtml(url) + '" download>Download the audio file</a> to listen with another app.</p>' +
      '</section>' +

      '<section class="mt-6" aria-labelledby="transcript-heading">' +
        '<h2 id="transcript-heading" class="text-xl font-semibold">Transcript</h2>' +
        '<p class="mt-2 rounded-lg bg-white p-4 text-slate-700 ring-1 ring-slate-200">A written transcript hasn\'t been provided for this announcement. ' +
          'If you need it in another format, email <a class="underline" href="mailto:' + CONFIG.SUPPORT_EMAIL + '">' + CONFIG.SUPPORT_EMAIL + '</a> and we\'ll help.</p>' +
      '</section>'
    );
    Auth.applyRoleVisibility($detail);
    bindPlayer();
  }

  function bindPlayer() {
    const audio = document.getElementById('audio');
    const $play = $('#play'), $seek = $('#seek');

    function sync() {
      const playing = !audio.paused;
      $play.attr('aria-label', playing ? 'Pause' : 'Play').find('span').text(playing ? '❚❚' : '▶');
      $('#cur').text(UI.formatDuration(audio.currentTime));
      if (isFinite(audio.duration)) {
        $('#dur').text(UI.formatDuration(audio.duration));
        $seek.val((audio.currentTime / audio.duration) * 100)
          .attr('aria-valuetext', UI.durationWords(audio.currentTime) + ' of ' + UI.durationWords(audio.duration));
      }
    }

    ['play', 'pause', 'timeupdate', 'loadedmetadata', 'ended'].forEach(function (ev) { audio.addEventListener(ev, sync); });
    audio.addEventListener('error', function () { $('#audio-error').removeClass('hidden'); }, true);
    $(audio).find('source').on('error', function () { $('#audio-error').removeClass('hidden'); });

    $play.on('click', function () {
      if (audio.paused) audio.play().catch(function () { $('#audio-error').removeClass('hidden'); });
      else audio.pause();
    });
    $('#back-10').on('click', function () { audio.currentTime = Math.max(0, audio.currentTime - 10); });
    $('#fwd-10').on('click', function () { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10); });
    $seek.on('input', function () { if (isFinite(audio.duration)) audio.currentTime = ($seek.val() / 100) * audio.duration; });
    $('#speed').on('change', function () { audio.playbackRate = Number(this.value); });
    $('#volume').on('input', function () { audio.volume = Number(this.value); });
  }

  // ----- Admin actions -----
  $detail.on('click', '#publish-btn', function () {
    ContentAdmin.setPublished('announcements', 'announcement', item, item.published === false, $(this))
      .then(function (updated) { $.extend(item, updated); render(); Layout.refreshBell(); });
  });
  $detail.on('click', '#delete-btn', function () {
    ContentAdmin.remove('announcements', 'announcement', item, $(this)).then(function () {
      UI.flash('"' + item.title + '" was deleted.', 'success');
      window.location.replace('announcements.html');
    });
  });

  load();
});
