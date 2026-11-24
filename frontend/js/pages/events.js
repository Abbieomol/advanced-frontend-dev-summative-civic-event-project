// Events list. GET /events returns every event and ignores query params,
// so search, filters and pagination all happen here in the browser.

$(function () {
  // ROLE GUARD: logged-in users only
  if (!Auth.requireLogin()) return;
  Layout.init();

  const $grid = $('#events-grid');
  let allEvents = [];
  let page = 1;

  $('#filter-q').val(UI.param('q') || '');

  function load() {
    $grid.attr('aria-busy', 'true').html(UI.skeletonCards(6));
    $('#results-count').text('Loading events…');
    $('#pagination').empty();

    $.when(Api.get('/events', null, { silent: true }), Registrations.load())
      .then(function (eventsRes) {
        allEvents = eventsRes.data || [];
        fillLocations();
        render();
      })
      .fail(function (err) {
        $('#results-count').text('');
        UI.errorState($grid, err.message, load);
      })
      .always(function () { $grid.attr('aria-busy', 'false'); });
  }

  function fillLocations() {
    const current = $('#filter-location').val();
    const locations = [];
    allEvents.forEach(function (e) {
      if (e.location && locations.indexOf(e.location) === -1) locations.push(e.location);
    });
    locations.sort();
    $('#filter-location').html('<option value="">All locations</option>' +
      locations.map(function (l) { return '<option>' + UI.escapeHtml(l) + '</option>'; }).join(''));
    $('#filter-location').val(current);
  }

  function filtered() {
    const q = $.trim($('#filter-q').val()).toLowerCase();
    const location = $('#filter-location').val();
    const from = $('#filter-from').val() ? new Date($('#filter-from').val() + 'T00:00:00') : null;
    const to = $('#filter-to').val() ? new Date($('#filter-to').val() + 'T23:59:59') : null;
    const includePast = $('#filter-past').is(':checked');
    // ROLE GUARD: normal users only see published events, admins see everything
    const includeUnpublished = Auth.isAdmin();

    return allEvents.filter(function (e) {
      if (e.published === false && !includeUnpublished) return false;
      if (!includePast && EventCard.isPast(e)) return false;
      if (location && e.location !== location) return false;
      const start = e.starts_at ? new Date(e.starts_at) : null;
      if (from && (!start || start < from)) return false;
      if (to && (!start || start > to)) return false;
      if (q) {
        const text = [e.title, e.description, e.location].join(' ').toLowerCase();
        if (text.indexOf(q) === -1) return false;
      }
      return true;
    }).sort(function (a, b) { return new Date(a.starts_at) - new Date(b.starts_at); });
  }

  function render() {
    const list = filtered();
    const perPage = CONFIG.EVENTS_PER_PAGE;
    const pages = Math.max(1, Math.ceil(list.length / perPage));
    if (page > pages) page = pages;
    const shown = list.slice((page - 1) * perPage, page * perPage);

    $('#results-count').text(list.length === 0 ? 'No events found.'
      : 'Showing ' + ((page - 1) * perPage + 1) + '–' + ((page - 1) * perPage + shown.length) + ' of ' + list.length + ' event' + (list.length === 1 ? '' : 's') + '.');

    if (list.length === 0) {
      const hasFilters = $('#filter-q').val() || $('#filter-location').val() || $('#filter-from').val() || $('#filter-to').val();
      $grid.html(hasFilters
        ? UI.emptyState('No events match your filters', 'Try a different search or clear the filters.')
        : UI.emptyState('No upcoming events yet', 'Check back soon. New events are announced in your notifications.'));
    } else {
      $grid.html(shown.map(EventCard.render).join(''));
      Auth.applyRoleVisibility($grid);
    }
    renderPagination(pages);
  }

  function renderPagination(pages) {
    const $nav = $('#pagination').empty();
    if (pages <= 1) return;

    function button(label, target, opts) {
      opts = opts || {};
      return '<button type="button" class="page-btn btn btn-sm ' + (opts.current ? 'btn-primary' : 'btn-secondary') + '"' +
        ' data-page="' + target + '"' + (opts.disabled ? ' disabled' : '') +
        (opts.current ? ' aria-current="page"' : '') +
        ' aria-label="' + (opts.aria || 'Page ' + target) + '">' + label + '</button>';
    }

    let html = button('‹ Previous', page - 1, { disabled: page === 1, aria: 'Previous page' });
    for (let i = 1; i <= pages; i++) html += button(i, i, { current: i === page });
    html += button('Next ›', page + 1, { disabled: page === pages, aria: 'Next page' });
    $nav.html(html);
  }

  $('#pagination').on('click', '.page-btn', function () {
    page = Number($(this).data('page'));
    render();
    $('#main').trigger('focus');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  let typingTimer;
  $('#filter-q').on('input', function () {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(function () { page = 1; render(); syncUrl(); }, 250);
  });
  $('#filters').on('change', 'select, input[type=date], input[type=checkbox]', function () { page = 1; render(); });
  $('#filters').on('submit', function (e) { e.preventDefault(); page = 1; render(); syncUrl(); });
  $('#filters').on('reset', function () { setTimeout(function () { page = 1; render(); syncUrl(); }, 0); });

  // keep ?q= in the URL so searches can be shared
  function syncUrl() {
    const q = $.trim($('#filter-q').val());
    history.replaceState(null, '', q ? '?q=' + encodeURIComponent(q) : 'events.html');
  }

  EventCard.bindRegister($grid, render);
  EventCard.bindDelete($grid, function (id) {
    allEvents = allEvents.filter(function (e) { return e.id !== id; });
    fillLocations();
    render();
  });
  load();
});
