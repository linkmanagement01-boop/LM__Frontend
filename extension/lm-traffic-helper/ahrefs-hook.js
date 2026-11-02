// LM Traffic Helper – runs inside the Ahrefs page itself (main world).
// Copies the JSON answers the Traffic Checker loads, so ahrefs.js can send them to Link Management.
// It only reads responses; it never changes requests.
(() => {
  const MAX = 3 * 1024 * 1024;
  const wanted = (url) => {
    try {
      const u = new URL(url, location.href);
      return u.hostname.endsWith('ahrefs.com') && /traffic|\/v4\//i.test(u.pathname);
    } catch { return false; }
  };
  const post = (url, status, text) => {
    if (status === 429) return window.postMessage({ __lmTraffic: true, url: String(url), status, body: '' }, location.origin);
    if (!text || text.length > MAX) return;
    const t = text.trim();
    if (t[0] !== '{' && t[0] !== '[') return;
    window.postMessage({ __lmTraffic: true, url: String(url), status, body: t }, location.origin);
  };

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input?.url;
    const p = origFetch.apply(this, arguments);
    if (wanted(url)) p.then(r => r.clone().text().then(t => post(url, r.status, t))).catch(() => {});
    return p;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (wanted(url)) {
      this.addEventListener('load', () => {
        try { post(url, this.status, typeof this.response === 'string' ? this.response : JSON.stringify(this.response)); } catch { }
      });
    }
    return origOpen.apply(this, arguments);
  };
})();
