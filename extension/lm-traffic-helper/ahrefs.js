// LM Traffic Helper – runs on ahrefs.com/traffic-checker (only does something in the tab opened by "Check traffic").
// Starts the check for the current domain, waits for the results (the person solves the "I'm human" check if shown),
// then sends the captured data to the background, which saves it and loads the next site of the batch.
(() => {
  const SETTLE_MS = 3000;     // wait for the last result request (countries can come separately)
  const TIMEOUT_MS = 120000;  // no result for this long → skip the site
  // The tab runs in the background. Ask to be shown to the person when Ahrefs is waiting for "verify you are human":
  const CHALLENGE_WAIT_MS = 5000;  // a human-check box has been on the page this long without results
  const NO_RESULT_MS = 25000;      // or no results at all this long after the page opened
  let surfaced = false;
  const captures = [];
  let job = null;
  let timer = null;
  let timeout = null;
  let sent = false;
  let panel = null;
  // what happened on this page (sent with the 'needsHuman' message, so the dashboard can say why the tab came forward)
  const diag = { started: false, requests: 0, lastStatus: null };

  // ── Small status panel (bottom right) ──
  const button = (text, onClick, light = true) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.style.cssText = `margin:8px 8px 0 0;padding:5px 12px;border:0;border-radius:6px;font-weight:600;cursor:pointer;${light ? 'background:#fff;color:#111' : 'background:rgba(255,255,255,.15);color:#fff'}`;
    b.onclick = onClick;
    return b;
  };
  const showPanel = (text, tone = 'info', withButtons = false) => {
    if (!document.body) return document.addEventListener('DOMContentLoaded', () => showPanel(text, tone, withButtons), { once: true });
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
    title.textContent = `LM Traffic Helper${job?.total > 1 ? ` · ${job.position} of ${job.total}` : ''} · ${job?.domain || ''}`;
    const body = document.createElement('div');
    body.textContent = text;
    panel.append(title, body);
    if (withButtons) {
      panel.appendChild(button('Save now', () => send(true)));
      if (job?.total > 1) panel.appendChild(button('Skip site', () => skip('Skipped'), false));
    }
  };

  const skip = (reason) => {
    if (sent) return;
    sent = true;
    clearTimeout(timer); clearTimeout(timeout);
    showPanel('Skipped – loading the next site…');
    chrome.runtime.sendMessage({ type: 'skip', reason }).catch(() => {});
  };

  // ── Captured data → background ──
  const parse = (body) => { try { return JSON.parse(body); } catch { return null; } };
  const isResult = (body) => {
    if (body.length < 200 || !/traffic/i.test(body)) return false;
    const j = parse(body);
    return !!j && !(Array.isArray(j) && j[0] === 'Error');
  };

  const send = (manual = false) => {
    if (!job || (sent && !manual)) return;
    if (!captures.length) return showPanel('No traffic data has loaded yet. Click "Check traffic" on the page first.', 'error', true);
    sent = true;
    clearTimeout(timer); clearTimeout(timeout);
    showPanel('Saving to Link Management…');
    const text = (document.querySelector('main') || document.body)?.innerText?.slice(0, 20000) || '';
    chrome.runtime.sendMessage({ type: 'captured', captures, text })
      .then(r => r?.ok
        ? showPanel(r.message || 'Traffic saved ✓', 'ok')
        : (sent = false, showPanel(r?.message || 'Save failed', 'error', true)))
      .catch(() => { sent = false; showPanel('The helper was updated – reload this tab', 'error'); });
  };

  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data?.__lmTraffic) return;
    const { url, status, body } = e.data;
    diag.requests += 1; diag.lastStatus = status;
    const j = body ? parse(body) : null;
    // Ahrefs error (e.g. a limit) → let the background decide whether to stop
    if (status === 429 || (Array.isArray(j) && j[0] === 'Error')) {
      if (job) chrome.runtime.sendMessage({ type: 'ahrefsError', status, text: JSON.stringify(j ?? '').slice(0, 500) })
        .then(r => { if (r?.stopped) { sent = true; clearTimeout(timeout); showPanel('Ahrefs is limiting checks right now – batch stopped.', 'error'); } })
        .catch(() => {});
      return;
    }
    if (!body || !isResult(body)) return;
    captures.push({ url, body });
    if (captures.length > 20) captures.shift();
    if (!job) return; // job lookup still running – send() is called once it's known
    showPanel('Results loaded – saving in a moment…', 'info', true);
    clearTimeout(timer);
    timer = setTimeout(send, SETTLE_MS);
  });

  // ── Start the check if the page didn't start it from the link ──
  const setInput = (input, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const autoStart = () => {
    if (captures.length || sent) return;
    const input = [...document.querySelectorAll('input')].find(i => /domain|url/i.test(i.placeholder || ''));
    const btn = [...document.querySelectorAll('button')].find(b => /check traffic/i.test(b.textContent || ''));
    if (!input || !btn) { diag.noButton = true; return; }
    diag.started = true;
    if (!input.value) setInput(input, job.domain);
    setTimeout(() => { if (!captures.length && !sent) btn.click(); }, 300);
  };

  // ── "Verify you are human" → bring this tab to the front ──
  const challengeShown = () => {
    if (/just a moment|verify you are human|checking your browser|are you a robot/i.test(document.title)) return true;
    const box = document.querySelector('iframe[src*="challenges.cloudflare.com"], .cf-turnstile, [id^="cf-chl"], iframe[src*="captcha"], iframe[title*="challenge" i]');
    if (box && box.getBoundingClientRect().height > 20) return true;
    return /verify you are human|i'm not a robot|confirm you are human/i.test((document.body?.innerText || '').slice(0, 5000));
  };
  const askForHuman = (reason) => {
    if (surfaced || sent || captures.length || !job) return;
    surfaced = true;
    const cf = !!document.querySelector('iframe[src*="challenges.cloudflare.com"], .cf-turnstile, [id^="cf-chl"], script[src*="turnstile"]');
    const why = reason === 'challenge' ? 'human check shown'
      : `no result after ${NO_RESULT_MS / 1000}s (${diag.noButton ? 'Check button not found' : diag.started ? 'check started' : 'started from link'}, ${diag.requests} Ahrefs answers${diag.lastStatus ? ', last ' + diag.lastStatus : ''}${cf ? ', Cloudflare check on page' : ''}, tab ${document.visibilityState})`;
    chrome.runtime.sendMessage({ type: 'needsHuman', why }).catch(() => {});
    showPanel(reason === 'challenge'
      ? 'Ahrefs wants you to verify you are human. Complete it here – the check continues by itself.'
      : `Ahrefs has not answered yet – showing this tab so it can finish. [${why}]`, 'info', true);
  };
  const watchForHuman = () => {
    const started = Date.now();
    let seenAt = 0;
    const tick = setInterval(() => {
      if (sent || captures.length || surfaced) return clearInterval(tick);
      if (challengeShown()) {
        seenAt = seenAt || Date.now();
        if (Date.now() - seenAt >= CHALLENGE_WAIT_MS) askForHuman('challenge');
      } else seenAt = 0;
      if (Date.now() - started >= NO_RESULT_MS) askForHuman('no_result');
    }, 1000);
  };

  chrome.runtime.sendMessage({ type: 'job' }).then((j) => {
    if (!j) return; // not opened from Link Management
    job = j;
    showPanel('Checking traffic… If Ahrefs asks you to verify you are human, complete it.', 'info', true);
    if (captures.length) { clearTimeout(timer); timer = setTimeout(send, SETTLE_MS); }
    setTimeout(autoStart, 4000);
    watchForHuman();
    if (job.total > 1) timeout = setTimeout(() => skip('Skipped – no result from Ahrefs within 2 minutes'), TIMEOUT_MS);
  }).catch(() => {});
})();
