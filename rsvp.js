(() => {
  'use strict';
  const bridge = window.RsvpBridge;
  const box = document.querySelector('#rsvp-integrated');
  const fallback = document.querySelector('#rsvp-legacy');
  if (!bridge?.available) return;
  box.hidden = false;
  const status = document.querySelector('#rsvp-loading');
  if (!bridge.hasToken) {
    status.textContent = 'Åpne den personlige invitasjonslenken for å hente navn og tidligere svar. Kontakt oss hvis du trenger en ny lenke.';
    return;
  }
  const frame = document.querySelector('#rsvp-frame');
  frame.hidden = false;
  bridge.connect(frame, 'form', {
    profile() { status.hidden = true; frame.hidden = false; fallback.hidden = true; },
    error(message) { status.hidden = false; status.textContent = message; frame.hidden = true; fallback.hidden = false; }
  });
})();
