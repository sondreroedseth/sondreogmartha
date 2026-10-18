# RSVP – testrapport

Dato: 18. oktober 2026. Privat Google-ark er opprettet og Apps Script er distribuert som versjon 2 etter godkjenning. Nettsiden er fortsatt deaktivert i konfigurasjonen, og ingen GitHub-push eller publisering av nettsiden er utført.

Senere samme dag godkjente eieren publisering for testing på domenet. Konfigurasjonen er aktivert, de nyeste endringene fra origin/main er bevart, og de 18 automatiske testene består også med produksjonskonfigurasjonen. Den siste kontrollen av publisert domene skal dokumenteres etter distribusjon.

Publiseringskontroll: GitHub main og marthaogsondre.no er oppdatert. En egen testinvitasjon hentet to navn fra Google, seglet åpnet, og lenken videre bevarte invitasjonskoden. Hovedsidens ekte Google-skjema viste begge navnene. Ja, fredag ja, fiktivt matbehov og overnatting ja ble sendt fra domenet; bekreftelse kom etter lagring, og verdiene ble kontrollert direkte i Sheets med revisjon 1. Testsvaret ble deretter nullstilt. Ved mobilbredde 390 px målte hovedsiden ingen vannrett overflyt; skjemaets innhold var 327 px bredt uten overflyt og rammehøyden fulgte innholdet. Skjemaet og bekreftelsen er visuelt kontrollert. To tydelig merkede testgjester beholdes midlertidig for eierens egen testing, i tillegg til den faktiske gjestelisten. Testlenken og gjesteregisteret ligger kun i private, Git-ignorerte filer. Privat nettleservindu og fysisk mobil er fortsatt ikke kontrollert.

## Automatiske tester

Kommando: `node --test tests/rsvp.test.cjs` fra github-repository.

**18 tester bestått.** Testene kjører den faktiske Apps Script-koden i et isolert JavaScript-miljø med erstatninger for Google Sheets, lås og serverklokke. De kontrollerer:

- Henting av bare egne gjester og stabile gjeste-ID-er.
- Ja/nei og ulike svar fra to personer på samme invitasjon.
- Tømming av matbehov og overnatting ved nei til bryllupet.
- Endring av samme rad og identiske gjentatte innsendinger uten duplikater.
- Ugyldige, deaktiverte og navnebaserte tilgangskoder.
- Avvisning av andre invitasjoners gjeste-ID-er; innsendte navn og invitasjons-ID-er kan ikke endre eierskap.
- Ja/nei-valg, tekstlengde og datatyper, revisjon og forespørsels-ID.
- Sperring av regnearkformler i brukeroppgitt tekst.
- Revisjonskonflikter og endring av tidligere innsendt forespørselsinnhold.
- Oppdatering av forskjellige invitasjoner og kontrollert feil ved opptatt lås.
- Serverfrist i Europe/Oslo, også når fristen passeres før låsen blir tilgjengelig.
- Lagringsfeil uten suksessretur og frigivelse av låsen.
- Tvetydige gjesterader og kodehasher avvises.
- Kun tre offentlige gjestefunksjoner: doGet, getInvitation og saveGuest.
- Meldingsbroens origin-, kanal- og source-kontroll, ingen kode i iframe-adressen og sperre når hovedsiden er innrammet.
- Bevaring av invitasjonskode ved seksjonsnavigasjon.
- doGet avviser ukjente foreldredomener og bygger et skall uten gjesteopplysninger.
- JavaScript og innebygde skript kan parses; produksjonskonfigurasjonen er deaktivert og Google Forms-lenken beholdt.

`git diff --check` er også kjørt uten diff-feil.

## Manuell test i nettleser

Testserver: `node tests/preview.cjs`. Den bruker fiktive gjester, minnelagring og en lokal erstatning for Google-rammen. Dette tester det leverte skjemaet og invitasjonssidene, men ikke Google-infrastrukturen.

| Kontroll | Resultat |
| --- | --- |
| Hovedsidens RSVP-seksjon | Viser integrert skjema i eksisterende design |
| Første gjest svarer ja, fredag ja, overnatting ja og et fiktivt matbehov | Lagret i mock-backend; riktig ja-bekreftelse |
| Andre gjest på samme invitasjon svarer nei og fredag nei | Uavhengig svar; riktig nei-bekreftelse; ingen mat-/hotellfelt |
| Simulert lagringsfeil | Feilmelding; ingen ny suksessbekreftelse; nytt forsøk virker |
| Oppdatering av siden | Begge tidligere svar hentes; invitasjonskoden beholdes |
| Redigering av tidligere fredagsdeltakelse | Viser ulagret endring, deretter lagret endring og bekreftelse |
| Tastaturnavigasjon | Tab når feltene og lagringsknappen; Enter sender svar |
| Menylenke til RSVP | Koden beholdes i nettadressen |
| Mobilbredde 390 piksler | Ingen vannrett overflyt; felter og valg er lesbare |
| Skrivebordsbredde 1280 piksler | Skjemaet holder en avgrenset bredde i midten |
| Sikker invitasjonslenke | Begge navn hentes til konvolutten |
| Åpne seglet | Eksisterende åpning og blomsteranimasjon virker; innholdet blir tilgjengelig |
| Lenke videre til hovedsiden | Sikker kode følger med uten gjestenavn |
| Gammel navnelink | Personalisert konvolutt og åpneknapp virker fortsatt |
| Ugyldig sikker kode ved sideinnlasting | Ingen gjestenavn eller svar; feilmelding og Google Forms-reserve |
| Lokalt lenkeverktøy | To invitasjoner gir to kodehasher og tre separate gjesterader; lenker har tilfeldige koder |

Skjermbilder med fiktive data ligger i den lokale mappen rsvp-leveranse ved siden av github-repository. De er ikke personlige invitasjoner.

## Testet mot faktisk Google Apps Script og Sheets

Arket er et native Google-regneark med bare eiertilgang, filtre, skjulte tekniske kolonner, norsk datoformat og Europe/Oslo. Kildekode, HTML og manifest er kontrollert ved innliming. Backend kjører som eier med anonym tilgang til webappen; selve regnearket er privat.

Tre fiktive gjester fordelt på to invitasjoner ble lagt inn midlertidig. Følgende er bekreftet:

- Faktisk innbygging gjennom Googles nestede rammer, håndtrykk og automatisk høyde fra lokal forhåndsvisning med midlertidig tillatt lokaladresse.
- Ja og nei fra to gjester på samme invitasjon, individuelle bekreftelser og korrekt lagring lest tilbake gjennom Sheets-koblingen.
- Tidligere svar ved ny innlasting; en annen invitasjon viste bare sin egen gjest.
- Endring fra ja til nei oppdaterte samme rad til revisjon 2 og tømte matbehov og overnatting.
- Et annet vindu med gammel revisjon fikk konfliktfeil og overskrev ikke nyere svar.
- Oversiktens seks tellinger samsvarte med testdataene.
- Anonym HTTP-forespørsel uten Google-informasjonskapsler fikk webappens skall uten innloggingskrav. Full innsending i privat nettleservindu gjenstår.
- En midlertidig, upublisert kontroll i Google-editoren kjørte 16 kontroller mot faktisk Sheets: egen invitasjon, ukjent kode, ja/nei, identisk gjentakelse uten ny revisjon eller dato, endret gjentakelse, gammel revisjon, fremmed gjeste-ID, ugyldige valg, tekstgrense, formelbeskyttelse og deaktivert kode. Fristen ble testet ved å overstyre Date.now kun i denne kjøringen; ny lagring ble avvist etter fristen, mens identisk tidligere lagret forespørsel kunne bekreftes. Testen gjenopprettet sin opprinnelige fiktive rad i finally.

Testfunksjon og midlertidig lokaladresse er fjernet fra Google-koden. Versjon 2 bruker kun de to produksjonsdomenene. Testgjester og invitasjonsregistre er tømt, og oversikten viser null. Ingen faktiske gjester eller allergiopplysninger ble brukt.

## Må fortsatt verifiseres før aktivering

- Full brukerflyt på publisert domene, mobil og privat nettleservindu. Mobil og invitasjonsanimasjoner er testet lokalt med erstatningsbackend; faktisk Google-flyt er testet på skrivebord.
- To eller flere bevisst samtidige innsendinger mot Google. Lås og konflikter er automatisk testet, og faktisk konflikt mellom vinduer er bekreftet; nøyaktig overlappende Google-kjøringer er ikke dokumentert.
- Reelt nettverksavbrudd etter Google-lagring. Identisk retry er bekreftet mot Google, og feilvisning er testet lokalt.
- Innlegging og kontroll av den faktiske gjestelisten og personlige lenker.
- Sammenlign med siste publiserte nettside/GitHub-versjon før publisering, slik at nyere endringer bevares.
- Avklar eventuelle tidligere Google Forms-svar ved overgang; de er ikke importert.

Følg RSVP_SETUP.md før `enabled` settes til true på den publiserte nettsiden. Google Forms beholdes frem til overgangen er godkjent.
