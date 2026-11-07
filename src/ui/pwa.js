// Service worker registration and the "update ready" prompt. ?nosw=1 skips it (local testing).

export function registerServiceWorker(app) {
  const w = app.win;
  const nav = w.navigator;
  if (!nav || !('serviceWorker' in nav)) return;
  if (new URLSearchParams(w.location.search).has('nosw')) return;
  const hadController = Boolean(nav.serviceWorker.controller);
  let reloading = false;
  nav.serviceWorker.addEventListener('controllerchange', () => {
    // First install takes control without a reload; later updates reload once into the new build.
    if (!hadController || reloading) return;
    reloading = true;
    w.location.reload();
  });
  nav.serviceWorker.register('./sw.js').then((reg) => {
    const offer = (worker) => app.toast('An update is ready.', { action: { label: 'Reload', run: () => worker.postMessage('skipWaiting') }, ms: 20000 });
    if (reg.waiting && nav.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && nav.serviceWorker.controller) offer(worker);
      });
    });
    w.document.addEventListener('visibilitychange', () => {
      if (w.document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }).catch(() => {});
}
