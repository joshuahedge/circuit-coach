// Service worker registration and the "update ready" prompt. ?nosw=1 skips it (local testing).

export function registerServiceWorker(app) {
  const w = app.win;
  const nav = w.navigator;
  if (!nav || !('serviceWorker' in nav)) return;
  if (new URLSearchParams(w.location.search).has('nosw')) return;
  const hadController = Boolean(nav.serviceWorker.controller);
  let askedToReload = false;
  let reloading = false;
  nav.serviceWorker.addEventListener('controllerchange', () => {
    // The first install takes control quietly; an update reloads once into the new build.
    if (reloading || (!hadController && !askedToReload)) return;
    reloading = true;
    w.location.reload();
  });
  // Bypass the HTTP cache when checking sw.js and its imports, so a new build is seen at once.
  nav.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
    const offer = (worker) => app.toast('An update is ready.', {
      action: { label: 'Reload', run: () => { askedToReload = true; worker.postMessage('skipWaiting'); } },
      ms: 20000,
    });
    if (reg.waiting && nav.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && nav.serviceWorker.controller) offer(worker);
      });
    });
    w.document.addEventListener('visibilitychange', () => {
      if (w.document.visibilityState !== 'visible') return;
      if (reg.waiting && nav.serviceWorker.controller) offer(reg.waiting);
      reg.update().catch(() => {});
    });
  }).catch(() => {});
}
