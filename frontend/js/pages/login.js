/**
 * pages/login.js
 * Sign-in form: validates input, calls POST /auth/login, stores the token
 * and user, then redirects to the dashboard (or the page they came from).
 */
$(function () {
  // ROLE GUARD (guests only): already signed in -> skip the login page.
  if (Auth.redirectIfLoggedIn()) return;

  UI.showFlash();

  // Explain why the user landed here (set by Auth.logout / requireLogin).
  const reasons = {
    expired: { text: 'Your session has expired. Please sign in again.', cls: 'border-amber-300 bg-amber-50 text-amber-900' },
    logout: { text: "You've been signed out.", cls: 'border-slate-300 bg-white text-slate-800' }
  };
  const reason = reasons[UI.param('reason')];
  if (UI.param('next') && !reason) {
    $('#login-notice').removeClass('hidden').addClass('border-slate-300 bg-white text-slate-800').text('Please sign in to continue.');
  } else if (reason) {
    $('#login-notice').removeClass('hidden').addClass(reason.cls).text(reason.text);
  }

  // Pre-fill the email after signing up
  if (UI.param('email')) $('#email').val(UI.param('email'));
  $(UI.param('email') ? '#password' : '#email').trigger('focus');

  // Show / hide password
  $('.toggle-password').on('click', function () {
    const $input = $('#' + $(this).attr('aria-controls'));
    const show = $input.attr('type') === 'password';
    $input.attr('type', show ? 'text' : 'password');
    $(this).text(show ? 'Hide' : 'Show').attr('aria-pressed', String(show));
  });

  $('#login-form').on('submit', function (e) {
    e.preventDefault();
    const $form = $(this);
    const $btn = $form.find('[type=submit]');
    UI.clearErrors($form);

    const email = $.trim($('#email').val());
    const password = $('#password').val();
    let valid = true;

    if (!email) { UI.fieldError($('#email'), 'Enter your email address.'); valid = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { UI.fieldError($('#email'), 'Enter a valid email address, like name@example.com.'); valid = false; }
    if (!password) { UI.fieldError($('#password'), 'Enter your password.'); valid = false; }
    if (!valid) { $form.find('[aria-invalid=true]').first().trigger('focus'); return; }

    UI.setLoading($btn, true, 'Signing in…');

    // skipAuthRedirect: a 401 here means wrong credentials, not an expired session.
    Api.post('/auth/login', { email: email, password: password }, { skipAuthRedirect: true, silent: true })
      .then(function (res) {
        Auth.save(res.data.token, res.data.user, $('#remember').is(':checked'));
        UI.flash('Welcome back, ' + res.data.user.full_name.split(' ')[0] + '!', 'success');

        // Only follow "next" if it's a page in this app (no external redirects).
        const next = UI.param('next');
        const safeNext = next && /^[\w-]+\.html(\?.*)?$/.test(next) ? next : 'dashboard.html';
        window.location.replace(safeNext);
      })
      .fail(function (err) {
        UI.setLoading($btn, false);
        if (err.status === 401) {
          UI.formAlert($form, 'That email and password combination is incorrect.');
        } else {
          UI.formAlert($form, err.message);
        }
        $('#password').val('').trigger('focus');
      });
  });
});
