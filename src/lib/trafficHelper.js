/**
 * Talks to the "LM Traffic Helper" Chrome extension (LM__Frontend/extension/lm-traffic-helper).
 * "Check traffic" → the extension opens the free Ahrefs Traffic Checker, captures the result
 * and saves it to POST /api/{role}/sites/:id/traffic, then sends LM_TRAFFIC_RESULT back here.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const HELPER_DOWNLOAD_URL = '/lm-traffic-helper.zip';

export const cleanDomain = (d) => String(d || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];

export const ahrefsUrl = (domain) => `https://ahrefs.com/traffic-checker/?input=${encodeURIComponent(cleanDomain(domain))}&mode=subdomains`;

export const isHelperInstalled = () => document.documentElement.hasAttribute('data-lm-traffic-helper');

// Bulk checks need helper 1.1+
export const BATCH_MAX = 25;
export const helperSupportsBatch = () => {
  const [major, minor] = (document.documentElement.getAttribute('data-lm-traffic-helper') || '0.0').split('.').map(Number);
  return major > 1 || (major === 1 && minor >= 1);
};

/** Check several sites one after another in one Ahrefs tab (max BATCH_MAX) */
export const startTrafficBatch = (sites, role) => {
  window.postMessage({
    type: 'LM_TRAFFIC_BATCH',
    sites: sites.slice(0, BATCH_MAX).map(s => ({ site_id: s.id, domain: cleanDomain(s.root_domain) })),
    api: API_BASE_URL,
    token: localStorage.getItem('authToken'),
    role,
  }, window.location.origin);
};

// Traffic Lookup (domains that aren't our sites; results read, not saved) needs helper 1.3+
export const LOOKUP_MAX = 300;
export const helperSupportsLookup = () => {
  const [major, minor] = (document.documentElement.getAttribute('data-lm-traffic-helper') || '0.0').split('.').map(Number);
  return major > 1 || (major === 1 && minor >= 3);
};

/** Check a list of domains – items = [{ key, domain }]; each result comes back as LM_TRAFFIC_RESULT with site_id = key */
export const startTrafficLookup = (items, role = 'admin') => {
  window.postMessage({
    type: 'LM_TRAFFIC_BATCH',
    lookup: true,
    sites: items.slice(0, LOOKUP_MAX).map(i => ({ site_id: i.key, domain: cleanDomain(i.domain) })),
    api: API_BASE_URL,
    token: localStorage.getItem('authToken'),
    role,
  }, window.location.origin);
};

export const stopTrafficBatch = () => window.postMessage({ type: 'LM_TRAFFIC_STOP' }, window.location.origin);

/** Ask for the running batch's progress (answer comes as LM_TRAFFIC_PROGRESS) */
export const requestTrafficStatus = () => window.postMessage({ type: 'LM_TRAFFIC_STATUS' }, window.location.origin);

/** cb({ total, done, saved, skipped, current, status: running|finished|stopped|idle|error, message }) */
export const onTrafficProgress = (cb) => {
  const handler = (e) => {
    if (e.source === window && e.data?.type === 'LM_TRAFFIC_PROGRESS') cb(e.data);
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
};

/** Ask the extension to check a site. role = 'admin' | 'manager' */
export const startTrafficCheck = (site, role) => {
  window.postMessage({
    type: 'LM_TRAFFIC_CHECK',
    site_id: site.id,
    domain: cleanDomain(site.root_domain),
    api: API_BASE_URL,
    token: localStorage.getItem('authToken'),
    role,
  }, window.location.origin);
};

/** cb({ site_id, ok, traffic, message, cancelled }) – returns an unsubscribe function */
export const onTrafficResult = (cb) => {
  const handler = (e) => {
    if (e.source === window && e.data?.type === 'LM_TRAFFIC_RESULT') cb(e.data);
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
};
