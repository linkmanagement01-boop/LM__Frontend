// LM Traffic Helper – runs on the Link Management dashboard.
// Lets the page know the helper is installed (and its version), passes "Check traffic" (one site or a batch),
// Stop and status requests to the background, and passes results/progress back to the page.

document.documentElement.setAttribute('data-lm-traffic-helper', chrome.runtime.getManifest().version);

const toPage = (msg) => window.postMessage(msg, location.origin);

const send = (msg, siteIds = []) => chrome.runtime.sendMessage(msg)
  .then((r) => {
    if (msg.type === 'status') return toPage({ ...(r || { status: 'idle' }), type: 'LM_TRAFFIC_PROGRESS' });
    if (msg.type === 'startBatch' && !r?.ok) {
      siteIds.forEach(id => toPage({ type: 'LM_TRAFFIC_RESULT', site_id: id, ok: false, message: r?.message || 'Could not open Ahrefs' }));
      toPage({ type: 'LM_TRAFFIC_PROGRESS', status: 'error', message: r?.message || 'Could not open Ahrefs' });
    }
  })
  .catch(() => {
    siteIds.forEach(id => toPage({ type: 'LM_TRAFFIC_RESULT', site_id: id, ok: false, message: 'The helper was updated – reload this page' }));
    toPage({ type: 'LM_TRAFFIC_PROGRESS', status: 'error', message: 'The helper was updated – reload this page' });
  });

window.addEventListener('message', (e) => {
  if (e.source !== window) return;
  const d = e.data || {};
  if (d.type === 'LM_TRAFFIC_CHECK') {
    send({ type: 'startBatch', sites: [{ site_id: d.site_id, domain: d.domain }], api: d.api, token: d.token, role: d.role }, [d.site_id]);
  } else if (d.type === 'LM_TRAFFIC_BATCH') {
    const sites = (d.sites || []).map(s => ({ site_id: s.site_id, domain: s.domain }));
    send({ type: 'startBatch', sites, api: d.api, token: d.token, role: d.role, lookup: !!d.lookup, authority: !!d.authority }, sites.map(s => s.site_id));
  } else if (d.type === 'LM_TRAFFIC_STOP') {
    send({ type: 'stopBatch' });
  } else if (d.type === 'LM_TRAFFIC_STATUS') {
    send({ type: 'status' });
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'result') toPage({ ...msg, type: 'LM_TRAFFIC_RESULT' });
  else if (msg.type === 'progress') toPage({ ...msg, type: 'LM_TRAFFIC_PROGRESS' });
});
