/* Public page counts only. Never send invitation parameters or RSVP data. */
(function () {
  'use strict';
  if (window.location.protocol !== 'https:' ||
      !['marthaogsondre.no', 'www.marthaogsondre.no'].includes(window.location.hostname) ||
      window.self !== window.top) return;

  var pages = ['/', '/index.html', '/invitasjon.html', '/onskeliste.html'];
  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };
  window.va('beforeSend', function (event) {
    if (event.type !== 'pageview') return null;
    try {
      var url = new URL(event.url);
      if (url.origin !== window.location.origin || !pages.includes(url.pathname)) return null;
      // Rebuild from the public path, excluding every query parameter and fragment.
      return { type: 'pageview', url: url.origin + url.pathname };
    } catch (_) {
      return null;
    }
  });

  var script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  document.head.appendChild(script);
}());
