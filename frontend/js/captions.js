/**
 * captions.js
 * The backend stores a promo's captions as plain text (caption_text), not as
 * a caption file. A <track> element needs a WebVTT file, so we build one in
 * the browser: the text is split into sentences, spread over the video's
 * length in proportion to each sentence's length, and turned into a Blob URL that the <track> can load.
 */
const Captions = (function () {

  function stamp(seconds) {
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
    const pad = function (n, w) { return String(n).padStart(w || 2, '0'); };
    return pad(h) + ':' + pad(m) + ':' + pad(Math.floor(s)) + '.' + pad(Math.round((s % 1) * 1000), 3);
  }

  // Split into short cues: sentences, then long sentences into ~12-word chunks.
  function cues(text) {
    // Split only where . ! or ? is followed by a space, so "p.m." or "e.g." stay whole.
    const sentences = String(text).replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
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
    // Longer sentences take longer to say, so each cue gets time in proportion
    // to its number of characters (keeps captions in step with the narration).
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
