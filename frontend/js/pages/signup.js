// Signup page with a password strength meter (same rules as the backend)

$(function () {
  // ROLE GUARD: already logged in -> go to dashboard
  if (Auth.redirectIfLoggedIn()) return;

  const RULES = {
    length: function (p) { return p.length >= 8; },
    case: function (p) { return /[a-z]/.test(p) && /[A-Z]/.test(p); },
    number: function (p) { return /\d/.test(p); },
    special: function (p) { return /[\W_]/.test(p); }
  };
  const LEVELS = [
    { label: 'too weak', color: 'bg-red-600', text: 'text-red-700' },
    { label: 'weak', color: 'bg-red-600', text: 'text-red-700' },
    { label: 'fair', color: 'bg-amber-500', text: 'text-amber-700' },
    { label: 'good', color: 'bg-brand-500', text: 'text-brand-700' },
    { label: 'strong', color: 'bg-emerald-600', text: 'text-emerald-700' }
  ];

  function checkPassword(password) {
    let passed = 0;
    $.each(RULES, function (name, test) {
      const ok = test(password);
      if (ok) passed++;
      $('[data-rule="' + name + '"]')
        .toggleClass('text-emerald-700', ok).toggleClass('text-slate-600', !ok)
        .find('.icon').text(ok ? '✓' : '○');
    });
    return passed;
  }

  function updateMeter() {
    const password = $('#password').val();
    const score = password ? checkPassword(password) : (checkPassword(''), 0);
    const level = LEVELS[score];
    $('.strength-bar').each(function (i) {
      $(this).removeClass('bg-slate-200 bg-red-600 bg-amber-500 bg-brand-500 bg-emerald-600')
        .addClass(i < score ? level.color : 'bg-slate-200');
    });
    $('#strength-label')
      .removeClass('text-slate-600 text-red-700 text-amber-700 text-brand-700 text-emerald-700')
      .addClass(password ? level.text : 'text-slate-600')
      .text('Password strength: ' + level.label);
    return score;
  }

  $('#password').on('input', updateMeter);

  $('.toggle-password').on('click', function () {
    const $input = $('#' + $(this).attr('aria-controls'));
    const show = $input.attr('type') === 'password';
    $input.attr('type', show ? 'text' : 'password');
    $('#confirm_password').attr('type', show ? 'text' : 'password');
    $(this).text(show ? 'Hide' : 'Show').attr('aria-pressed', String(show));
  });

  $('#signup-form').on('submit', function (e) {
    e.preventDefault();
    const $form = $(this);
    const $btn = $form.find('[type=submit]');
    UI.clearErrors($form);

    const data = {
      full_name: $.trim($('#full_name').val()),
      email: $.trim($('#email').val()),
      password: $('#password').val()
    };
    const confirm = $('#confirm_password').val();
    let valid = true;

    if (data.full_name.length < 2) { UI.fieldError($('#full_name'), 'Enter your full name.'); valid = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { UI.fieldError($('#email'), 'Enter a valid email address, like name@example.com.'); valid = false; }
    if (updateMeter() < 4) { UI.fieldError($('#password'), 'Your password must meet all four rules below.'); valid = false; }
    if (!confirm) { UI.fieldError($('#confirm_password'), 'Re-enter your password.'); valid = false; }
    else if (confirm !== data.password) { UI.fieldError($('#confirm_password'), "Passwords don't match."); valid = false; }

    if (!valid) { $form.find('[aria-invalid=true]').first().trigger('focus'); return; }

    UI.setLoading($btn, true, 'Creating account…');

    // we never send a role, so new accounts are always normal users
    Api.post('/auth/signup', data, { silent: true })
      .then(function () {
        UI.flash('Account created! Sign in with your new password.', 'success');
        window.location.replace('login.html?email=' + encodeURIComponent(data.email));
      })
      .fail(function (err) {
        UI.setLoading($btn, false);
        if (err.status === 409) {
          UI.fieldError($('#email'), 'An account with this email already exists. Try signing in instead.');
          $('#email').trigger('focus');
        } else {
          UI.formAlert($form, err.message);
        }
      });
  });
});
