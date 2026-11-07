// Boot: pick storage, start the app, ask the browser to keep the data, register the service worker.
import { createApp } from './app.js';
import { memoryStorage } from './store.js';
import { registerServiceWorker } from './ui/pwa.js';

function pickStorage() {
  try {
    const ls = window.localStorage;
    ls.setItem('__src_probe', '1');
    ls.removeItem('__src_probe');
    return { storage: ls, ok: true };
  } catch (e) {
    return { storage: memoryStorage(), ok: false };
  }
}

async function boot() {
  const params = new URLSearchParams(location.search);
  let { storage, ok } = pickStorage();
  let now;
  if (params.has('demo')) {
    // Screenshot mode: sample data in memory only; the saved data is never touched.
    const { demoStorage, DEMO_NOW } = await import('./dev/demo.js');
    storage = demoStorage(params.get('demo'));
    now = () => new Date(DEMO_NOW.getTime());
    ok = true;
  }
  const app = createApp({ root: document.getElementById('root'), storage, ...(now ? { now } : {}) });
  window.__coach = app;
  if (!ok) app.toast('This browser is blocking storage, so nothing will be saved. Open the app from your home screen.', { level: 'warn', ms: 9000 });
  if (navigator.storage && navigator.storage.persist && !params.has('demo')) navigator.storage.persist().catch(() => {});
  if (!params.has('demo')) registerServiceWorker(app);
}

boot();
