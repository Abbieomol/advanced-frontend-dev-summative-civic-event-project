// Keeps track of the logged-in user and token, plus all the role guards.
// Note: these guards are just for the UI. The backend still checks the token
// and role on every request, so this isn't the real security.

const Auth = (function () {
  const TOKEN_KEY = 'ce_token';
  const USER_KEY = 'ce_user';

  function activeStore() {
    return localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
  }

  // "Keep me signed in" -> localStorage (survives closing the browser).
  // Otherwise sessionStorage, which is cleared when the tab closes (safer on shared PCs).
  function save(token, user, remember) {
    clear();
    const store = remember ? localStorage : sessionStorage;
    store.setItem(TOKEN_KEY, token);
    store.setItem(USER_KEY, JSON.stringify({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    }));
  }

  function updateUser(changes) {
    const store = activeStore();
    const current = user();
    if (!current) return;
    store.setItem(USER_KEY, JSON.stringify($.extend({}, current, changes)));
  }

  function token() {
    return activeStore().getItem(TOKEN_KEY);
  }

  function user() {
    try {
      return JSON.parse(activeStore().getItem(USER_KEY));
    } catch (e) {
      return null;
    }
  }

  function clear() {
    [localStorage, sessionStorage].forEach(function (store) {
      store.removeItem(TOKEN_KEY);
      store.removeItem(USER_KEY);
    });
  }

  // The middle part of a JWT is base64 JSON with the expiry time (exp)
  function decodeToken(jwt) {
    try {
      const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(payload));
    } catch (e) {
      return null;
    }
  }

  function isExpired() {
    const jwt = token();
    if (!jwt) return true;
    const payload = decodeToken(jwt);
    // no exp? let the backend decide
    if (!payload || !payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  }

  function isLoggedIn() {
    return !!token() && !isExpired();
  }

  function isAdmin() {
    const u = user();
    return !!u && u.role === 'admin';
  }

  function logout(reason) {
    clear();
    const query = reason ? '?reason=' + encodeURIComponent(reason) : '';
    window.location.replace('login.html' + query);
  }

  // ROLE GUARD: logged-in users only. Sends you to login if there's no token
  // or it has expired.
  function requireLogin() {
    if (!token()) {
      const next = encodeURIComponent(window.location.pathname.split('/').pop() + window.location.search);
      window.location.replace('login.html?next=' + next);
      return false;
    }
    if (isExpired()) {
      logout('expired');
      return false;
    }
    return true;
  }

  // ROLE GUARD: admins only. Normal users get sent back to their dashboard.
  function requireAdmin() {
    if (!requireLogin()) return false;
    if (!isAdmin()) {
      window.location.replace('dashboard.html?denied=1');
      return false;
    }
    return true;
  }

  // ROLE GUARD: login/signup pages - skip them if you're already logged in
  function redirectIfLoggedIn() {
    if (isLoggedIn()) {
      window.location.replace('dashboard.html');
      return true;
    }
    return false;
  }

  // ROLE GUARD: removes data-role="admin" stuff for normal users and
  // data-role="user" stuff for admins (removed, not just hidden)
  function applyRoleVisibility(root) {
    const $root = $(root || document);
    const admin = isAdmin();
    $root.find('[data-role="admin"]').each(function () {
      if (!admin) $(this).remove();
      else $(this).removeAttr('hidden');
    });
    $root.find('[data-role="user"]').each(function () {
      if (admin) $(this).remove();
      else $(this).removeAttr('hidden');
    });
  }

  return {
    save: save,
    updateUser: updateUser,
    token: token,
    user: user,
    clear: clear,
    isExpired: isExpired,
    isLoggedIn: isLoggedIn,
    isAdmin: isAdmin,
    logout: logout,
    requireLogin: requireLogin,
    requireAdmin: requireAdmin,
    redirectIfLoggedIn: redirectIfLoggedIn,
    applyRoleVisibility: applyRoleVisibility
  };
})();
