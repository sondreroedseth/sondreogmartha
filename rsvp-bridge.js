/* Apps Script uses a nested Google iframe. Bind the private channel to its actual
   message source, rather than assuming the outer iframe is the sender. */
(() => {
  'use strict';
  const config = window.RSVP_CONFIG || {};
  const token = new URLSearchParams(location.hash.slice(1)).get('invitasjon') || '';
  const validToken = /^[a-f0-9]{64}$/.test(token);
  const endpointOK = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(config.endpoint || '');
  const reloadIfTokenChanged = () => {
    const next = new URLSearchParams(location.hash.slice(1)).get('invitasjon') || '';
    if (next !== token) location.reload();
  };
  window.addEventListener('hashchange', reloadIfTokenChanged);
  window.addEventListener('popstate', reloadIfTokenChanged);
  // Normal #section links would replace the secret fragment. Preserve it during
  // page navigation, including a later reload or copied link.
  if (validToken) {
    document.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const href = link.getAttribute('href').slice(1);
      const section = new URLSearchParams(href).get('section') || href;
      const target = document.getElementById(section);
      if (!target) return;
      event.preventDefault();
      const hash = new URLSearchParams({ invitasjon: token, section });
      history.pushState(null, '', '#' + hash);
      target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    });
    const restoreSection = () => {
      const section = new URLSearchParams(location.hash.slice(1)).get('section');
      if (section) document.getElementById(section)?.scrollIntoView();
    };
    window.addEventListener('popstate', restoreSection);
    window.addEventListener('load', restoreSection);
    // Preserve credentials in copied links and links opened in another tab too.
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      const section = link.getAttribute('href').slice(1);
      if (document.getElementById(section)) link.setAttribute('href', '#' + new URLSearchParams({ invitasjon: token, section }));
    });
  }
  window.RsvpBridge = {
    hasToken: validToken,
    available: config.enabled === true && endpointOK,
    tokenFragment: validToken ? '#invitasjon=' + token : '',
    connect(frame, mode, callbacks = {}) {
      if (!this.available || !validToken || window.top !== window) return null;
      const channel = Array.from(crypto.getRandomValues(new Uint8Array(24)), n => n.toString(16).padStart(2, '0')).join('');
      let source = null, origin = null, ready = false, disposed = false;
      const googleOrigin = value => {
        try {
          const url = new URL(value);
          return url.protocol === 'https:' && (url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com' || url.hostname.endsWith('-script.googleusercontent.com'));
        } catch { return false; }
      };
      const timeout = setTimeout(() => {
        if (!ready) callbacks.error?.('Svarskjemaet kunne ikke lastes. Last siden på nytt eller kontakt oss.');
      }, 30000);
      function receive(event) {
        const data = event.data;
        if (disposed || !googleOrigin(event.origin) || !data || data.channel !== channel || data.app !== 'wedding-rsvp') return;
        if (!source && data.type === 'hello') { source = event.source; origin = event.origin; }
        if (!source || event.source !== source || event.origin !== origin) return;
        if (data.type === 'hello') source.postMessage({ app: 'wedding-rsvp', type: 'authorize', channel, token }, origin);
        if (data.type === 'profile') {
          ready = true; clearTimeout(timeout);
          if (Array.isArray(data.names) && data.names.every(n => typeof n === 'string' && n.length <= 120)) callbacks.profile?.(data.names);
        }
        if (data.type === 'height' && Number.isFinite(data.height)) frame.style.height = Math.min(12000, Math.max(160, data.height + 16)) + 'px';
        if (data.type === 'error') { clearTimeout(timeout); callbacks.error?.('Invitasjonen kunne ikke hentes. Kontroller lenken eller prøv igjen senere.'); }
      }
      window.addEventListener('message', receive);
      const url = new URL(config.endpoint);
      url.searchParams.set('parent', location.origin);
      url.searchParams.set('channel', channel);
      url.searchParams.set('mode', mode === 'profile' ? 'profile' : 'form');
      frame.referrerPolicy = 'no-referrer';
      frame.src = url.href; // The invitation secret is sent only after the verified handshake.
      return { dispose() { disposed = true; clearTimeout(timeout); window.removeEventListener('message', receive); frame.removeAttribute('src'); } };
    }
  };
})();
