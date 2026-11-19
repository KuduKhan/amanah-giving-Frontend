import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
  { path: '/about', name: 'about' },
  { path: '/how-it-works', name: 'how-it-works' },
  { path: '/zakat', name: 'zakat' },
  { path: '/sadaqah', name: 'sadaqah' },
  { path: '/hajj', name: 'hajj' },
  { path: '/verified-charities', name: 'verified-charities' },
  { path: '/faq', name: 'faq' },
  { path: '/contact', name: 'contact' },
  { path: '/policies', name: 'policies' },
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
  const chromeDiagnostics = [];
  chrome = spawn(executable, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check',
    '--no-proxy-server', '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  chrome.stderr?.on('data', chunk => {
    chromeDiagnostics.push(String(chunk));
    if (chromeDiagnostics.length > 15) chromeDiagnostics.shift();
  });
  chrome.on('error', error => errors.push(`Chrome launch failed: ${error.message}`));
  const port = await until(async () => {
    const file = await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8');
    const selectedPort = Number.parseInt(file.split(String.fromCharCode(10))[0], 10);
    return Number.isInteger(selectedPort) && selectedPort > 0 ? selectedPort : null;
  }, 30000).catch(error => {
    throw new Error(`Chrome debugger did not start: ${error.message}; exit=${chrome.exitCode}; stderr=${chromeDiagnostics.join('').slice(-1200)}`);
  });
  const tab = await until(async () => {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`);
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
  // A unique marker prevents the previous document being mistaken for this viewport.
  const target = new URL(route, origin);
  target.searchParams.set('qa_viewport', viewport.name);
  await cdp('Page.navigate', { url: target.toString() });
  await until(async () => evalPage(
    `location.pathname === ${JSON.stringify(route)} && new URLSearchParams(location.search).get('qa_viewport') === ${JSON.stringify(viewport.name)} && document.readyState === 'complete' && !!document.querySelector('main')`,
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
      milestoneGlows: [...document.querySelectorAll('.refined-impact .timeline-item')]
        .map(node => getComputedStyle(node).getPropertyValue('--trace-glow').trim()),
      feedbackFormPresent: !!document.querySelector('#contact-feedback form'),
      hajjDemoPresent: !!document.querySelector('.hajj-overview'),
      skipToastVisible: !!document.querySelector('.amanah-welcome-notice'),
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
  assert.equal(info.skipToastVisible, false, `Skipping the welcome must not cover ${route} with a second notification`);
  if (route === '/') {
    const premium = await evalPage(`(() => {
      const root = document.querySelector('main.home-premium');
      if (!root) return { present: false };
      const sections = ['#top', '#giving-ecosystem', '.refined-seasonal', '#causes', '#knowledge',
        '#zakat', '#impact', '#updates', '#how', '#organizations', 'footer.refined-footer'];
      const titles = [...root.querySelectorAll('h1,h2')].filter(el => el.getBoundingClientRect().width > 0);
      const allButtons = [...root.querySelectorAll('button,a.button')];
      const hero = root.querySelector('.refined-hero h1');
      const heroBounds = hero?.getBoundingClientRect();
      const card = root.querySelector('.refined-seasonal .seasonal-track article');
      const cardStyle = card ? getComputedStyle(card) : null;
      const calculator = root.querySelector('.refined-zakat .calculator');
      return {
        present: true,
        sectionCount: sections.filter(selector => !!root.querySelector(selector)).length,
        titleCount: titles.length,
        heroContained: !!heroBounds && heroBounds.left >= -2 && heroBounds.right <= innerWidth + 2,
        seasonalCardHasBorder: !!cardStyle && parseFloat(cardStyle.borderTopWidth) >= 1,
        seasonalCardShadow: !!cardStyle && cardStyle.boxShadow !== 'none',
        calculatorPresent: !!calculator,
        zakatInputs: root.querySelectorAll('.refined-zakat .calc-grid input').length,
        knowledgeCards: root.querySelectorAll('.refined-knowledge .knowledge-card').length,
        ecosystemButtons: root.querySelectorAll('.refined-causes > button').length,
        howSteps: root.querySelectorAll('.refined-how .steps-grid > li').length,
        actionsWithFocus: allButtons.length,
      };
    })()`);
    assert.equal(premium.present, true, 'Homepage premium styling scope missing');
    assert.equal(premium.sectionCount, 11, 'A homepage section is missing');
    assert.ok(premium.titleCount >= 10, 'Section heading hierarchy incomplete');
    assert.equal(premium.heroContained, true, 'Hero title bleeds outside the viewport');
    assert.equal(premium.seasonalCardHasBorder && premium.seasonalCardShadow, true, 'Premium card framing missing');
    assert.equal(premium.calculatorPresent, true, 'Zakat calculator missing');
    assert.equal(premium.zakatInputs, 6, 'Zakat calculator must have six inputs');
    assert.equal(premium.knowledgeCards, 4, 'Four knowledge opportunities must remain');
    assert.equal(premium.ecosystemButtons, 6, 'Six platform roles must remain');
    assert.equal(premium.howSteps, 4, 'Four giving steps must remain');
    console.log(JSON.stringify({ route: 'homepage-premium', viewport: viewport.name, premium }));

    assert.equal(info.impactStages, 5, 'Project Trace must retain all five original milestones');
    assert.equal(new Set(info.milestoneGlows).size, 5, 'Milestone glow colors must remain distinct');

    const campaigns = await evalPage(`(() => {
      const rows = [...document.querySelectorAll('.refined-opportunities .campaign-card')];
      return rows.map(card => {
        const photo = card.querySelector('.campaign-image');
        const toolbar = card.querySelector('.campaign-photo-toolbar');
        const heroCopy = card.querySelector('.campaign-image-content');
        const body = card.querySelector('.campaign-body-inline');
        const amount = card.querySelector('.funding-amount');
        const percentage = card.querySelector('.money-row > b');
        const progress = card.querySelector('.campaign-compact-controls > .progress');
        const actions = card.querySelector('.campaign-compact-controls > .card-footer');
        const buttons = [...(actions?.querySelectorAll('button') || [])];
        if (!photo || !toolbar || !heroCopy || !body || !amount || !percentage || !progress || !actions || buttons.length !== 2) {
          return { error: 'Campaign funding/action element missing' };
        }
        const bounds = [body, amount, percentage, progress, actions, ...buttons]
          .map(node => node.getBoundingClientRect());
        const photoBounds = photo.getBoundingClientRect();
        const toolbarBounds = toolbar.getBoundingClientRect();
        const heroBounds = heroCopy.getBoundingClientRect();
        const effectiveHitHeights = buttons.map(button => {
          const hitSlop = getComputedStyle(button, '::before');
          return Math.round(button.getBoundingClientRect().height
            - (Number.parseFloat(hitSlop.top) || 0)
            - (Number.parseFloat(hitSlop.bottom) || 0));
        });
        return {
          campaignTitle: card.querySelector('h3')?.textContent?.trim(),
          raised: card.querySelector('.funding-amount strong')?.textContent?.trim(),
          goal: card.querySelector('.funding-amount small')?.textContent?.trim(),
          percentage: card.querySelector('.money-row > b')?.textContent?.trim(),
          cardHeight: Math.round(card.getBoundingClientRect().height),
          photoHeight: Math.round(photoBounds.height),
          imageFit: getComputedStyle(photo.querySelector('img')).objectFit,
          imageFocus: getComputedStyle(photo.querySelector('img')).objectPosition,
          photoOverlap: toolbarBounds.bottom - heroBounds.top,
          photoTextContained: heroBounds.bottom <= photoBounds.bottom + 2,
          metadataPresent: !!card.querySelector('.verified')?.textContent?.includes('Example verification')
            && !!card.querySelector('.campaign-deadline')?.textContent?.includes('days left')
            && !!card.querySelector('.campaign-location')?.textContent?.includes('donors'),
          bodyWidth: Math.round(bounds[0].width),
          progressWidth: Math.round(bounds[3].width),
          actionsRight: Math.round(bounds[4].right),
          bodyRight: Math.round(bounds[0].right),
          fundingOverlap: bounds[1].right - bounds[2].left,
          progressToActionsGap: bounds[4].top - bounds[3].bottom,
          buttonsSameRow: Math.abs(bounds[5].top - bounds[6].top) <= 1,
          buttonsBalanced: Math.abs(bounds[5].width - bounds[6].width) <= 1,
          actionHeight: buttons.map(node => Math.round(node.getBoundingClientRect().height)),
          effectiveHitHeights,
          labels: buttons.map(node => node.textContent.trim()),
        };
      });
    })()`);
    assert.equal(campaigns.length, 6, 'All six example campaigns must remain visible');
    const sectionGap = await evalPage(`(() => {
      const grid = document.querySelector('.refined-opportunities .campaign-grid');
      const next = document.querySelector('.refined-knowledge .section-heading');
      return Math.round(next.getBoundingClientRect().top - grid.getBoundingClientRect().bottom);
    })()`);
    assert.ok(sectionGap >= 12 && sectionGap <= 110,
      `Excessive or collapsed gap after campaigns: ${sectionGap}px`);
    for (const card of campaigns) {
      assert.equal(card.error, undefined, 'Compact campaign controls missing');
      assert.ok(card.photoHeight >= 165 && card.photoHeight <= 220, 'Campaign photo must be compact but still readable');
      assert.equal(card.imageFit, 'cover', 'Campaign photos must crop without distortion');
      assert.match(card.imageFocus, /^\d+% \d+%$/, 'Campaign photos need explicit focal positions');
      assert.notEqual(card.imageFocus, '50% 50%', 'Campaign photos should not revert to indiscriminate centering');
      assert.ok(card.cardHeight <= 350, 'Campaign card must not retain the oversized square format');
      assert.ok(card.photoOverlap <= 2 && card.photoTextContained, 'Photo badges and project details must not overlap');
      assert.equal(card.metadataPresent, true, 'Missing campaign verification/deadline/location metadata');
      assert.ok(card.progressWidth >= card.bodyWidth * 0.82, 'Funding bar must span the usable card width');
      assert.ok(card.actionsRight <= card.bodyRight + 2, 'Campaign actions clipped by card');
      assert.ok(card.fundingOverlap <= 1, 'Funding amount and percentage overlap');
      assert.ok(card.progressToActionsGap >= -1, 'Progress indicator overlaps the action row');
      assert.ok(card.buttonsSameRow && card.buttonsBalanced, 'View details / Donate must fit evenly inline');
      assert.ok(card.actionHeight.every(height => height >= 33 && height <= 37), 'View details and Donate should have short 34/36px visuals');
      assert.ok(card.effectiveHitHeights.every(height => height >= 44), 'Effective CTA hit area must remain at least 44px');
      assert.deepEqual(card.labels, ['View details', 'Donate']);
    }
    const orphanCard = campaigns.find(card => card.campaignTitle === 'Keep 18 orphaned children learning');
    assert.ok(orphanCard, 'Orphans funding card must remain present');
    assert.equal(orphanCard.raised, 'KSh 612K', 'Orphans raised amount must remain KSh 612K');
    assert.equal(orphanCard.goal, 'raised of KSh 1.1M', 'Orphans goal must remain KSh 1.1M');
    assert.equal(orphanCard.percentage, '57% funded', 'Orphans percentage must remain 57%');
    await evalPage(`document.querySelector('#title-ORP-2841')?.closest('.campaign-card')?.scrollIntoView({ block: 'center', behavior: 'instant' }); true`);
    await until(async () => evalPage(`(() => {
      const visibleImages = [...document.querySelectorAll('.refined-opportunities .campaign-image > img')]
        .filter(img => {
          const bounds = img.getBoundingClientRect();
          return bounds.bottom > 0 && bounds.top < innerHeight;
        });
      return visibleImages.length > 0 && visibleImages.every(img => img.complete && img.naturalWidth > 0);
    })()`), 18000);
    await pause(220);
    const cardShot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
    await writeFile(path.join(out, `campaign-orphans-inline-${viewport.name}.png`), Buffer.from(cardShot.data, 'base64'));
    console.log(JSON.stringify({ route: 'campaign-inline', viewport: viewport.name, campaignCount: campaigns.length, cardWidths: campaigns.map(card => card.bodyWidth) }));

    const updateCards = await evalPage(`(() => {
      return [...document.querySelectorAll('.refined-updates .update-card')].map(card => {
        const image = card.querySelector('.update-image');
        const toolbar = card.querySelector('.update-image-toolbar');
        const badge = toolbar?.querySelector('.update-photo-badge');
        const evidence = toolbar?.querySelector('.update-evidence-pill');
        const title = card.querySelector('.update-image-content');
        const summary = card.querySelector('.update-summary');
        if (!image || !toolbar || !badge || !evidence || !title || !summary) return { error: 'Update element missing' };
        const i = image.getBoundingClientRect(), b = badge.getBoundingClientRect();
        const e = evidence.getBoundingClientRect(), t = title.getBoundingClientRect();
        const h = getComputedStyle(evidence, '::before');
        return {
          id: card.querySelector('.update-meta span')?.textContent?.trim(),
          cardHeight: Math.round(card.getBoundingClientRect().height),
          imageHeight: Math.round(i.height),
          imageFit: getComputedStyle(image.querySelector('img')).objectFit,
          imageFocus: getComputedStyle(image.querySelector('img')).objectPosition,
          badgeOverlap: b.right - e.left,
          topOverlap: Math.max(b.bottom, e.bottom) - t.top,
          titleContained: t.bottom <= i.bottom + 2,
          summaryText: summary.textContent?.trim(),
          evidenceHeight: Math.round(e.height),
          effectiveHitHeight: Math.round(e.height - (parseFloat(h.top) || 0) - (parseFloat(h.bottom) || 0)),
          evidenceLabel: evidence.textContent?.trim(),
        };
      });
    })()`);
    assert.equal(updateCards.length, 3, 'Expected three example impact update cards');
    assert.deepEqual(updateCards.map(card => card.id), ['WTR-183','FOD-398','MSQ-112']);
    for (const update of updateCards) {
      assert.equal(update.error, undefined, 'Impact card missing content');
      assert.ok(update.cardHeight <= 340, 'Impact update card too tall');
      assert.ok(update.imageHeight >= 180 && update.imageHeight <= 215, 'Impact image should remain compact');
      assert.equal(update.imageFit, 'cover', 'Update images must crop without stretching');
      assert.match(update.imageFocus, /^\d+% \d+%$/, 'Update images must use their photo-specific crop');
      assert.ok(update.badgeOverlap <= 2 && update.topOverlap <= 2 && update.titleContained, 'Update badge, evidence button or title overlap');
      assert.ok(update.evidenceHeight >= 33 && update.evidenceHeight <= 37, 'View evidence should have compact 34/36px visuals');
      assert.ok(update.effectiveHitHeight >= 44, 'Evidence button needs at least 44px hit area');
      assert.ok(update.summaryText?.length > 25, 'Impact summary text missing');
      assert.equal(update.evidenceLabel, 'View evidence');
    }
    await evalPage(`document.querySelector('#updates .update-card')?.scrollIntoView({ block: 'center', behavior: 'instant' }); true`);
    await pause(260);
    const updatesShot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
    await writeFile(path.join(out, `impact-updates-${viewport.name}.png`), Buffer.from(updatesShot.data, 'base64'));

    // Capture the full editorial journey, not only the first fold and campaign cards.
    const editorialSections = [
      { selector: '#giving-ecosystem', name: 'ecosystem' },
      { selector: '.refined-seasonal', name: 'seasonal' },
      { selector: '#knowledge', name: 'knowledge' },
      { selector: '#zakat', name: 'zakat-calculator' },
      { selector: '#impact', name: 'project-trace' },
      { selector: '#how', name: 'giving-steps' },
      { selector: '#organizations', name: 'organizations' },
      { selector: 'footer.refined-footer', name: 'footer' },
    ];
    for (const section of editorialSections) {
      const found = await evalPage(`!!document.querySelector(${JSON.stringify(section.selector)})`);
      assert.equal(found, true, `Missing ${section.name} section`);
      await evalPage(`document.querySelector(${JSON.stringify(section.selector)}).scrollIntoView({ block: 'start', behavior: 'instant' }); true`);
      await pause(165);
      const shot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
      await writeFile(path.join(out, `home-premium-${section.name}-${viewport.name}.png`), Buffer.from(shot.data, 'base64'));
    }
    // Google reviews were intentionally removed. Store buttons must remain.
    const footerCheck = await evalPage(`(() => ({
      hasGoogleReviews: !!document.querySelector('footer .google-review-preview'),
      appStoreLinks: document.querySelectorAll('footer .footer-apps .footer-app-link').length,
      appStoreText: document.querySelector('footer .footer-apps')?.textContent?.trim(),
    }))()`);
    assert.equal(footerCheck.hasGoogleReviews, false, 'Google review widget must be absent');
    assert.equal(footerCheck.appStoreLinks, 2, 'App Store and Google Play links must be preserved');
    assert.match(footerCheck.appStoreText, /App Store/);
    assert.match(footerCheck.appStoreText, /Google Play/);
    await evalPage(`document.querySelector('.refined-opportunities .campaign-card .card-footer button:first-child')?.click(); true`);
    await until(async () => evalPage(`!!document.querySelector('.overlay[aria-modal="true"]')`), 5000);
    await evalPage(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true`);
    await until(async () => evalPage(`!document.querySelector('.overlay[aria-modal="true"]')`), 5000);
    await evalPage(`document.querySelector('.refined-opportunities .campaign-card .card-footer .donate-mini')?.click(); true`);
    await until(async () => evalPage(`!!document.querySelector('.overlay[aria-modal="true"]')`), 5000);
  }
  if (route === '/contact') assert.equal(info.feedbackFormPresent, true, 'Contact form missing');
  if (route === '/hajj') assert.equal(info.hajjDemoPresent, true, 'Hajj demo missing');
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
