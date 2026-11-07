// iPhone's Larger Text setting reaches the page through -apple-system-body (17 px at the default size). The app
// follows it at half strength, between 14 and 19 px, so a small phone keeps its layout and bigger text still
// grows. Returns the root size in px, or null to leave it (16 px: not an iPhone, or iPhone's "Medium").
export function fittedRootPx(systemPx) {
  if (!systemPx || systemPx === 16) return null;
  return Math.min(19, Math.max(14, 16 + (systemPx - 17) / 2));
}

export function fitTextSize(doc) {
  const html = doc.documentElement;
  const px = fittedRootPx(parseFloat(doc.defaultView.getComputedStyle(html).fontSize));
  if (px) html.style.fontSize = `${px}px`;
}
