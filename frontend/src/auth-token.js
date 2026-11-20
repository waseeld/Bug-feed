// One place to read and write the session token.
// "Remember me" keeps it in localStorage; otherwise it lives in sessionStorage for this tab only.
const KEY = 'bugfeed_token';

function safe(fn, fallback = null) {
  try {
    return fn();
  } catch (e) {
    return fallback;
  }
}

export function getToken() {
  return safe(() => localStorage.getItem(KEY)) || safe(() => sessionStorage.getItem(KEY));
}

export function setToken(token, remember) {
  clearToken();
  safe(() => (remember ? localStorage : sessionStorage).setItem(KEY, token));
}

export function clearToken() {
  safe(() => localStorage.removeItem(KEY));
  safe(() => sessionStorage.removeItem(KEY));
}
