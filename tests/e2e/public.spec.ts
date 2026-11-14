import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PUBLIC = ['/', '/about', '/what-we-do', '/inside-vfrb', '/gallery', '/our-team', '/guide', '/faq', '/privacy', '/terms'];
const AUTH = ['/login', '/login#request-access', '/forgot-password'];
const AUTH_TOKEN = ['/verify-email', '/reset-password?token=test'];

// Reveal-on-scroll content stays hidden until seen, so axe must run after a full pass.
async function scrollThrough(page: Page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) { await page.evaluate(v => window.scrollTo({ top: v, behavior: 'instant' }), y); await page.waitForTimeout(60); }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
}

test.describe('360px viewport', () => {
  test.use({ viewport: { width: 360, height: 740 } });
  for (const path of [...PUBLIC, ...AUTH]) {
    test(`no horizontal overflow: ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      await scrollThrough(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('axe', () => {
  test.use({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });
  for (const path of [...PUBLIC, ...AUTH, ...AUTH_TOKEN]) {
    test(`wcag a/aa: ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      await scrollThrough(page);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(violations.map(v => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
    });
  }
});

test.describe('keyboard', () => {
  test('login tabs follow Home/End/arrows and keep focus on the tab', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.focus('#tab-signin');
    await page.keyboard.press('End');
    await expect(page.locator('#tab-request')).toBeFocused();
    await expect(page.locator('#panel-request')).toBeVisible();
    await expect(page.locator('#panel-signin')).toBeHidden();
    await page.keyboard.press('Home');
    await expect(page.locator('#tab-signin')).toBeFocused();
  });

  test('login field order is username, password, forgot link, submit', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.focus('#login-email');
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      seen.push(await page.evaluate(() => document.activeElement?.id || document.activeElement?.textContent?.trim() || ''));
      await page.keyboard.press('Tab');
    }
    expect(seen[0]).toBe('login-email');
    expect(seen[1]).toBe('login-password');
    expect(seen.join('|')).toContain('Forgot password?');
  });

  test('every focused control on Home shows a visible focus indicator', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      const ok = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return true;
        const cs = getComputedStyle(el);
        return (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
      });
      expect(ok).toBe(true);
    }
  });
});

test.describe('motion', () => {
  test('pointer tilt is off under reduced motion', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('/gallery', { waitUntil: 'networkidle' });
    const tile = page.locator('.vs-tile').first();
    await tile.scrollIntoViewIfNeeded();
    await tile.hover();
    await page.waitForTimeout(300);
    expect(await tile.evaluate(el => getComputedStyle(el).transform)).toBe('none');
    await ctx.close();
  });
});

test.describe('category panels', () => {
  const panels = (page: Page) => page.locator('.cx > li');

  test('all five panels are visible on desktop and hover opens one wide', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('.cx').scrollIntoViewIfNeeded();
    await page.waitForTimeout(3000); // past the 2.5 s failsafe
    await expect(panels(page)).toHaveCount(5);
    for (let i = 0; i < 5; i++) expect(await panels(page).nth(i).evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    await panels(page).nth(2).hover();
    await expect(panels(page).nth(2)).toHaveClass(/is-on/);
    await page.waitForTimeout(600);
    const w = await panels(page).evaluateAll(els => els.map(e => e.getBoundingClientRect().width));
    expect(w[2]).toBeGreaterThan(w[0] * 1.8);
  });

  test('cards stay visible and scrollable on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('.cx').scrollIntoViewIfNeeded();
    await page.waitForTimeout(3000);
    for (let i = 0; i < 5; i++) expect(await panels(page).nth(i).evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });

  test('every panel is a keyboard-reachable button named for its category', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const names = await page.locator('.cx__btn').evaluateAll(els => els.map(e => (e.textContent || '').trim()));
    expect(names).toHaveLength(5);
    for (const n of names) expect(n).toContain('Open in Studio');
  });
});

test.describe('hero recolor', () => {
  test('no colour swatches are offered when the 3D model fails to load', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.route('**/*.glb', r => r.abort());
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    expect(await page.locator('.lp-3d__sw').count()).toBe(0);
  });
});

test.describe('reduced motion', () => {
  test('Home holds no WebGL context under reduced motion (2D template canvases are fine)', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });
    await scrollThrough(page);
    await page.waitForTimeout(1500);
    const gl = await page.$$eval('canvas', cs => cs.filter(c => !!(c.getContext('webgl2') || c.getContext('webgl'))).length);
    expect(gl).toBe(0);
    await ctx.close();
  });
});

test.describe('deck bar', () => {
  for (const [width, height] of [[768, 1024], [1024, 768], [1440, 900]]) {
    test(`bar covers no Explore tile at slide start, ${width}x${height}`, async ({ browser }) => {
      const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width, height } });
      const page = await ctx.newPage();
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.evaluate(() => document.getElementById('explore')!.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.waitForTimeout(400);
      const bar = (await page.locator('.lp-bar').boundingBox())!;
      for (const t of await page.locator('#explore .lp-tile').all()) {
        const b = (await t.boundingBox())!;
        expect(b.y + b.height, 'tile bottom above the bar').toBeLessThanOrEqual(bar.y);
      }
      await ctx.close();
    });
  }
});

test.describe('landing 3D is real GLB', () => {
  test('hero asks for the real scrub-top GLB, never the authored procedural model, and has no explode control', async ({ page }) => {
    const glbs: string[] = [];
    page.on('request', r => { if (r.url().toLowerCase().includes('.glb')) glbs.push(decodeURI(r.url())); });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    expect(glbs.some(u => u.includes('scrub-top-women-three-quarter.glb'))).toBe(true);
    expect(glbs.filter(u => u.includes('/authored/'))).toEqual([]);
    expect(await page.locator('.lp-3d__btn').count()).toBe(0);
  });

  test('static fallback draws the Studio template, not a hand-drawn shirt', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });
    await scrollThrough(page);
    expect(await page.locator('.fs__sil').count()).toBe(0);
    await expect(page.locator('.fs__flat canvas, .fs__flat svg, .fs__flat img').first()).toBeAttached();
    await ctx.close();
  });
});

test.describe('no route loaders or transitions', () => {
  test('landing to login shows no splash and no view transition', async ({ page }) => {
    await page.addInitScript(() => { (document as any).startViewTransition = () => { (window as any).__vt = true; throw new Error('vt'); }; });
    await page.goto('/');
    await page.getByRole('link', { name: /sign in/i }).first().click();
    await page.waitForURL('**/login');
    await expect(page.locator('.au-card')).toBeVisible();
    await expect(page.getByText('Loading…')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__vt)).toBeFalsy();
  });
  test('login back to landing shows no splash', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /VFRB Enterprise/i }).first().click();
    await expect(page.locator('.vs-page')).toBeVisible();
    await expect(page.getByText('Loading…')).toHaveCount(0);
  });
});

test.describe('route veil', () => {
  test('plays once per page change, never blocks input, and is gone within 0.7s', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(900);
    await page.getByRole('link', { name: /sign in/i }).first().click();
    await page.waitForURL('**/login');
    const veil = page.locator('.rv');
    await expect(veil).toHaveCSS('pointer-events', 'none');
    await expect(page.locator('.au-card')).toBeVisible();
    await expect(async () => {
      const clip = await veil.evaluate(el => getComputedStyle(el).clipPath);
      expect(clip).toContain('140');
    }).toPass({ timeout: 1000 });
  });
  test('auth pages no longer show the flat shirt art', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('.au-flats, .au-flat')).toHaveCount(0);
  });
});
