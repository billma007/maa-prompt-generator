import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

try {
  console.log("App starting...");
  createApp(App).mount('#app');
  console.log("App mounted.");
} catch (e) {
  console.error("Failed to mount app:", e);
  const el = document.getElementById('app');
  if (el) el.innerHTML = `<div style="color:red; p:20px">Failed to load: ${e}</div>`;
}
