import { createApp } from 'vue';
import App from './App.vue';
import jQuery from 'jquery';

window.$ = window.jQuery = jQuery;

// Global fetch interceptor to inject Authorization Bearer token automatically
const nativeFetch = window.fetch;
window.fetch = async (input, init = {}) => {
  const token = localStorage.getItem('bugfeed_token');
  const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');

  if (token && url.startsWith('/api/') && !url.includes('/api/auth/login') && !url.includes('/api/auth/setup')) {
    init = init || {};
    init.headers = {
      ...(init.headers || {}),
      'Authorization': `Bearer ${token}`
    };
  }

  const res = await nativeFetch(input, init);
  if (res.status === 401 && !url.includes('/api/auth/')) {
    localStorage.removeItem('bugfeed_token');
    window.dispatchEvent(new CustomEvent('bugfeed-unauthorized'));
  }
  return res;
};

const app = createApp(App);
app.mount('#app');