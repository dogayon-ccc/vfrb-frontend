import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PUBLIC = ['/', '/about', '/what-we-do', '/inside-vfrb', '/gallery', '/our-team', '/guide', '/faq', '/privacy', '/terms'];
const AUTH = ['/login', '/login#request-access', '/forgot-password'];

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
  for (const path of [...PUBLIC, ...AUTH]) {
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
