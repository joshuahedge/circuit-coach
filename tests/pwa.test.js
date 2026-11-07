import { describe, it, expect } from './harness.js';

async function hex(buf) {
  const d = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

describe('pwa', () => {
  it('every cached file exists and the build stamp is current (rerun tools/sw-files.ps1)', async () => {
    const text = await (await fetch('../sw-files.js')).text();
    const build = text.match(/COACH_BUILD = '([0-9a-f]{12})'/)[1];
    const files = [...text.matchAll(/'(\.\/[^']*)'/g)].map((m) => m[1]);
    expect(files[0]).toBe('./');
    const lines = [];
    for (const f of files.slice(1)) {
      const res = await fetch(`../${f.slice(2)}`);
      if (!res.ok) throw new Error(`missing ${f}`);
      lines.push(`${f.slice(2)}:${await hex(await res.arrayBuffer())}`);
    }
    const stamp = (await hex(new TextEncoder().encode(lines.join('\n')))).slice(0, 12);
    expect(stamp).toBe(build);
    const sw = await (await fetch('../sw.js')).text();
    expect(sw).toContain(`// build ${build}`);
    expect(files.includes('./src/main.js')).toBe(true);
    expect(files.includes('./icons/apple-touch-icon.png')).toBe(true);
    const { EXERCISES } = await import('../src/library.js');
    for (const ex of Object.values(EXERCISES)) {
      for (const x of ex.image.srcs) expect(files.includes(`./${x.src}`)).toBe(true);
    }
  });

  it('manifest and page are installable on iPhone', async () => {
    const m = await (await fetch('../manifest.webmanifest')).json();
    expect(m.display).toBe('standalone');
    expect(m.icons.some((i) => i.purpose === 'maskable')).toBe(true);
    for (const i of m.icons) expect((await fetch(`../${i.src}`)).ok).toBe(true);
    const html = await (await fetch('../index.html')).text();
    expect(html).toContain('apple-touch-icon');
    expect(html).toContain('apple-mobile-web-app-capable');
    expect(html).toContain('viewport-fit=cover');
  });
});
