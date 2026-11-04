// LM Traffic Helper – background
// Dashboard "Check traffic" (one site or a batch) → one Ahrefs tab checks the sites one after another →
// each result is saved to our backend and sent to the dashboard → the tab closes when the batch is done.
// A single check is a batch of one.
// The Ahrefs tab opens in the background; it only comes to the front when Ahrefs wants the person to
// verify they are human (ahrefs.js sends "needsHuman"), and the dashboard is shown again after the next save.

// Only these backends ever receive the login token
const ALLOWED_API = ['http://localhost:5001', 'https://www.api.linkmanagement.net', 'https://api.linkmanagement.net', 'https://api-linkmanagement.femur.studio'];
const ROLES = ['admin', 'manager'];
const MAX_BATCH = 25;
const NEXT_DELAY_MS = [4000, 8000]; // human-paced gap between sites (random in this range)
// Ahrefs answers that mean "stop for now"
const LIMIT_RE = /limit|quota|too many|\brate\b|blocked|exceeded/i;

const getBatch = async () => (await chrome.storage.session.get('batch')).batch || null;
const setBatch = (batch) => chrome.storage.session.set({ batch });
const clearBatch = () => chrome.storage.session.remove('batch');

const cleanDomain = (d) => String(d || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
const ahrefsUrl = (domain) => `https://ahrefs.com/traffic-checker/?input=${encodeURIComponent(domain)}&mode=subdomains`;

const toDashboard = (batch, msg) => {
  if (batch?.dashTabId) chrome.tabs.sendMessage(batch.dashTabId, msg).catch(() => {});
};

const progressOf = (b) => ({
  type: 'progress',
  total: b.items.length,
  done: b.items.filter(i => i.status !== 'pending' && i.status !== 'checking').length,
  saved: b.items.filter(i => i.status === 'saved').length,
  skipped: b.items.filter(i => i.status === 'skipped' || i.status === 'failed').length,
  current: b.items[b.index]?.domain || null,
  status: b.status, // running | finished | stopped
  message: b.message || '',
});

const sendProgress = (b) => toDashboard(b, progressOf(b));

/** Finish the batch: close the Ahrefs tab, back to the dashboard */
const finish = async (b, status, message) => {
  b.status = status;
  b.message = message || '';
  b.items.forEach(i => { if (i.status === 'pending' || i.status === 'checking') i.status = 'not_run'; });
  sendProgress(b);
  // Sites the dashboard is still waiting on
  b.items.filter(i => i.status === 'not_run').forEach(i => toDashboard(b, { type: 'result', site_id: i.site_id, ok: false, cancelled: true, message: b.message }));
  await clearBatch();
  setTimeout(async () => {
    // back to the dashboard only if the person is looking at the Ahrefs tab (it came forward for the human check)
    const ahrefsActive = b.tabId ? await chrome.tabs.get(b.tabId).then(t => t.active, () => false) : false;
    if (b.tabId) chrome.tabs.remove(b.tabId).catch(() => {});
    if (b.surfaced || ahrefsActive) focusTab(b.dashTabId);
  }, 1500);
};

/** Move on to the next site (or finish) */
const next = async (b) => {
  b.index += 1;
  if (b.index >= b.items.length) {
    const s = b.items.filter(i => i.status === 'saved').length;
    return finish(b, 'finished', b.items.length > 1 ? `Done – ${s} of ${b.items.length} saved` : '');
  }
  b.items[b.index].status = 'checking';
  await setBatch(b);
  sendProgress(b);
  const wait = NEXT_DELAY_MS[0] + Math.random() * (NEXT_DELAY_MS[1] - NEXT_DELAY_MS[0]);
  setTimeout(async () => {
    const cur = await getBatch();
    if (!cur || cur.status !== 'running' || cur.id !== b.id) return;
    chrome.tabs.update(b.tabId, { url: ahrefsUrl(b.items[b.index].domain) }).catch(() => finish(b, 'stopped', 'The Ahrefs tab was closed'));
  }, wait);
};

const startBatch = async (msg, sender) => {
  const api = String(msg.api || '').replace(/\/+$/, '');
  if (!ALLOWED_API.some(a => api === a + '/api')) return { ok: false, message: 'This dashboard is not allowed' };
  if (!ROLES.includes(msg.role)) return { ok: false, message: 'Unknown role' };
  if (!msg.token) return { ok: false, message: 'Please log in again' };
  const items = (msg.sites || []).slice(0, MAX_BATCH)
    .map(s => ({ site_id: s.site_id, domain: cleanDomain(s.domain), status: 'pending' }))
    .filter(s => s.site_id && s.domain);
  if (!items.length) return { ok: false, message: 'No sites to check' };

  const running = await getBatch();
  if (running?.status === 'running') {
    // Still running only if its tab is still open
    const alive = await chrome.tabs.get(running.tabId).then(() => true, () => false);
    if (alive) return { ok: false, message: 'A traffic check is already running – wait for it or stop it first' };
  }

  items[0].status = 'checking';
  const tab = await chrome.tabs.create({ url: ahrefsUrl(items[0].domain), active: false, index: (sender.tab?.index ?? 0) + 1 });
  const b = { id: Date.now(), items, index: 0, api, token: msg.token, role: msg.role, dashTabId: sender.tab?.id, tabId: tab.id, status: 'running' };
  await setBatch(b);
  sendProgress(b);
  return { ok: true, total: items.length };
};

/** The current site's Ahrefs result → save it → next */
const saveCapture = async (msg, sender) => {
  const b = await getBatch();
  if (!b || b.status !== 'running' || sender.tab?.id !== b.tabId) return { ok: false, message: 'This tab was not opened from Link Management' };
  const item = b.items[b.index];
  if (item.status !== 'checking') return { ok: true, message: 'Already saved' };
  try {
    const res = await fetch(`${b.api}/${b.role}/sites/${item.site_id}/traffic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${b.token}` },
      body: JSON.stringify({ captures: msg.captures || [], text: msg.text || '' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = res.status === 401 ? 'Your login expired – log in to Link Management again' : (data.message || data.error?.message || `Save failed (${res.status})`);
      item.status = 'failed';
      toDashboard(b, { type: 'result', site_id: item.site_id, ok: false, message });
      if (res.status === 401 || res.status === 403) { await finish(b, 'stopped', message); return { ok: false, message }; }
      await next(b);
      return { ok: false, message };
    }
    item.status = 'saved';
    toDashboard(b, { type: 'result', site_id: item.site_id, ok: true, traffic: data.traffic, message: data.message });
    const more = b.index + 1 < b.items.length;
    // the person was sent to Ahrefs for the human check → back to the dashboard, the rest runs in the background
    if (b.surfaced && more) { b.surfaced = false; focusTab(b.dashTabId); }
    await next(b);
    return { ok: true, message: `${data.message || 'Traffic saved'} ✓${more ? ' – next site…' : ' – closing this tab…'}` };
  } catch (e) {
    const message = 'Could not reach Link Management – check your internet';
    item.status = 'failed';
    toDashboard(b, { type: 'result', site_id: item.site_id, ok: false, message });
    await finish(b, 'stopped', message);
    return { ok: false, message };
  }
};

/** No result for the current site (timeout / Skip button) */
const skipCurrent = async (msg, sender) => {
  const b = await getBatch();
  if (!b || b.status !== 'running' || sender.tab?.id !== b.tabId) return { ok: false };
  const item = b.items[b.index];
  if (item.status !== 'checking') return { ok: true };
  item.status = 'skipped';
  toDashboard(b, { type: 'result', site_id: item.site_id, ok: false, message: msg.reason || 'Skipped – no result from Ahrefs' });
  await next(b);
  return { ok: true };
};

/** Ahrefs answered with an error – stop if it looks like a limit/block */
const ahrefsError = async (msg, sender) => {
  const b = await getBatch();
  if (!b || b.status !== 'running' || sender.tab?.id !== b.tabId) return { ok: false };
  if (msg.status === 429 || LIMIT_RE.test(msg.text || '')) {
    const done = b.items.filter(i => i.status === 'saved').length;
    await finish(b, 'stopped', `Ahrefs is limiting checks right now – stopped after ${done} saved. Try again later.`);
    return { ok: true, stopped: true };
  }
  return { ok: true };
};

const focusTab = async (tabId) => {
  if (!tabId) return;
  const t = await chrome.tabs.update(tabId, { active: true }).catch(() => null);
  if (t) chrome.windows.update(t.windowId, { focused: true }).catch(() => {});
};

/** Ahrefs is showing "verify you are human" → bring its tab to the front */
const needsHuman = async (msg, sender) => {
  const b = await getBatch();
  if (!b || b.status !== 'running' || sender.tab?.id !== b.tabId) return { ok: false };
  b.surfaced = true;
  await setBatch(b);
  await focusTab(b.tabId);
  toDashboard(b, { ...progressOf(b), message: 'Ahrefs wants you to verify you are human – switched to the Ahrefs tab' });
  return { ok: true };
};

const stopBatch = async () => {
  const b = await getBatch();
  if (b?.status === 'running') await finish(b, 'stopped', 'Stopped');
  return { ok: true };
};

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  const run = msg.type === 'startBatch' ? startBatch(msg, sender)
    : msg.type === 'stopBatch' ? stopBatch()
    : msg.type === 'status' ? getBatch().then(b => (b ? progressOf(b) : null))
    : msg.type === 'job' ? getBatch().then(b => (b && b.status === 'running' && sender.tab?.id === b.tabId
      ? { domain: b.items[b.index].domain, position: b.index + 1, total: b.items.length } : null))
    : msg.type === 'captured' ? saveCapture(msg, sender)
    : msg.type === 'skip' ? skipCurrent(msg, sender)
    : msg.type === 'ahrefsError' ? ahrefsError(msg, sender)
    : msg.type === 'needsHuman' ? needsHuman(msg, sender)
    : null;
  if (!run) return false;
  run.then(reply, (e) => reply({ ok: false, message: e.message }));
  return true; // reply is async
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const b = await getBatch();
  if (b?.status === 'running' && b.tabId === tabId) { b.tabId = null; await finish(b, 'stopped', 'The Ahrefs tab was closed – stopped'); }
});
