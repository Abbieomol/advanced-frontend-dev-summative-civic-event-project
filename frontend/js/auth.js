/**
 * auth.js
 * Global auth context: stores the token and the signed-in user, and holds
 * every client-side ROLE GUARD used by the pages.
 *
 * IMPORTANT: these guards only improve the user experience (hiding buttons,
 * redirecting away from pages). Real security is enforced by the backend:
 * every protected route checks the JWT, and admin routes also check the role
 * and answer 403 if the user is not an admin.
 */
const Auth = (function () {
  const TOKEN_KEY = 'ce_token';
  const USER_KEY = 'ce_user';

  /*
   * Storage choice:
   * - "Remember me" ticked   -> localStorage: survives closing the browser,
   *   but any script on the page (e.g. an XSS bug) could read it.
   * - "Remember me" unticked -> sessionStorage: cleared when the tab closes,
   *   so a stolen laptop or shared computer exposes less.
   * The token is short-lived (1 hour on this backend), which limits the risk.
   */
  function activeStore() {
    return localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
  }

  function save(token, user, remember) {
    clear();
    const store = remember ? localStorage : sessionStorage;
    store.setItem(TOKEN_KEY, token);
    // Keep only what the UI needs: { id, full_name, email, role }
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

  // A JWT is header.payload.signature; the payload is base64url JSON
  // containing "exp" (expiry, in seconds since 1970).
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
    if (!payload || !payload.exp) return false; // let the backend decide
    return Date.now() >= payload.exp * 1000;
  }

  function isLoggedIn() {
    return !!token() && !isExpired();
  }

  function isAdmin() {
    const u = user();
    return !!u && u.role === 'admin';
  }

  /**
   * Sign out and go to the login page.
   * reason: 'expired' | 'logout' | 'unauthorized' (shown as a message there)
   */
  function logout(reason) {
    clear();
    const query = reason ? '?reason=' + encodeURIComponent(reason) : '';
    window.location.replace('login.html' + query);
  }

  // ---------------------------------------------------------------------
  // ROLE GUARDS
  // ---------------------------------------------------------------------

  /**
   * ROLE GUARD (signed-in users): call at the top of every protected page.
   * - No token          -> send to login, remembering where they wanted to go.
   * - Token has expired -> sign out with an "expired" message.
   * Returns true only if the page may continue loading.
   */
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

  /**
   * ROLE GUARD (admins only): call at the top of admin pages.
   * Normal users are sent to their dashboard with an "access denied" message.
   * The backend would also reject their API calls with 403.
   */
  function requireAdmin() {
    if (!requireLogin()) return false;
    if (!isAdmin()) {
      window.location.replace('dashboard.html?denied=1');
      return false;
    }
    return true;
  }

  /**
   * ROLE GUARD (guests only): login and signup pages call this so a user
   * who is already signed in goes straight to the dashboard.
   */
  function redirectIfLoggedIn() {
    if (isLoggedIn()) {
      window.location.replace('dashboard.html');
      return true;
    }
    return false;
  }

  /**
   * ROLE GUARD (UI visibility): removes elements that the current role
   * must not see.
   *   data-role="admin" -> only admins see it (create/edit/delete, admin links)
   *   data-role="user"  -> only normal users see it (e.g. Register button)
   * Elements are removed from the page, not just hidden, so keyboard and
   * screen-reader users never reach them.
   */
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
