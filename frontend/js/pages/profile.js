/**
 * pages/profile.js
 * My profile: shows full_name, email, role and account status from
 * GET /users/profile/me, and lets the user change ONLY full_name and email
 * (PATCH /users/profile/me). Role and is_active are display-only; the
 * backend also rejects any attempt to send them.
 */
$(function () {
  // ROLE GUARD (signed-in users): any role can view and edit their own profile.
  if (!Auth.requireLogin()) return;
  Layout.init();

  const $form = $('#profile-form');
  const $summary = $('#profile-summary');
  let profile = null;

  function load() {
    $summary.attr('aria-busy', 'true');
    Api.get('/users/profile/me', null, { silent: true })
      .then(function (res) {
        profile = res.data;
        renderSummary();
        fillForm();
        $form.find('input, button').prop('disabled', false);
      })
      .fail(function (err) { UI.errorState($summary, err.message, load); })
      .always(function () { $summary.attr('aria-busy', 'false'); });
  }

  function renderSummary() {
    const initials = profile.full_name.split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('').toUpperCase();
    const since = new Date(profile.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    const active = profile.is_active !== false;

    $summary.html(
      '<h2 id="summary-heading" class="sr-only">Account summary</h2>' +
      '<div class="flex flex-col gap-4 sm:flex-row sm:items-center">' +
        '<span class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xl font-bold text-white" aria-hidden="true">' + UI.escapeHtml(initials) + '</span>' +
        '<div class="flex-1">' +
          '<p class="text-xl font-semibold">' + UI.escapeHtml(profile.full_name) + '</p>' +
          '<p class="text-slate-700">' + UI.escapeHtml(profile.email) + '</p>' +
        '</div>' +
      '</div>' +
      '<dl class="mt-5 grid gap-3 sm:grid-cols-3">' +
        '<div class="rounded-lg bg-slate-50 p-3"><dt class="text-xs font-semibold uppercase text-slate-500">Role</dt>' +
          '<dd class="mt-1 font-semibold capitalize">' + UI.escapeHtml(profile.role) + '</dd></div>' +
        '<div class="rounded-lg bg-slate-50 p-3"><dt class="text-xs font-semibold uppercase text-slate-500">Account status</dt>' +
          '<dd class="mt-1"><span class="rounded px-2 py-0.5 text-sm font-semibold ' + (active ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900') + '">' + (active ? 'Active' : 'Disabled') + '</span></dd></div>' +
        '<div class="rounded-lg bg-slate-50 p-3"><dt class="text-xs font-semibold uppercase text-slate-500">Member since</dt>' +
          '<dd class="mt-1">' + UI.escapeHtml(since) + '</dd></div>' +
      '</dl>' +
      '<p class="mt-4 text-sm text-slate-600">Your role and account status are managed by the city\'s administrators and can\'t be changed here.</p>'
    );
  }

  function fillForm() {
    $('#full_name').val(profile.full_name);
    $('#email').val(profile.email);
  }

  // "Undo changes" puts back the saved values (not the empty HTML defaults)
  $form.on('reset', function (e) {
    e.preventDefault();
    UI.clearErrors($form);
    fillForm();
  });

  $form.on('submit', function (e) {
    e.preventDefault();
    UI.clearErrors($form);
    const $btn = $form.find('[type=submit]');

    const fullName = $.trim($('#full_name').val());
    const email = $.trim($('#email').val());
    let valid = true;
    if (fullName.length < 2) { UI.fieldError($('#full_name'), 'Enter your full name.'); valid = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { UI.fieldError($('#email'), 'Enter a valid email address, like name@example.com.'); valid = false; }
    if (!valid) { $form.find('[aria-invalid=true]').first().trigger('focus'); return; }

    // Send only what changed. Never role or is_active.
    const changes = {};
    if (fullName !== profile.full_name) changes.full_name = fullName;
    if (email.toLowerCase() !== String(profile.email).toLowerCase()) changes.email = email;
    if ($.isEmptyObject(changes)) { UI.toast('Nothing to save: your details are unchanged.', 'info'); return; }

    // Changing the sign-in email deserves a confirmation step.
    const confirmed = changes.email
      ? UI.confirm({
          title: 'Change your sign-in email?',
          message: 'From now on you\'ll sign in with ' + email + ' instead of ' + profile.email + '.',
          confirmLabel: 'Yes, change it',
          cancelLabel: 'Keep current email'
        })
      : $.Deferred().resolve().promise();

    confirmed.then(function () {
      UI.setLoading($btn, true, 'Saving…');
      Api.patch('/users/profile/me', changes, { silent: true })
        .then(function (res) {
          profile = res.data;
          Auth.updateUser({ full_name: profile.full_name, email: profile.email });
          // Reload so the header (initials, name in the menu) shows the new details.
          UI.flash('Your profile has been updated.', 'success');
          window.location.reload();
        })
        .fail(function (err) {
          UI.setLoading($btn, false);
          if (err.status === 409) {
            // Conflict: the email belongs to another account.
            UI.fieldError($('#email'), 'That email is already used by another account. Your email has not been changed.');
            $('#email').trigger('focus');
          } else if (err.status !== 401) {
            UI.formAlert($form, err.message);
          }
        });
    });
  });

  load();
});
