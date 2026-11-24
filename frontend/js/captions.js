// The backend stores captions as plain text, but <track> needs a WebVTT file.
// So we build one in the browser: one cue per sentence, timed by sentence length.

const Captions = (function () {

  function stamp(seconds) {
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
    const pad = function (n, w) { return String(n).padStart(w || 2, '0'); };
    return pad(h) + ':' + pad(m) + ':' + pad(Math.floor(s)) + '.' + pad(Math.round((s % 1) * 1000), 3);
  }

  function cues(text) {
    // only split when a space follows . ! ? so "p.m." stays together
    const sentences = String(text).replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
    const out = [];
    sentences.forEach(function (s) {
      const words = s.trim().split(' ');
      for (let i = 0; i < words.length; i += 12) out.push(words.slice(i, i + 12).join(' '));
    });
    return out.filter(Boolean);
  }

  function toVttUrl(text, duration) {
    const parts = cues(text);
    if (!parts.length) return null;
    // longer sentences get more time on screen
    const total = isFinite(duration) && duration > 0 ? duration : parts.length * 4;
    const chars = parts.reduce(function (sum, p) { return sum + p.length; }, 0);
    let vtt = 'WEBVTT\n\n', t = 0;
    parts.forEach(function (p, i) {
      const len = (p.length / chars) * total;
      vtt += (i + 1) + '\n' + stamp(t) + ' --> ' + stamp(t + len) + '\n' + p + '\n\n';
      t += len;
    });
    return URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
  }

  return { toVttUrl: toVttUrl };
})();
