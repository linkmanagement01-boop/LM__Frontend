// LM Traffic Helper – runs on ahrefs.com/website-authority-checker, only in the window opened by a Traffic Lookup
// with "Also check DR & RD" (after the traffic of the same domain was read).
// Reads Domain Rating, Linking websites (= RD) and Backlinks from the result and sends them to the background.
(() => {
  const TIMEOUT_MS = 90000;   // no result for this long → go on without DR & RD
  const CHALLENGE_WAIT_MS = { page: 8000, box: 20000 };
  const NO_RESULT_MS = 40000;
  let job = null;
  let sent = false;
  let surfaced = false;
  let panel = null;

  // ── Small status panel (bottom right), same as on the Traffic Checker ──
  const button = (text, onClick, light = true) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.style.cssText = `margin:8px 8px 0 0;padding:5px 12px;border:0;border-radius:6px;font-weight:600;cursor:pointer;${light ? 'background:#fff;color:#111' : 'background:rgba(255,255,255,.15);color:#fff'}`;
    b.onclick = onClick;
    return b;
  };
  const showPanel = (text, tone = 'info', withButtons = false) => {
    if (!document.body) return;
    if (!panel) {
      panel = document.createElement('div');
      panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;max-width:330px;padding:12px 14px;border-radius:10px;'
        + 'font:13px/1.45 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25);color:#fff';
      document.body.appendChild(panel);
    }
    panel.style.background = tone === 'ok' ? '#15803d' : tone === 'error' ? '#b91c1c' : '#1e293b';
    panel.innerHTML = '';
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:700;margin-bottom:4px';
    title.textContent = `LM Traffic Helper · DR & RD${job?.total > 1 ? ` · ${job.position} of ${job.total}` : ''} · ${job?.domain || ''}`;
    const body = document.createElement('div');
    body.textContent = text;
    panel.append(title, body);
    if (withButtons) {
      panel.appendChild(button('Save now', () => trySend(true)));
      panel.appendChild(button('Skip DR & RD', () => skip('Skipped'), false));
    }
  };

  // "1.0K" → 1000, "944" → 944, "2.3M" → 2300000
  const toNum = (s) => {
    const m = String(s || '').replace(/,/g, '').trim().match(/^([\d.]+)\s*([KMB])?$/i);
    if (!m) return null;
    const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] || '').toUpperCase()] || 1;
    return Math.round(parseFloat(m[1]) * mult);
  };

  /** The result box: "<domain> · Domain Rating 21 · URL Rating … · Backlinks 1.0K · Linking websites 944" */
  const readResult = () => {
    const text = (document.body?.innerText || '').replace(/ /g, ' ');
    // start at the result for this domain, so the page's own explanations of "Domain Rating" are not read
    const at = text.toLowerCase().indexOf(job.domain.toLowerCase());
    const part = at >= 0 ? text.slice(at, at + 1500) : '';
    const num = '([\\d][\\d.,]*\\s*[KMB]?)\\b';
    const pick = (label) => { const m = part.match(new RegExp(label + '[^\\d\\n]{0,12}\\n?[^\\d\\n]{0,12}' + num, 'i')); return m ? m[1] : null; };
    const dr = pick('Domain Rating');
    const rd = pick('Linking websites');
    const backlinks = pick('Backlinks');
    if (dr === null || rd === null) return null;
    const drN = toNum(dr);
    if (drN === null || drN > 100) return null;
    return { dr: drN, rd: toNum(rd), backlinks: toNum(backlinks) };
  };

  const skip = (reason) => {
    if (sent) return;
    sent = true;
    showPanel('Going on without DR & RD…');
    chrome.runtime.sendMessage({ type: 'skip', reason }).catch(() => {});
  };

  const trySend = (manual = false) => {
    if (!job || (sent && !manual)) return false;
    const r = readResult();
    if (!r) { if (manual) showPanel('DR & RD have not loaded yet. Click the check button on the page first.', 'error', true); return false; }
    sent = true;
    showPanel(`DR ${r.dr} · RD ${r.rd ?? '-'} · Backlinks ${r.backlinks ?? '-'} – sending…`);
    chrome.runtime.sendMessage({ type: 'authority', ...r })
      .then(res => showPanel(res?.message || 'Done ✓', res?.ok ? 'ok' : 'error'))
      .catch(() => { sent = false; showPanel('The helper was updated – reload this tab', 'error'); });
    return true;
  };

  // ── Start the check if the page didn't start it from the link ──
  const autoStart = () => {
    if (sent || readResult()) return;
    const input = [...document.querySelectorAll('input')].find(i => /domain|url|website/i.test(i.placeholder || ''));
    const form = input?.closest('form') || input?.parentElement?.parentElement;
    const btn = [...(form || document).querySelectorAll('button')].find(b => /check/i.test(b.textContent || '')) || form?.querySelector('button[type=submit]');
    if (!input || !btn) return;
    if (!input.value) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, job.domain);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    setTimeout(() => { if (!sent && !readResult()) btn.click(); }, 300);
  };

  // ── "Verify you are human" → bring this window to the front (same rules as the Traffic Checker) ──
  const challengeShown = () => {
    if (/just a moment|verify you are human|checking your browser|are you a robot/i.test(document.title)) return 'page';
    const box = document.querySelector('iframe[src*="challenges.cloudflare.com"], .cf-turnstile, [id^="cf-chl"], iframe[src*="captcha"], iframe[title*="challenge" i]');
    if (box && box.getBoundingClientRect().height > 20) return 'box';
    return false;
  };
  const askForHuman = (why) => {
    if (surfaced || sent) return;
    surfaced = true;
    chrome.runtime.sendMessage({ type: 'needsHuman', why: `DR & RD page – ${why}` }).catch(() => {});
    showPanel(why === 'human check shown'
      ? 'Ahrefs wants you to verify you are human. Complete it here – the check continues by itself.'
      : `DR & RD have not loaded yet – showing this window so it can finish. [${why}]`, 'info', true);
  };

  chrome.runtime.sendMessage({ type: 'job' }).then((j) => {
    if (!j || j.phase !== 'authority') return; // not part of a Traffic Lookup with DR & RD
    job = j;
    showPanel('Checking DR & RD…', 'info', true);
    const started = Date.now();
    let seenAt = 0;
    setTimeout(autoStart, 3000);
    const tick = setInterval(() => {
      if (sent) return clearInterval(tick);
      if (readResult()) { clearInterval(tick); setTimeout(() => trySend(), 1200); return; } // let the numbers settle
      const kind = challengeShown();
      if (kind) { seenAt = seenAt || Date.now(); if (Date.now() - seenAt >= CHALLENGE_WAIT_MS[kind]) askForHuman('human check shown'); }
      else seenAt = 0;
      if (Date.now() - started >= NO_RESULT_MS) askForHuman(`no result after ${NO_RESULT_MS / 1000}s, tab ${document.visibilityState}`);
      if (Date.now() - started >= TIMEOUT_MS) { clearInterval(tick); skip('DR & RD not loaded within 90 seconds'); }
    }, 1000);
  }).catch(() => {});
})();
