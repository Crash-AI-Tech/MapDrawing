import assert from 'node:assert/strict';
import { randomUUID, randomBytes, pbkdf2Sync } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';

// Fixed staging targets. Use a separately installed Playwright; no browser profile
// or real user account is reused. Every run removes only its own test account.
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = 'https://map-staging.privacy2privacy.workers.dev';
const endpoint = 'https://api.cloudflare.com/client/v4/accounts/97c791889a9678820bdb511581c1635b/d1/database/b6d8b429-8e17-43db-afb1-48b3b35f3bab/query';
const user = `browser-${randomUUID()}`;
const email = `${user}@example.invalid`;
const password = randomBytes(24).toString('base64url');
const salt = randomBytes(16);
const hash = `pbkdf2:100000:${salt.toString('hex')}:${pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex')}`;
const output = process.env.MAP_QA_OUTPUT || '/tmp/map-browser-acceptance';
if (!process.env.CLOUDFLARE_API_TOKEN) throw new Error('Load private Cloudflare credentials first');
async function sql(sql, params = []) {
  // These fixture operations are idempotent, so a transient control-plane TLS
  // failure can safely retry, including cleanup after an interrupted run.
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ sql, params }), signal: AbortSignal.timeout(15_000) });
      const result = await response.json();
      assert.equal(result.success, true, JSON.stringify(result.errors));
      return result.result[0].results;
    } catch (error) {
      if (attempt >= 3) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}
async function eventually(check, message) {
  for (let attempt = 0; attempt < 30; attempt++) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(message);
}
let browser;
try {
  await mkdir(output, { recursive: true });
  console.log('Staging fixture:', user);
  await sql('INSERT OR IGNORE INTO users (id,email,user_name,password_hash,email_verified) VALUES (?,?,?,?,1)', [user, email, 'Acceptance tester', hash]);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/canvas?lng=0.12345&lat=0.23456&zoom=14`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${output}/desktop-guide.png` });
  await page.getByRole('button', { name: '在这里画一笔', exact: true }).click();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#niubi-active-canvas')).pointerEvents === 'auto');
  const draw = async (offset = 0) => {
    await page.mouse.move(680, 450 + offset); await page.mouse.down();
    await page.mouse.move(780, 480 + offset, { steps: 20 }); await page.mouse.up();
  };
  await draw();
  assert.equal(await page.getByRole('button', { name: '撤销 (Ctrl+Z)', exact: true }).isEnabled(), true);
  assert.equal((await sql('SELECT count(*) n FROM drawings WHERE user_id=?', [user]))[0].n, 0);
  // The same canvas DOM must survive successful login; memory-only drafts must
  // not silently disappear because an auth dialog reloads the document.
  const canvas = await page.locator('#niubi-active-canvas').elementHandle();
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.getByLabel('邮箱', { exact: true }).fill(email);
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByRole('dialog').getByRole('button', { name: '登录', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(await canvas.evaluate(element => element.isConnected), true, 'login preserves the canvas');
  const publish = page.getByRole('button', { name: '发布我的试画', exact: true });
  await publish.click();
  await eventually(async () => (await sql('SELECT count(*) n FROM drawings WHERE user_id=?', [user]))[0].n === 1, 'guest practice was not published');
  await publish.waitFor({ state: 'hidden' });
  await draw(60);
  await eventually(async () => (await sql('SELECT count(*) n FROM drawings WHERE user_id=?', [user]))[0].n === 2, 'authenticated drawing was not saved');
  await page.getByRole('button', { name: '撤销 (Ctrl+Z)', exact: true }).click();
  await eventually(async () => (await sql('SELECT count(*) n FROM drawings WHERE user_id=?', [user]))[0].n === 1, 'undo was not persisted');
  await page.getByRole('button', { name: '重做 (Ctrl+Shift+Z)', exact: true }).click();
  await eventually(async () => (await sql('SELECT count(*) n FROM drawings WHERE user_id=?', [user]))[0].n === 2, 'redo was not persisted');
  await context.setOffline(true);
  await draw(100);
  assert.equal((await sql('SELECT count(*) n FROM drawings WHERE user_id=?', [user]))[0].n, 2);
  await context.setOffline(false);
  await eventually(async () => (await sql('SELECT count(*) n FROM drawings WHERE user_id=?', [user]))[0].n === 3, 'offline drawing was not recovered');
  await page.getByRole('button', { name: '画笔（再次点击切换橡皮擦）', exact: true }).click();
  assert.equal(await page.locator('#niubi-active-canvas').evaluate(element => getComputedStyle(element).cursor.includes('fb7185')), true);
  await page.screenshot({ path: `${output}/desktop-saved.png` });
  assert.deepEqual(errors, [], 'no uncaught browser errors');
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const phone = await mobile.newPage();
  await phone.goto(`${origin}/canvas`, { waitUntil: 'networkidle' });
  assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'mobile has no horizontal overflow');
  await phone.screenshot({ path: `${output}/mobile-guide.png` });
  console.log('PASS: guest trial/login/publish without reload, authenticated draw, persisted undo/redo, offline recovery, eraser cursor, desktop/mobile screenshots');
} finally {
  await browser?.close();
  await sql('DELETE FROM users WHERE id=?', [user]);
  console.log('Removed this run’s staging test account and content. Production untouched.');
}
