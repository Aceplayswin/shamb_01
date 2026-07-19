// The auth token, readable synchronously.
//
// AsyncStorage is async, but `api()` needs the token on every call without
// awaiting. The store keeps this mirror in sync on hydrate/login/logout so the
// HTTP layer can stay synchronous — and so services/api.js does not have to
// import the auth store (which imports services/api.js in turn).

let currentToken = null;

export function getToken() {
  return currentToken;
}

export function setToken(token) {
  currentToken = token ?? null;
}
