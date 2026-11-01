# Besøksstatistikk

Nettsiden bruker Vercel Web Analytics for telling av besøk på hovedsiden,
invitasjonen og ønskelisten. Utseendet påvirkes ikke.

Aktiver Web Analytics i Vercel-prosjektet før publisering. Etter aktivering må
prosjektet deployes på nytt. Oversikten finnes under prosjektets Analytics-fane.
Statistikken starter når integrasjonen er aktiv, og gir ikke historiske besøkstall.

`analytics.js` laster bare statistikk på HTTPS på marthaogsondre.no eller
www.marthaogsondre.no, utenfor iframes. Lokale forhåndsvisninger telles ikke.
`beforeSend` tillater bare sidevisninger for de fire offentlige sidestiene.
Alle URL-parametre og fragmenter fjernes før sending, inkludert gjestenavn og
invitasjonskoder. Egendefinerte hendelser og hendelsesdata avvises.
Svarskjemaet og Apps Script inneholder ingen statistikkode.

Kontroll: `node --test tests/analytics.test.cjs tests/rsvp.test.cjs`.

Dokumentasjon: https://vercel.com/docs/analytics/quickstart og
https://vercel.com/docs/analytics/redacting-sensitive-data
