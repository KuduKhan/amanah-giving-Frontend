import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';

const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:3000';
const out = path.resolve('audit-artifacts');
const dimensions = [
  { name: 'phone-320', width: 320, height: 800 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];
const routes = [
  { path: '/', name: 'home' },
  { path: '/contact', name: 'contact' },
  { path: '/hajj', name: 'hajj' },
];
const errors = [];
const results = [];
let chrome;
let socket;
const pending = new Map();
let nextId = 0;

const until = async (action, ms = 25000) => {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < ms) {
    try {
      const value = await action();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await pause(180);
  }
  throw new Error(`Timed out waiting for page/browser: ${String(lastError || 'condition not met')}`);
};

async function cdp(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP timeout: ${method}`));
    }, 20000);
    pending.set(id, message => {
      clearTimeout(timer);
      if (message.error) reject(new Error(`CDP ${method}: ${message.error.message}`));
      else resolve(message.result);
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evalPage(expression) {
  const result = await cdp('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result?.value;
}

async function setup() {
  await mkdir(out, { recursive: true });
  const profile = await mkdtemp(path.join(os.tmpdir(), 'amanah-browser-qa-'));
  const executable = process.env.CHROME_BIN || 'google-chrome';
  chrome = spawn(executable, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check',
    '--no-proxy-server', '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port=9222', `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: 'ignore' });
  chrome.on('error', error => errors.push(`Chrome launch failed: ${error.message}`));
  const tab = await until(async () => {
    const response = await fetch('http://127.0.0.1:9222/json/list');
    if (!response.ok) return null;
    const pages = await response.json();
    return pages.find(p => p.type === 'page' && p.webSocketDebuggerUrl);
  });
  socket = await new Promise((resolve, reject) => {
    const connection = new WebSocket(tab.webSocketDebuggerUrl);
    connection.addEventListener('open', () => resolve(connection), { once: true });
    connection.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
    if (message.method === 'Runtime.exceptionThrown') {
      errors.push(message.params?.exceptionDetails?.text || 'Uncaught runtime error');
    }
  });
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  return profile;
}

async function inspect({ path: route, name }, viewport) {
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: viewport.width, height: viewport.height,
    deviceScaleFactor: 1, mobile: viewport.width < 769,
  });
  await cdp('Page.navigate', { url: new URL(route, origin).toString() });
  await until(async () => evalPage(
    `location.pathname === ${JSON.stringify(route)} && document.readyState === 'complete' && !!document.querySelector('main')`,
  ));
  // The branded splash is intentionally shown on hard refresh. Skip it for layout QA.
  await until(async () => evalPage(
    `!document.querySelector('.amanah-welcome') || !!document.querySelector('.amanah-welcome-skip')`,
  ));
  await evalPage(`document.querySelector('.amanah-welcome-skip')?.click(); true`);
  await pause(400);
  const info = await evalPage(`(() => {
    const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const h1 = document.querySelector('h1')?.textContent?.trim() || '';
    const title = document.title;
    const images = [...document.images].filter(img => img.complete && img.naturalWidth === 0).length;
    const deadAnchors = [...document.querySelectorAll('a[href^="#"]')]
      .filter(a => { const id = a.getAttribute('href')?.slice(1); return id && !document.getElementById(id); })
      .map(a => a.getAttribute('href')).slice(0, 12);
    return {
      path: location.pathname, viewport: innerWidth, width: documentWidth,
      overflow: documentWidth - innerWidth,
      title, h1, missingImages: images, deadAnchors,
      impactStages: document.querySelectorAll('.refined-impact .timeline-item').length,
      screenshot: ${JSON.stringify(name + '-' + viewport.name + '.png')},
    };
  })()`);
  const screenshot = await cdp('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: false, fromSurface: true,
  });
  await writeFile(path.join(out, info.screenshot), Buffer.from(screenshot.data, 'base64'));
  results.push(info);
  console.log(JSON.stringify(info));
  assert.ok(info.h1, `Missing H1 at ${route} ${viewport.name}`);
  assert.ok(info.overflow <= 4, `Horizontal overflow ${info.overflow}px at ${route} ${viewport.name}`);
  assert.equal(info.path, route);
}

let profile;
let failure;
try {
  profile = await setup();
  for (const route of routes) {
    for (const viewport of dimensions) {
      try { await inspect(route, viewport); }
      catch (error) {
        failure ||= error;
        errors.push(`${route.name} ${viewport.name}: ${error.message}`);
      }
    }
  }
} catch (error) {
  failure ||= error;
  errors.push(error.message);
} finally {
  await mkdir(out, { recursive: true });
  await writeFile(path.join(out, 'summary.json'), JSON.stringify({ results, errors }, null, 2));
  if (socket) socket.close();
  if (chrome) chrome.kill('SIGTERM');
  if (profile) await rm(profile, { recursive: true, force: true }).catch(() => {});
}
if (errors.length) console.error(errors.join('\n'));
if (failure || errors.length) process.exitCode = 1;
