import { createApp } from 'vue';
import App from './App.vue';
import { getToken, clearToken } from './auth-token';

// Global fetch interceptor: attach the session token to /api calls and
// tell the app when the server says the session is no longer valid.
const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
  const token = getToken();

  if (token && url.startsWith('/api/') && !url.startsWith('/api/auth/login') && !url.startsWith('/api/auth/setup')) {
    init = init || {};
    init.headers = {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`
    };
  }

  const res = await nativeFetch(input, init);
  if (res.status === 401 && url.startsWith('/api/') && !url.startsWith('/api/auth/')) {
    clearToken();
    window.dispatchEvent(new CustomEvent('bugfeed-unauthorized'));
  }
  return res;
};

const app = createApp(App);
app.mount('#app');
