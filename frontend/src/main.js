import { createApp } from 'vue'
import App from './App.vue'
import jQuery from "jquery";

window.$ = window.jQuery = jQuery;
const app = createApp(App)
// createApp(App).mount('#app')

app.mount('#app')