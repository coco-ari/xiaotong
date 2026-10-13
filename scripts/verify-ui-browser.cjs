/*
 * 运行方式：先构建并启动本地审查服务，再执行 node scripts/verify-ui-browser.cjs。
 * UI_TEST_URL：测试页面地址，默认使用本地 18890 端口的固定审查入口。
 * UI_BROWSER_MODULES：包含 playwright-core 或 playwright 的 node_modules 目录。
 * 未设置模块目录时，从项目的 .runtime/browser/node_modules 读取，不安装新依赖。
 * UI_BROWSER_PATH：可选的浏览器可执行文件；Windows 下会自动查找 Edge 或 Chrome。
 * 所有修改 API 均在浏览器内存中拦截；报告和截图写入 .runtime。
 * 运行 node scripts/verify-ui-browser.cjs --help 可查看完整说明。
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const {existsSync} = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const runtimeDirectory = path.join(projectRoot, '.runtime');
const reportPath = path.join(runtimeDirectory, 'final-behavior-report.json');
const screenshotPath = path.join(runtimeDirectory, 'final-mobile-home.png');
const defaultTestUrl = 'http://127.0.0.1:18890/app/ui-review-local/';

const help = `小彤浏览器行为验证

前提：已经构建项目，并启动提供页面与 api/state 的审查服务。
运行：node scripts/verify-ui-browser.cjs

可选环境变量：
  UI_TEST_URL          测试页面地址；默认使用本地 18890 端口的审查入口
  UI_BROWSER_MODULES   playwright-core 或 playwright 所在的 node_modules 目录
  UI_BROWSER_PATH      Edge、Chrome 或兼容 Chromium 的可执行文件路径

未指定模块目录时，读取 .runtime/browser/node_modules，不执行依赖安装。
未指定浏览器路径时，优先查找 Windows 的 Edge、Chrome，再使用运行库默认浏览器。

检查：历史导航、原生弹窗、键盘分段控件、心情保存竞态、资产返回、
      手机初始状态、运行中切换减少动态效果，共 7 组。
安全：只读取初始 api/state；所有修改 API 均在浏览器内存中处理或拒绝。
输出：.runtime/final-behavior-report.json、.runtime/final-mobile-home.png
退出码：全部通过为 0，检查失败或环境不可用为 1。
`;

function loadBrowserLibrary() {
  const directories = [
    process.env.UI_BROWSER_MODULES,
    path.join(runtimeDirectory, 'browser', 'node_modules'),
  ].filter(Boolean).map(directory => path.resolve(directory));

  for (const directory of directories) {
    for (const packageName of ['playwright-core', 'playwright']) {
      try {
        const resolved = require.resolve(packageName, {paths: [directory]});
        const library = require(resolved);
        if (library.chromium) return library;
      } catch (error) {
        if (error.code !== 'MODULE_NOT_FOUND') throw error;
      }
    }
  }
  throw new Error('没有找到浏览器运行库。请把 UI_BROWSER_MODULES 指向已有的 node_modules 目录，或准备 .runtime/browser/node_modules。');
}

function findBrowserExecutable() {
  if (process.env.UI_BROWSER_PATH) {
    const executable = path.resolve(process.env.UI_BROWSER_PATH);
    if (!existsSync(executable)) throw new Error('UI_BROWSER_PATH 指定的浏览器文件不存在。');
    return executable;
  }
  if (process.platform !== 'win32') return undefined;

  const roots = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter(Boolean);
  const candidates = roots.flatMap(root => [
    path.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ]);
  return candidates.find(existsSync);
}

function readTestUrl() {
  const url = new URL(process.env.UI_TEST_URL || defaultTestUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('UI_TEST_URL 必须使用 HTTP 或 HTTPS。');
  if (url.username || url.password) throw new Error('请勿在 UI_TEST_URL 中放入用户名或密码。');
  url.search = '';
  url.hash = '';
  if (/\/index\.html$/i.test(url.pathname)) url.pathname = url.pathname.replace(/index\.html$/i, '');
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(help);
    return;
  }

  const testUrl = readTestUrl();
  const base = testUrl.href;
  const {chromium} = loadBrowserLibrary();
  const executablePath = findBrowserExecutable();
  const browser = await chromium.launch({headless: true, ...(executablePath ? {executablePath} : {})});
  const checks = [];
  const pageErrors = [];
  const buildFiles = new Set();
  const interceptedWrites = {settings: 0, refused: 0};

  const redact = value => String(value).replaceAll(base, `${testUrl.origin}/[测试路径已隐藏]/`);
  const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const snapshot = page => page.evaluate(() => ({
    y: scrollY,
    focus: document.activeElement?.dataset.focusKey || document.activeElement?.tagName,
    view: document.querySelector('main')?.className,
    mood: document.querySelector('.scene-cover')?.dataset.mood,
    scene: document.querySelector('.scene-cover')?.dataset.scene,
    phase: document.querySelector('.scene-cover')?.dataset.phase,
    ambient: document.querySelector('.scene-cover')?.dataset.ambient,
  }));

  async function openPage(page, query = '') {
    await page.goto(base + query);
    const files = await page.locator('script[src], link[rel="stylesheet"][href]').evaluateAll(nodes => nodes.map(node => {
      const address = node.src || node.href;
      return new URL(address).pathname.split('/').pop();
    }));
    files.forEach(file => buildFiles.add(file));
  }

  async function makePage({width = 390, height = 620, reducedMotion = 'no-preference', autoMood = true, delay = 0} = {}) {
    const context = await browser.newContext({viewport: {width, height}, serviceWorkers: 'block', reducedMotion});
    const page = await context.newPage();
    page.on('pageerror', error => pageErrors.push(redact(error.message)));

    const response = await page.request.get(base + 'api/state');
    if (!response.ok()) throw new Error(`无法读取审查状态，HTTP ${response.status()}。请确认测试服务已启动。`);
    let state = await response.json();
    if (!state?.settings) throw new Error('api/state 缺少 settings，当前地址不是可用的审查入口。');
    state = {
      ...state,
      settings: {...state.settings, autoMood, plugins: {...state.settings.plugins, finance: true, feed: true}},
    };

    // 测试所需的设置变化只写入内存，其他修改请求直接拒绝。
    await page.route('**/api/**', async route => {
      const request = route.request();
      const requestUrl = new URL(request.url());
      if (request.method() === 'GET') {
        if (requestUrl.pathname.endsWith('/api/state')) await route.fulfill({json: state});
        else await route.continue();
        return;
      }
      if (request.method() === 'PATCH' && requestUrl.pathname.endsWith('/api/settings')) {
        interceptedWrites.settings += 1;
        if (delay) await new Promise(resolve => setTimeout(resolve, delay));
        const patch = request.postDataJSON();
        state = {
          ...state,
          settings: {
            ...state.settings,
            ...patch,
            ...(patch.plugins ? {plugins: {...state.settings.plugins, ...patch.plugins}} : {}),
          },
        };
        await route.fulfill({json: state});
        return;
      }
      interceptedWrites.refused += 1;
      await route.fulfill({status: 403, json: {error: '审查模式禁止真实写入'}});
    });
    return page;
  }

  async function check(name, action) {
    try {
      const evidence = await action();
      checks.push({name, result: '通过', evidence});
      console.log(`通过：${name}`);
    } catch (error) {
      checks.push({name, result: '失败', error: redact(error.message)});
      console.error(`失败：${name}\n${redact(error.message)}`);
    }
  }

  try {
    await fs.mkdir(runtimeDirectory, {recursive: true});

    // 这项需要跨过 18 秒轮换间隔，与其他独立检查同时运行。
    const motionCheck = check('运行中切换减少动态效果，脚本和 CSS 同时响应', async () => {
      const page = await makePage();
      await openPage(page);
      await page.waitForSelector('.finance-card');
      await settle(page);
      await page.emulateMedia({reducedMotion: 'reduce'});
      await page.waitForFunction(() => document.querySelector('.finance-card')?.dataset.phase === 'done');
      const initial = await page.evaluate(() => ({
        finance: document.querySelector('.finance-card').dataset.phase,
        todayOpacity: getComputedStyle(document.querySelector('.finance-today')).opacity,
        animations: document.querySelector('.scene-cover').getAnimations({subtree: true}).length,
        mood: document.querySelector('.scene-cover').dataset.mood,
      }));
      assert.equal(initial.todayOpacity, '1');
      assert.equal(initial.animations, 0);
      await page.waitForTimeout(18700);
      const after = await snapshot(page);
      assert.equal(after.mood, initial.mood);
      await page.emulateMedia({reducedMotion: 'no-preference'});
      await page.waitForFunction(() => document.querySelector('.scene-cover').getAnimations({subtree: true}).length > 0);
      return {initial, afterAutoInterval: after, normalAnimationsResumed: true};
    });

    await check('浏览器后退和前进保留列表及文章滚动位置与焦点', async () => {
      const page = await makePage();
      await openPage(page);
      await page.waitForSelector('.collection-card');
      await settle(page);
      await page.locator('.collection-card').click();
      await page.waitForSelector('.feed-grid');
      await settle(page);
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
      await page.locator('.story-main').last().focus({preventScroll: true});
      await settle(page);
      const before = await snapshot(page);
      assert.ok(before.y > 0);
      await page.goBack();
      await page.waitForSelector('.collection-card');
      await settle(page);
      await page.goForward();
      await page.waitForSelector('.feed-grid');
      await settle(page);
      const forward = await snapshot(page);
      assert.ok(Math.abs(forward.y - before.y) <= 1);
      assert.equal(forward.focus, before.focus);
      await page.locator('.story-main').last().click();
      await page.waitForSelector('.article-body');
      await settle(page);
      assert.equal((await snapshot(page)).y, 0);
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
      await settle(page);
      const articleBefore = await snapshot(page);
      assert.ok(articleBefore.y > 0);
      await page.goBack();
      await page.waitForSelector('.feed-grid');
      await settle(page);
      await page.goForward();
      await page.waitForSelector('.article-body');
      await settle(page);
      const articleForward = await snapshot(page);
      assert.ok(Math.abs(articleForward.y - articleBefore.y) <= 1);
      return {listBefore: before, listForward: forward, articleBefore, articleForward};
    });

    await check('原生弹窗退出与打开期间历史导航保留位置', async () => {
      const page = await makePage();
      await openPage(page);
      await page.waitForSelector('.collection-card');
      await settle(page);
      await page.locator('.collection-card').click();
      await page.waitForSelector('.feed-grid');
      await settle(page);
      const feedBefore = await snapshot(page);
      await page.goBack();
      await page.waitForSelector('.overview-bar');
      await settle(page);
      await page.evaluate(() => scrollTo(0, 240));
      await page.locator('.overview-bar').focus({preventScroll: true});
      await page.locator('.overview-bar').click();
      await page.waitForSelector('dialog[open]');
      const modal = await page.evaluate(() => ({
        native: document.querySelector('dialog').matches(':modal'),
        locked: document.body.style.position === 'fixed',
        top: document.body.style.top,
        focus: document.activeElement.className,
      }));
      assert.equal(modal.native, true);
      await page.keyboard.press('Escape');
      await page.waitForSelector('dialog', {state: 'detached'});
      await settle(page);
      const escaped = await snapshot(page);
      assert.equal(escaped.y, 240);
      assert.equal(escaped.focus, 'overview-edit');
      await page.locator('.overview-bar').click();
      await page.waitForSelector('dialog[open]');
      await page.goForward();
      await page.waitForSelector('.feed-grid');
      await page.waitForSelector('dialog', {state: 'detached'});
      await settle(page);
      const forward = await snapshot(page);
      assert.equal(await page.evaluate(() => document.body.style.position), '');
      assert.ok(Math.abs(forward.y - feedBefore.y) <= 1);
      await page.goBack();
      await page.waitForSelector('.overview-bar');
      await settle(page);
      const returned = await snapshot(page);
      assert.equal(returned.y, 240);
      return {feedBefore, modal, escaped, forward, returned};
    });

    await check('小屏分段控件方向键和 Home/End 让焦点可见', async () => {
      const page = await makePage({width: 320});
      await openPage(page, '?view=feed');
      await page.waitForSelector('.source-control');
      await settle(page);
      await page.getByRole('radio', {name: '全部', exact: true}).focus();
      await page.keyboard.press('End');
      const end = await page.evaluate(() => {
        const group = document.querySelector('.source-control');
        const item = document.activeElement;
        const container = group.getBoundingClientRect();
        const bounds = item.getBoundingClientRect();
        return {focus: item.textContent, scrollLeft: group.scrollLeft, left: bounds.left, right: bounds.right, containerLeft: container.left, containerRight: container.right, y: scrollY};
      });
      assert.equal(end.focus, 'REDDIT');
      assert.ok(end.left >= end.containerLeft - 1 && end.right <= end.containerRight + 1);
      await page.keyboard.press('Home');
      const home = await page.evaluate(() => ({focus: document.activeElement.textContent, scrollLeft: document.querySelector('.source-control').scrollLeft, y: scrollY}));
      assert.equal(home.focus, '全部');
      assert.equal(home.y, end.y);
      return {end, home};
    });

    await check('保存期间禁止并发选心情，设置重新开启轮换生效', async () => {
      const page = await makePage({autoMood: false, delay: 800});
      await openPage(page);
      await page.waitForSelector('.collection-card');
      await page.locator('.scene-touch').click();
      await page.waitForSelector('dialog[open]');
      assert.equal(await page.locator('.mood-choice').count(), 6);
      await page.getByRole('switch', {name: '自动切换角色心情'}).click();
      await page.waitForFunction(() => [...document.querySelectorAll('.mood-choice')].every(element => element.disabled));
      await page.locator('.mood-choice').nth(1).evaluate(element => element.click());
      assert.equal(await page.locator('.scene-cover').getAttribute('data-mood'), 'greeting');
      await page.waitForFunction(() => [...document.querySelectorAll('.mood-choice')].every(element => !element.disabled));
      await page.locator('.mood-choice').nth(1).click();
      await page.waitForSelector('dialog', {state: 'detached'});
      await page.waitForFunction(() => document.querySelector('.scene-cover').dataset.mood === 'happy');
      await page.waitForTimeout(850);
      const manual = await page.evaluate(() => ({ambient: document.querySelector('.scene-cover').dataset.ambient, animation: getComputedStyle(document.querySelector('.scene-background')).animationPlayState}));
      assert.equal(manual.ambient, 'paused');
      assert.equal(manual.animation, 'paused');
      await page.locator('[data-focus-key="settings-open"]').click();
      await page.waitForSelector('.settings-page');
      await page.getByRole('switch', {name: '自动切换角色心情'}).click();
      await page.waitForFunction(() => document.querySelector('[aria-label="自动切换角色心情"]').getAttribute('aria-checked') === 'true');
      await page.locator('.personal-page-heading button').click();
      await page.waitForSelector('.scene-cover');
      const resumed = await page.evaluate(() => ({ambient: document.querySelector('.scene-cover').dataset.ambient, animation: getComputedStyle(document.querySelector('.scene-background')).animationPlayState}));
      assert.equal(resumed.ambient, 'running');
      assert.equal(resumed.animation, 'running');
      return {disabledDuringSave: true, manual, resumed};
    });

    await check('资产子详情返回原持仓位置和焦点，保留筛选周期', async () => {
      const page = await makePage({width: 320});
      await openPage(page, '?view=finance');
      await page.waitForSelector('.asset-row');
      await settle(page);
      await page.getByRole('radio', {name: '近 14 天'}).click();
      await page.getByRole('radio', {name: '基金', exact: true}).click();
      const row = page.locator('.asset-row').last();
      await row.scrollIntoViewIfNeeded();
      await row.focus({preventScroll: true});
      await settle(page);
      const before = await snapshot(page);
      await row.click();
      await page.waitForSelector('.asset-note');
      await settle(page);
      const entered = await snapshot(page);
      assert.equal(entered.y, 0);
      assert.equal(entered.focus, 'H1');
      await page.locator('.personal-page-heading button').click();
      await page.waitForSelector('.asset-list');
      await settle(page);
      const after = await snapshot(page);
      assert.ok(Math.abs(after.y - before.y) <= 1);
      assert.equal(after.focus, before.focus);
      assert.equal(await page.getByRole('radio', {name: '基金', exact: true}).getAttribute('aria-checked'), 'true');
      assert.equal(await page.getByRole('radio', {name: '近 14 天'}).getAttribute('aria-checked'), 'true');
      return {before, entered, after};
    });

    await check('最终手机首页截图与初始焦点，首次减少动态效果', async () => {
      const page = await makePage({width: 390, height: 844, reducedMotion: 'reduce'});
      await openPage(page);
      await page.waitForSelector('.finance-card');
      await page.locator('.scene-cover').evaluate(async element => Promise.all([...element.querySelectorAll('img')].map(image => image.decode().catch(() => {}))));
      await settle(page);
      const initial = await page.evaluate(() => ({
        activeElement: document.activeElement.tagName,
        financePhase: document.querySelector('.finance-card').dataset.phase,
        todayOpacity: getComputedStyle(document.querySelector('.finance-today')).opacity,
        overflow: document.documentElement.scrollWidth > innerWidth,
        focusOutline: getComputedStyle(document.querySelector('main')).outlineStyle,
      }));
      assert.equal(initial.activeElement, 'BODY');
      assert.equal(initial.financePhase, 'done');
      assert.equal(initial.todayOpacity, '1');
      assert.equal(initial.overflow, false);
      assert.equal(initial.focusOutline, 'none');
      await page.screenshot({path: screenshotPath, fullPage: true});
      return {...initial, screenshot: '.runtime/final-mobile-home.png'};
    });

    await motionCheck;
    const success = checks.length === 7 && checks.every(item => item.result === '通过') && pageErrors.length === 0;
    const report = {
      testedAt: new Date().toISOString(),
      targetOrigin: testUrl.origin,
      targetPath: '不写入报告，避免记录私人入口',
      buildFiles: [...buildFiles].sort(),
      browser: `Chromium ${browser.version()}；320/390px；关闭 Service Worker 以验证当前构建`,
      apiSafety: '只读取初始状态，全部修改 API 在浏览器内存中拦截；未修改服务端数据。',
      interceptedWrites,
      result: success ? '全部通过' : '存在失败',
      checks,
      errors: pageErrors,
    };
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`${report.result}；报告：.runtime/final-behavior-report.json`);
    if (!success) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(`浏览器验证未完成：${error.message}`);
  process.exitCode = 1;
});
