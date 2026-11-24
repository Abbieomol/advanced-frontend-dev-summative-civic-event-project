// Admin user management: list, view, enable/disable.
// No role editing on purpose - admins aren't allowed to change roles.

$(function () {
  // ROLE GUARD: admins only
  if (!Auth.requireAdmin()) return;
  Layout.init();

  const me = Auth.user();
  const $users = $('#users');
  let users = [];

  function load() {
    $users.attr('aria-busy', 'true').html(UI.skeletonRows(4));
    Api.get('/users', { limit: 200 }, { silent: true })
      .then(function (res) { users = res.data || []; render(); })
      .fail(function (err) { UI.errorState($users, err.message, load); })
      .always(function () { $users.attr('aria-busy', 'false'); });
  }

  function filtered() {
    const q = $.trim($('#q').val()).toLowerCase();
    const role = $('#role').val(), status = $('#status').val();
    return users.filter(function (u) {
      if (role && u.role !== role) return false;
      if (status === 'active' && u.is_active === false) return false;
      if (status === 'disabled' && u.is_active !== false) return false;
      if (q && (u.full_name + ' ' + u.email).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  // on/off switch (role="switch"). You can't disable your own account.
  function switchHtml(u) {
    const on = u.is_active !== false;
    const self = me && u.id === me.id;
    return '<button type="button" class="status-switch relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ' + (on ? 'bg-brand-600' : 'bg-slate-300') + '" ' +
      'role="switch" aria-checked="' + on + '" data-id="' + UI.escapeHtml(u.id) + '" aria-label="Account active: ' + UI.escapeHtml(u.full_name) + '"' +
      (self ? ' disabled title="You can\'t disable your own account"' : '') + '>' +
      '<span class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition ' + (on ? 'translate-x-5' : 'translate-x-0.5') + '"></span></button>';
  }

  function render() {
    const rows = filtered();
    $('#results-count').text(rows.length + ' of ' + users.length + ' user' + (users.length === 1 ? '' : 's') + '.');
    if (!rows.length) { $users.html(UI.emptyState('No users match', 'Try a different search or filter.')); return; }

    $users.html(
      '<div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">' +
      '<table class="w-full min-w-[40rem] text-left text-sm"><caption class="sr-only">Users</caption>' +
      '<thead class="bg-slate-50 text-slate-600"><tr>' +
        '<th scope="col" class="px-4 py-3">Name</th><th scope="col" class="px-4 py-3">Email</th><th scope="col" class="px-4 py-3">Role</th>' +
        '<th scope="col" class="px-4 py-3">Joined</th><th scope="col" class="px-4 py-3">Active</th><th scope="col" class="px-4 py-3"><span class="sr-only">Actions</span></th>' +
      '</tr></thead><tbody>' +
      rows.map(function (u) {
        const on = u.is_active !== false;
        return '<tr class="border-t border-slate-100">' +
          '<td class="px-4 py-3 font-medium">' + UI.escapeHtml(u.full_name) + (me && u.id === me.id ? ' <span class="text-xs text-slate-500">(you)</span>' : '') + '</td>' +
          '<td class="px-4 py-3">' + UI.escapeHtml(u.email) + '</td>' +
          '<td class="px-4 py-3"><span class="rounded px-2 py-0.5 text-xs font-semibold ' + (u.role === 'admin' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800') + '">' + UI.escapeHtml(u.role) + '</span></td>' +
          '<td class="px-4 py-3">' + UI.escapeHtml(new Date(u.created_at).toLocaleDateString()) + '</td>' +
          '<td class="px-4 py-3"><div class="flex items-center gap-2">' + switchHtml(u) +
            '<span class="text-xs font-semibold ' + (on ? 'text-emerald-800' : 'text-slate-600') + '" aria-hidden="true">' + (on ? 'Active' : 'Disabled') + '</span></div></td>' +
          '<td class="px-4 py-3 text-right"><button type="button" class="view-btn btn btn-secondary btn-sm" data-id="' + UI.escapeHtml(u.id) + '" aria-label="View ' + UI.escapeHtml(u.full_name) + '">View</button></td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>'
    );
  }

  function setActive(u, active) {
    const action = active ? 'enable' : 'disable';
    const previous = u.is_active;
    // update the UI first, undo it if the request fails
    u.is_active = active; render();
    return Api.patch('/users/' + encodeURIComponent(u.id) + '/' + action, {}, { silent: true })
      .then(function (res) {
        $.extend(u, res.data);
        render();
        UI.toast(u.full_name + (active ? ' can use their account again.' : '\'s account has been disabled.'), 'success');
      })
      .fail(function (err) {
        u.is_active = previous; render();
        if (err.status !== 401) UI.toast("Couldn't " + action + ' the account: ' + err.message, 'error');
      })
      .always(function () { $users.find('.status-switch[data-id="' + u.id + '"]').trigger('focus'); });
  }

  function userById(id) { return users.filter(function (u) { return u.id === id; })[0]; }

  $users.on('click', '.status-switch', function () {
    const u = userById($(this).data('id'));
    if (u.is_active !== false) {
      UI.confirm({
        title: 'Disable ' + u.full_name + '?',
        message: 'Their account will be marked as disabled. You can enable it again at any time.',
        confirmLabel: 'Disable account',
        cancelLabel: 'Cancel',
        danger: true
      }).then(function () { setActive(u, false); });
    } else {
      setActive(u, true);
    }
  });

  const $dialog = $('#user-dialog');
  let opener = null;

  function closeDialog() {
    $dialog.addClass('hidden').removeClass('flex');
    $(document).off('keydown.userdialog');
    if (opener) opener.focus();
  }

  $users.on('click', '.view-btn', function () {
    opener = this;
    $('#user-dialog-body').html(UI.skeletonRows(2));
    $dialog.removeClass('hidden').addClass('flex');
    $dialog.find('.dialog-close').trigger('focus');
    $(document).on('keydown.userdialog', function (e) { if (e.key === 'Escape') closeDialog(); });

    Api.get('/users/' + encodeURIComponent($(this).data('id')), null, { silent: true })
      .then(function (res) {
        const u = res.data;
        const row = function (k, v) { return '<div class="flex justify-between gap-4 border-b border-slate-100 py-2"><dt class="text-slate-600">' + k + '</dt><dd class="text-right font-medium">' + v + '</dd></div>'; };
        $('#user-dialog-body').html(
          '<dl class="text-sm">' +
            row('Name', UI.escapeHtml(u.full_name)) +
            row('Email', '<a class="underline" href="mailto:' + UI.escapeHtml(u.email) + '">' + UI.escapeHtml(u.email) + '</a>') +
            row('Role', UI.escapeHtml(u.role)) +
            row('Status', u.is_active !== false ? 'Active' : 'Disabled') +
            row('Joined', UI.escapeHtml(UI.formatDate(u.created_at))) +
            row('Last updated', UI.escapeHtml(UI.formatDate(u.updated_at))) +
          '</dl>' +
          '<p class="mt-4 text-sm text-slate-600">Roles can\'t be changed from the admin panel.</p>'
        );
      })
      .fail(function (err) { $('#user-dialog-body').html('<p class="text-red-800" role="alert">' + UI.escapeHtml(err.message) + '</p>'); });
  });
  $dialog.on('click', function (e) { if (e.target === this) closeDialog(); });
  $dialog.find('.dialog-close').on('click', closeDialog);

  $('#q').on('input', render);
  $('#role, #status').on('change', render);
  $('#filters').on('submit', function (e) { e.preventDefault(); });

  load();
});
