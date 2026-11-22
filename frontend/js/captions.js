/**
 * captions.js
 * The backend stores a promo's captions as plain text (caption_text), not as
 * a caption file. A <track> element needs a WebVTT file, so we build one in
 * the browser: the text is split into sentences, spread evenly over the
 * video's length, and turned into a Blob URL that the <track> can load.
 */
const Captions = (function () {

  function stamp(seconds) {
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
    const pad = function (n, w) { return String(n).padStart(w || 2, '0'); };
    return pad(h) + ':' + pad(m) + ':' + pad(Math.floor(s)) + '.' + pad(Math.round((s % 1) * 1000), 3);
  }

  // Split into short cues: sentences, then long sentences into ~12-word chunks.
  function cues(text) {
    const sentences = String(text).replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*/g) || [];
    const out = [];
    sentences.forEach(function (s) {
      const words = s.trim().split(' ');
      for (let i = 0; i < words.length; i += 12) out.push(words.slice(i, i + 12).join(' '));
    });
    return out.filter(Boolean);
  }

  /**
   * Returns a Blob URL for a WebVTT file covering `duration` seconds.
   * If the duration is unknown, each cue gets 4 seconds.
   */
  function toVttUrl(text, duration) {
    const parts = cues(text);
    if (!parts.length) return null;
    const each = isFinite(duration) && duration > 0 ? duration / parts.length : 4;
    let vtt = 'WEBVTT\n\n';
    parts.forEach(function (p, i) {
      vtt += (i + 1) + '\n' + stamp(i * each) + ' --> ' + stamp((i + 1) * each) + '\n' + p + '\n\n';
    });
    return URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
  }

  return { toVttUrl: toVttUrl };
})();
