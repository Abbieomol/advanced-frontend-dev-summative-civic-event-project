/**
 * ui.js
 * Small reusable UI helpers: toasts, confirm dialog, skeleton loaders,
 * empty/error states, button loading states, form errors and formatting.
 */
const UI = (function () {

  // ---------- Text safety ----------
  // Always escape API data before putting it into HTML strings.
  function escapeHtml(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function truncate(text, max) {
    text = String(text || '');
    return text.length > max ? text.slice(0, max - 1).trim() + '…' : text;
  }

  function param(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  // ---------- Dates ----------
  const dateFmt = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
  const timeFmt = { hour: 'numeric', minute: '2-digit' };

  function formatDate(iso) {
    if (!iso) return 'Date to be confirmed';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, dateFmt) + ', ' + d.toLocaleTimeString(undefined, timeFmt);
  }

  function formatDateRange(startIso, endIso) {
    if (!startIso) return 'Date to be confirmed';
    if (!endIso) return formatDate(startIso);
    const s = new Date(startIso), e = new Date(endIso);
    if (s.toDateString() === e.toDateString()) {
      return s.toLocaleDateString(undefined, dateFmt) + ', ' +
        s.toLocaleTimeString(undefined, timeFmt) + ' – ' + e.toLocaleTimeString(undefined, timeFmt);
    }
    return formatDate(startIso) + ' – ' + formatDate(endIso);
  }

  // ---------- Toasts ----------
  // The container has aria-live="polite" so screen readers announce toasts.
  function toastContainer() {
    let $c = $('#toast-region');
    if (!$c.length) {
      $c = $('<div id="toast-region" class="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 sm:w-96" aria-live="polite" aria-atomic="false"></div>');
      $('body').append($c);
    }
    return $c;
  }

  /**
   * type: 'success' | 'error' | 'info'
   * options: { actionLabel, onAction, duration }
   */
  function toast(message, type, options) {
    type = type || 'info';
    options = options || {};
    const styles = {
      success: 'bg-emerald-50 border-emerald-600 text-emerald-900',
      error: 'bg-red-50 border-red-600 text-red-900',
      info: 'bg-slate-50 border-slate-600 text-slate-900'
    };
    const icons = { success: '✓', error: '!', info: 'i' };

    const $t = $(
      '<div class="toast-enter flex items-start gap-3 rounded-lg border-l-4 p-4 shadow-lg ' + styles[type] + '" role="' + (type === 'error' ? 'alert' : 'status') + '">' +
        '<span aria-hidden="true" class="font-bold">' + icons[type] + '</span>' +
        '<p class="flex-1 text-sm">' + escapeHtml(message) + '</p>' +
        (options.actionLabel ? '<button type="button" class="toast-action text-sm font-semibold underline">' + escapeHtml(options.actionLabel) + '</button>' : '') +
        '<button type="button" class="toast-close text-lg leading-none" aria-label="Dismiss message">&times;</button>' +
      '</div>'
    );

    function close() { $t.fadeOut(150, function () { $t.remove(); }); }
    $t.find('.toast-close').on('click', close);
    $t.find('.toast-action').on('click', function () { close(); options.onAction(); });

    toastContainer().append($t);
    // Errors with an action stay until dismissed; others disappear.
    if (!options.actionLabel) setTimeout(close, options.duration || (type === 'error' ? 7000 : 4000));
  }

  // A toast that survives a redirect (e.g. "Account created" -> login page).
  function flash(message, type) {
    sessionStorage.setItem('ce_flash', JSON.stringify({ message: message, type: type || 'success' }));
  }

  function showFlash() {
    const raw = sessionStorage.getItem('ce_flash');
    if (!raw) return;
    sessionStorage.removeItem('ce_flash');
    try { const f = JSON.parse(raw); toast(f.message, f.type); } catch (e) { /* ignore */ }
  }

  // ---------- Confirm dialog ----------
  // Accessible replacement for window.confirm(): focus moves into the dialog,
  // Tab stays inside it, Esc cancels, and focus returns to the trigger after.
  function confirmDialog(opts) {
    const deferred = $.Deferred();
    const previous = document.activeElement;
    const $d = $(
      '<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">' +
        '<div role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-msg" class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">' +
          '<h2 id="dlg-title" class="text-lg font-semibold text-slate-900">' + escapeHtml(opts.title || 'Are you sure?') + '</h2>' +
          '<p id="dlg-msg" class="mt-2 text-sm text-slate-600">' + escapeHtml(opts.message || '') + '</p>' +
          '<div class="mt-6 flex justify-end gap-3">' +
            '<button type="button" class="dlg-cancel btn btn-secondary">' + escapeHtml(opts.cancelLabel || 'Keep it') + '</button>' +
            '<button type="button" class="dlg-ok btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '">' + escapeHtml(opts.confirmLabel || 'Confirm') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );

    function close(result) {
      $d.remove();
      $(document).off('keydown.dialog');
      if (previous) previous.focus();
      result ? deferred.resolve() : deferred.reject();
    }

    $d.find('.dlg-cancel').on('click', function () { close(false); });
    $d.find('.dlg-ok').on('click', function () { close(true); });
    $d.on('click', function (e) { if (e.target === this) close(false); });
    $(document).on('keydown.dialog', function (e) {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Tab') { // keep focus inside the dialog
        const $f = $d.find('button');
        if (e.shiftKey && document.activeElement === $f[0]) { e.preventDefault(); $f.last().focus(); }
        else if (!e.shiftKey && document.activeElement === $f.last()[0]) { e.preventDefault(); $f.first().focus(); }
      }
    });

    $('body').append($d);
    $d.find('.dlg-cancel').focus();
    return deferred.promise();
  }

  // ---------- Loading, empty and error states ----------
  function skeletonCards(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html +=
        '<div class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-hidden="true">' +
          '<div class="skeleton h-40"></div>' +
          '<div class="space-y-3 p-4"><div class="skeleton h-5 w-3/4 rounded"></div>' +
          '<div class="skeleton h-4 w-1/2 rounded"></div><div class="skeleton h-4 w-full rounded"></div></div>' +
        '</div>';
    }
    return html;
  }

  function skeletonRows(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += '<div class="skeleton h-20 rounded-xl" aria-hidden="true"></div>';
    }
    return html;
  }

  function emptyState(title, text, linkHref, linkLabel) {
    return '<div class="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">' +
      '<p class="text-lg font-semibold text-slate-800">' + escapeHtml(title) + '</p>' +
      '<p class="mt-1 text-slate-600">' + escapeHtml(text) + '</p>' +
      (linkHref ? '<a class="btn btn-primary mt-4 inline-flex" href="' + linkHref + '">' + escapeHtml(linkLabel) + '</a>' : '') +
      '</div>';
  }

  // Inline error with a Retry button, for when a whole section fails to load.
  function errorState($target, message, onRetry) {
    $target.html(
      '<div class="col-span-full rounded-xl border border-red-200 bg-red-50 p-6 text-center" role="alert">' +
        '<p class="font-semibold text-red-900">Couldn\'t load this section</p>' +
        '<p class="mt-1 text-sm text-red-800">' + escapeHtml(message) + '</p>' +
        '<button type="button" class="retry btn btn-secondary mt-4">Try again</button>' +
      '</div>'
    );
    $target.find('.retry').on('click', onRetry);
  }

  // Disable a button and show a spinner while a request is running.
  function setLoading($btn, loading, loadingText) {
    if (loading) {
      $btn.data('label', $btn.html());
      $btn.prop('disabled', true).attr('aria-busy', 'true')
        .html('<span class="spinner" aria-hidden="true"></span> ' + escapeHtml(loadingText || 'Please wait…'));
    } else {
      $btn.prop('disabled', false).removeAttr('aria-busy').html($btn.data('label'));
    }
  }

  // ---------- Form errors ----------
  // Each input has a sibling <p id="<input-id>-error"> linked by aria-describedby.
  function fieldError($input, message) {
    const id = $input.attr('id') + '-error';
    let $msg = $('#' + id);
    if (!$msg.length) {
      $msg = $('<p class="field-error mt-1 text-sm text-red-700"></p>').attr('id', id);
      $input.closest('.field').append($msg);
    }
    $msg.text(message);
    $input.attr('aria-invalid', 'true');
    const describedBy = ($input.attr('aria-describedby') || '').split(' ').filter(Boolean);
    if (describedBy.indexOf(id) === -1) describedBy.push(id);
    $input.attr('aria-describedby', describedBy.join(' '));
  }

  function clearErrors($form) {
    $form.find('.field-error').text('');
    $form.find('[aria-invalid]').removeAttr('aria-invalid');
    $form.find('.form-alert').addClass('hidden').text('');
  }

  // Message box at the top of a form (for errors that aren't about one field).
  function formAlert($form, message) {
    $form.find('.form-alert').removeClass('hidden').text(message);
  }

  // ---------- File uploads ----------
  /**
   * Checks a chosen file against CONFIG.UPLOADS[kind] ('image' | 'audio' | 'video').
   * Returns an error message, or null if the file is OK.
   */
  function checkFile(file, kind) {
    const rule = CONFIG.UPLOADS[kind];
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (rule.exts.indexOf(ext) === -1) {
      return 'That file type isn\'t supported. Please choose ' + rule.label + '.';
    }
    if (file.size > rule.maxMB * 1024 * 1024) {
      return 'That file is ' + (file.size / 1024 / 1024).toFixed(1) + ' MB. The maximum is ' + rule.maxMB + ' MB.';
    }
    return null;
  }

  // Upload progress bar: an element with role="progressbar" and a .bar child.
  function setProgress($wrap, percent) {
    $wrap.removeClass('hidden');
    $wrap.attr('aria-valuenow', percent);
    $wrap.find('.bar').css('width', percent + '%');
    $wrap.find('.pct').text(percent + '%');
  }

  // ---------- Formatting ----------
  // 75 -> "1:15"
  function formatDuration(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '–:––';
    seconds = Math.round(seconds);
    const m = Math.floor(seconds / 60), s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // Duration in words for screen readers: 75 -> "1 minute 15 seconds"
  function durationWords(seconds) {
    if (!isFinite(seconds)) return 'unknown length';
    seconds = Math.round(seconds);
    const m = Math.floor(seconds / 60), s = seconds % 60;
    return (m ? m + ' minute' + (m === 1 ? '' : 's') + ' ' : '') + s + ' second' + (s === 1 ? '' : 's');
  }

  // "5 minutes ago", "2 days ago"
  function timeAgo(iso) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'just now';
    const units = [[86400 * 30, 'month'], [86400 * 7, 'week'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
    for (let i = 0; i < units.length; i++) {
      const n = Math.floor(diff / units[i][0]);
      if (n >= 1) return n + ' ' + units[i][1] + (n === 1 ? '' : 's') + ' ago';
    }
    return 'just now';
  }

  // Badge shown to admins on unpublished items
  function statusBadge(published) {
    return published === false
      ? '<span class="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Unpublished</span>'
      : '<span class="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">Published</span>';
  }

  // Star rating as text + hidden stars for screen readers
  function stars(rating) {
    rating = Math.round(Number(rating) || 0);
    let html = '<span aria-hidden="true" class="text-amber-500">';
    for (let i = 1; i <= 5; i++) html += i <= rating ? '★' : '<span class="text-slate-300">★</span>';
    return html + '</span><span class="sr-only">' + rating + ' out of 5 stars</span>';
  }

  return {
    checkFile: checkFile,
    setProgress: setProgress,
    formatDuration: formatDuration,
    durationWords: durationWords,
    timeAgo: timeAgo,
    statusBadge: statusBadge,
    stars: stars,
    escapeHtml: escapeHtml,
    truncate: truncate,
    param: param,
    formatDate: formatDate,
    formatDateRange: formatDateRange,
    toast: toast,
    flash: flash,
    showFlash: showFlash,
    confirm: confirmDialog,
    skeletonCards: skeletonCards,
    skeletonRows: skeletonRows,
    emptyState: emptyState,
    errorState: errorState,
    setLoading: setLoading,
    fieldError: fieldError,
    clearErrors: clearErrors,
    formAlert: formAlert
  };
})();
