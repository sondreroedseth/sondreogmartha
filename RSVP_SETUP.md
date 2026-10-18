# RSVP på marthaogsondre.no

Denne veiledningen kobler det nye svarskjemaet til et privat Google-regneark. Du trenger en vanlig Google-konto og tilgang til GitHub-prosjektet. Du skal ikke opprette abonnement eller legge inn betalingskort.

## Status og avgrensning

Det private RSVP-arket er opprettet på Google-kontoen. Tilgang er godkjent, og tilknyttet Apps Script er publisert som versjon 2. Faktisk lagring, gjenhenting, endring og sikkerhetskontroller er testet med tre fiktive gjester. Testgjestene og deres tilgang er fjernet. Se RSVP_TEST_REPORT.md for resultater og gjenstående kontroller. Lokale koblingsopplysninger finnes i den Git-ignorerte filen `private-rsvp/cloud-setup.private.json`.

Publisering er godkjent 18. oktober 2026. `rsvp-config.js` har `enabled: true`, og `endpoint` er fylt ut med den publiserte backend-adressen. Google Forms-knappen beholdes som reserve for besøk uten personlig kode eller ved feil. Gjennomfør den siste kontrollen på domenet etter publisering før lenkene sendes ut. Steg 1–4 nedenfor forklarer også hvordan oppsettet kan gjenskapes; ikke opprett et ekstra ark eller skript bare fordi du følger veiledningen.

Romtypevalg er utelatt etter ønske i første runde. Spørsmålet om ønske om overnatting er med. `Room type` beholdes som tom kolonne for eventuell senere utvidelse. Ingen ytterligere spørsmål fra det gamle Google-skjemaet er importert; innholdet der kunne ikke hentes under arbeidet.

Bruk filene i **github-repository**, som er GitHub-arbeidsmappen. Mappen **github-publisering** er en eldre kopi og er ikke oppdatert med denne løsningen.

## 1. Opprett et privat regneark

1. Åpne [Google Sheets](https://sheets.google.com) og opprett et tomt regneark.
2. Gi det navnet «Bryllup – RSVP».
3. Klikk **Del**. Under generell tilgang skal det stå **Begrenset**. Ikke publiser arket på nettet og ikke velg «Alle med linken».
4. Gi bare tilgang til dem som trenger å administrere gjestene. Alle med tilgang til arket vil kunne lese matbehov.
5. Adressen vil ligne `https://docs.google.com/spreadsheets/d/REGNEARK_ID/edit`. Kopier delen mellom `/d/` og `/edit`. Dette er regneark-ID-en.

## 2. Opprett Apps Script

1. I regnearket: velg **Utvidelser → Apps Script**.
2. Gi prosjektet navnet «Bryllup RSVP».
3. Åpne `Code.gs`, slett standardeksempelet og lim inn hele innholdet fra prosjektets `apps-script/Code.gs`.
4. Trykk **+** ved filer, velg **HTML**, og skriv **Rsvp** som navn. Google legger til `.html`. Slett standardinnholdet og lim inn hele `apps-script/Rsvp.html`. Navnet må ha stor R.
5. Under **Prosjektinnstillinger**: slå på visning av manifestfilen `appsscript.json` i redigeringsprogrammet.
6. Åpne manifestfilen og erstatt innholdet med prosjektets `apps-script/appsscript.json`. Den angir norsk tidssone, Sheets-tilgang og ingen automatisk unntakslogging fra appen.
7. Under **Prosjektinnstillinger → Skriptegenskaper**, legg til:

   | Egenskap | Verdi |
   | --- | --- |
   | `SPREADSHEET_ID` | Regneark-ID-en fra steg 1 |

8. Lagre prosjektet. Regneark-ID og senere invitasjonskoder skal ikke legges i nettsidens konfigurasjonsfil.

## 3. Gi tilgang og opprett fanene

Dette er allerede gjort i det opprettede arket. Ved et nytt oppsett:

1. Private funksjoner med avsluttende understrek vises ikke i funksjonslisten. Opprett derfor en midlertidig skriptfil `Oppsett.gs` med `function initialiserArk() { setup_(); }`.
2. Velg **initialiserArk** i funksjonslisten og klikk **Kjør** som eier.
3. Google vil be deg velge konto og gi skriptet tilgang til Google Sheets. Kontroller at det er ditt eget prosjekt og gjennomgå tilgangene. En eventuell godkjenning må utføres av kontoeieren.
4. Gå tilbake til regnearket. Du skal se **Invitations**, **Guests** og **Oversikt**.
5. Slett den midlertidige filen `Oppsett.gs` og lagre før du publiserer. Den skal aldri være med i en publisert versjon. Behold understreken i alle eksisterende hjelpefunksjoner.

`setup_` sletter ikke eksisterende svar. Hvis fanene har feil overskrifter, stopper funksjonen. Ikke bytt navn på fanene eller flytt kolonnene. Filtrering og sortering av **hele rader** går fint; aldri sorter én enkelt kolonne alene.

I Guests er de ti første kolonnene de du ba om:

| Kolonne | Innhold |
| --- | --- |
| A | Invitation ID |
| B | Guest ID |
| C | Name |
| D | Wedding – Ja/Nei |
| E | Friday – Ja/Nei |
| F | Allergies |
| G | Accommodation – Ja/Nei, tomt ved nei til bryllupet |
| H | Room type – foreløpig tom |
| I | RSVP status – Ikke svart/Svart |
| J | Last updated – dato og klokkeslett i norsk tid |

Kolonne N inneholder den private invitasjonslenken. Kolonne O, **Drikkepakke**, lagrer «Med alkohol» eller «Uten alkohol». Valget er obligatorisk ved ja til bryllupet og tømmes ved nei. Eksisterende svar har tomt drikkevalg til gjesten svarer på nytt. Ikke flytt disse kolonnene; serveren oppdaterer svarene og bevarer lenken.

Kolonnene K–M er skjulte tekniske felter som hindrer duplikater og overskriving av nyere svar. Ikke rediger dem manuelt. En endring oppdaterer samme gjesterad. Oversikt teller gjester, ikke antall hotellrom. For matbehov: bruk filteret i Guests, velg Wedding = Ja og filtrer Allergies på ikke-tomme verdier.

## 4. Lag invitasjoner uten personopplysninger i GitHub

1. Åpne `tools/generate-invitations.html` lokalt i Edge eller Chrome, for eksempel ved å dobbeltklikke filen. Den har ingen nettverkskall og ingen eksterne avhengigheter.
2. Behold `https://marthaogsondre.no/invitasjon.html` som nettadresse.
3. Skriv én invitasjon per linje. Bruk `|` mellom personer som deler invitasjon. Ikke bruk «og» som teknisk skilletegn.
4. Klikk **Lag invitasjonene**. Verktøyet lager tilfeldige 256-biters tilgangskoder med nettleserens kryptografiske generator, egne invitasjons-ID-er og stabile gjeste-ID-er.
5. Kopier hele første resultatfelt til første ledige rad i **Invitations**, i kolonne A. Ikke kopier over overskriftene. Resultatet skal fylle tre kolonner.
6. Kopier hele andre resultatfelt til første ledige rad i **Guests**, i kolonne A. Det skal fylle 15 kolonner; mange felt er tomme før gjesten har svart.
7. **Ta vare på private lenker fra det tredje feltet før du lukker verktøyet.** Lagre dem i et privat dokument utenfor GitHub- og publiseringsmappene. Det finnes ingen automatisk gjenoppretting av tilgangskoden fra kodehashen.
8. Kontroller at hver invitasjons-ID i Guests også finnes i Invitations, og at Name er korrekt for hver person.

Verktøyet lager helt nye ID-er og koder hver gang. Bruk det bare for nye invitasjoner. Ikke erstatt eksisterende rader med et nytt resultat når gjestene allerede har svart. Faktiske navn, personlige lenker og eksporter skal aldri legges i offentlige filer. `.gitignore` inneholder en ekstra sperre for `private-rsvp/` og filer som slutter på `.private.tsv` eller `.private.json`, men den erstatter ikke forsiktig filhåndtering.

Lenken vil ha formen `https://marthaogsondre.no/invitasjon.html#invitasjon=<tilfeldig-kode>`. Koden ligger i URL-fragmentet og sendes ikke i den vanlige HTTP-forespørselen til nettstedet. Ikke bruk ekte lenker i skjermbilder, supportsaker eller testlogger.

## 5. Publiser Apps Script – etter godkjenning

Dette er et eget publiseringstrinn. Ingen slik publisering er gjort av Codex.

1. I Apps Script: velg **Distribuer / Deploy → Ny distribusjon / New deployment**.
2. Velg type **Nettapp / Web app**.
3. **Kjør som / Execute as:** deg selv, altså eieren som har tilgang til regnearket.
4. **Hvem har tilgang / Who has access:** **Alle / Anyone**, også uten Google-innlogging. Hvis kontoen bare tillater interne brukere, vil gjester utenfor organisasjonen ikke komme inn. Bruk i så fall en konto som tillater anonyme nettapper eller få hjelp med et annet oppsett; ikke gjør regnearket offentlig.
5. Klikk **Distribuer** og fullfør Googles nødvendige tillatelser.
6. Kopier nettappadressen som slutter med **/exec**. Ikke bruk `/dev`; den er bare for utviklere.

At nettappen kan åpnes anonymt, gir ingen generell tilgang til regnearket. Alle funksjoner som leser eller lagrer gjestesvar kontrollerer invitasjonskoden på serveren. Regnearket forblir privat.

## 6. Koble nettsiden mot nettappen

I `rsvp-config.js` setter du `endpoint` til nettappadressen. Denne adressen er offentlig konfigurasjon, ikke et passord. Sett `enabled: true` **i testkopien** når du er klar til å teste. Ikke legg inn andre opplysninger i filen.

```js
window.RSVP_CONFIG = Object.freeze({
  enabled: true,
  endpoint: 'https://script.google.com/macros/s/DIN_DISTRIBUSJON/exec'
});
```

Innbyggingen tillater bare `https://marthaogsondre.no` og `https://www.marthaogsondre.no`. Hvis du vil teste den ekte Google-integrasjonen lokalt, legg midlertidig til **akkurat** adressen til den lokale testserveren, for eksempel `http://127.0.0.1:8766`, i `RSVP.origins` i Code.gs og distribuer en ny testversjon. Bruk en vanlig statisk server for denne testen, **ikke** mock-serveren i tests/preview.cjs. Fjern testadressen og oppdater distribusjonen før vanlig bruk.

En vanlig lokal fil med `file://` støttes ikke for selve RSVP-integrasjonen. Det lokale lenkeverktøyet kan derimot åpnes som fil.

Filene nettsiden trenger er:

- `index.html` og `invitasjon.html`, oppdatert i eksisterende prosjekt.
- `rsvp-config.js`, `rsvp-bridge.js` og `rsvp.js`, i samme mappe som hovedsiden.
- Eksisterende bilder, ønskelistefiler og øvrige ressurser beholdes.

Apps Script-filene legges i Google-editoren. De skal ikke kjøres av GitHub Pages. Ikke bytt hele nettstedet med en ny mal. Før eventuell GitHub-publisering må siste nettversjon sammenlignes med arbeidskopien, siden denne arbeidskopien kan være eldre enn senere endringer gjort andre steder.

Google Forms-knappen finnes fortsatt i HTML-en. Når det nye skjemaet er aktivert og en gyldig invitasjon er hentet, skjules den i den økten. Hvis løsningen er deaktivert, lenken mangler eller innlasting feiler, beholdes knappen som reserve. I overgangsperioden må dere derfor kontrollere svar i begge systemer og unngå at samme gjest svarer begge steder. Ingen Forms-svar er automatisk importert.

## 7. Test før gjestene får lenkene

Start med egne, tydelig merkede testgjester i det private arket. Bruk to personer på samme invitasjon og én på en annen. Ikke test med faktiske allergiopplysninger.

| Test | Hva du skal se |
| --- | --- |
| Åpne sikker invitasjon | Riktige navn på konvolutten; segl, blomster og nedtelling virker |
| Gå videre til hovedsiden | Samme sikre kode følger med, uten navn i nettadressen |
| Bruk menyen og last siden på nytt | Koden beholdes og svarene hentes igjen |
| Én gjest svarer ja | Matbehov og overnatting vises; ja-bekreftelsen kommer etter lagring |
| Én gjest svarer nei | Matbehov og overnatting skjules og tømmes på serveren; nei-bekreftelsen vises |
| To personer på samme invitasjon | Hver person kan svare og endre uavhengig av den andre |
| Endre et tidligere svar | Samme Guest ID og samme rad; oppdatert dato og ingen ekstra rad |
| Åpne i en annen nettleser | Tidligere svar hentes fra Sheets med den samme lenken |
| Åpne en annen invitasjon | Bare gjestene på denne invitasjonen vises |
| Endre kode til en ugyldig kode | Ingen navn eller svar blir hentet |
| Sett Active til FALSE | Lenken mister lese- og skrivetilgang også hvis skjemaet allerede var åpent |
| Lagre to ganger raskt | Ingen duplikatrad; knappen er deaktivert mens lagring pågår |
| To vinduer endrer samme gjest | En utdatert versjon avvises; hent siste svar før ny redigering |
| Flere invitasjoner sender samtidig | Hver gjest beholder sin egen rad; trafikkfeil vises tydelig hvis låsen er opptatt |
| Koble fra nett før innsending | Ingen falsk bekreftelse; feil eller melding om at lagring ikke kunne bekreftes |
| Koble til igjen og prøv identisk svar | En tapt kvittering kan prøves på nytt uten dobbelt lagring |
| Mobil | Lesbare felter og knapper, ingen vannrett rulling, hele skjemaet er tilgjengelig |
| Gammel ?gjest=-lenke | Det opprinnelige invitasjonsdesignet fungerer; ingen private RSVP-data gis ut via navnet |
| Øvrig nettsted | Program, transport, FAQ, ønskeliste og eksisterende lenker fungerer |

For fristtesten: bruk en **separat testkopi** av Apps Script og regnearket, og sett `RSVP.deadline` i fortiden i den kopien. Test at eksisterende svar kan leses og at både nye svar og endringer avvises. Test også grensen rett før og på fristen. Endre ikke datamaskinens klokke; det er serverklokken som avgjør. I produksjonskoden skal fristen være `2027-01-04T00:00:00+01:00`, altså etter hele 3. januar norsk tid. En gjentakelse av en allerede lagret innsending kan fortsatt få sin kvittering etter fristen; den gjør ingen ny endring.

Test også ekte Google-innbygging i privat nettleservindu, på mobil og med vanlige nettleserinnstillinger. Den lokale forhåndsvisningen bruker en erstatning for Google og beviser ikke at anonym tilgang, Google-rammer og kontoinnstillinger fungerer i den ekte distribusjonen.

## 8. Aktivering og overgang fra gamle lenker

1. Fullfør testlisten mot din Google-distribusjon og kontroller faktiske rader i Sheets.
2. Avklar eventuelle Forms-svar som allerede er kommet inn. Ikke anta at den nye løsningen kjenner disse.
3. Godkjenn publisering av endringene på nettsiden.
4. Publiser nettsidefilene med riktig offentlig nettappadresse og `enabled: true`.
5. Kontroller en ekte testinvitasjon etter publisering før dere sender gjestelenker.
6. Send de nye sikre lenkene til riktige mottakere. Gamle navnelinker kan fortsatt vise invitasjonen, men gir ikke tilgang til historiske RSVP-svar.

Ikke send private invitasjonslenker via Codex eller andre verktøy med mindre du ønsker dette uttrykkelig. Lenken er tilgangsnøkkelen til hele invitasjonen. Hvis en person ikke skal kunne se andre personers matbehov, gi vedkommende en egen invitasjon.

## 9. Vedlikehold

- **Nye gjester:** lag kun nye invitasjoner i det lokale verktøyet, og lim inn på nye rader. Ikke regenerer eksisterende ID-er.
- **Rette et navn:** rett Name i Guests. Behold Invitation ID og Guest ID.
- **Mistet eller lekket lenke:** sett Active til FALSE umiddelbart. Lag en ny kode i det lokale verktøyet. For å beholde alle svar: kopier kun den nye kodehashen til den eksisterende Invitations-raden, behold den gamle invitasjons-ID-en, og sett Active til TRUE. Den nye lenken bruker den nye koden; de midlertidig genererte ID-ene og gjesteradene skal ikke importeres i dette tilfellet. Den gamle koden slutter å virke.
- **Apps Script-oppdatering:** rediger filene i editoren, lagre, velg **Distribuer → Administrer distribusjoner → blyant → Ny versjon → Distribuer**. Ved oppdatering av samme distribusjon beholder du normalt `/exec`-adressen. Bruker du en helt ny distribusjon, må `endpoint` oppdateres på nettstedet.
- **Frist:** håndheves på serveren ved hver ny lagring. En eventuell utvidelse må gjøres i Code.gs og distribueres som ny versjon. Oppdater også tekstene på nettstedet og i skjemaet.
- **Problemer med innbyggingen:** kontroller eksakt domene, nettappadressen, filnavnet Rsvp, tilgang for anonyme gjester og den nyeste distribuerte versjonen. Åpning av `/exec` direkte viser med hensikt bare en beskjed; skjemaet krever en godkjent foreldreside og en sikker håndtrykksekvens.
- **Tilbakerulling:** sett `enabled: false` og publiser konfigurasjonsfilen etter godkjenning. Da vises Google Forms igjen. Eksisterende Sheets-svar beholdes. Ved sikkerhetshendelse må du også deaktivere nettappdistribusjonen hos Google; en endring på nettsiden alene stenger ikke serveren.
- **Sikkerhetskopi:** oppbevar en privat kopi av regnearket. Kontroller at delingsinnstillingene fortsatt er begrenset.
- **Matbehov etter bryllupet:** slett disse når dere ikke lenger trenger dem, også i egne eksporter og sikkerhetskopier. Fjern nettappdistribusjonen når løsningen ikke skal brukes mer. Googles versjonshistorikk og eventuelle lagringsregler kan beholde tidligere innhold; sletting av en celle er ikke en garanti for at alle eldre kopier er borte.

## 10. Teknisk løsning og begrensninger

Skjemaet bruker Apps Script HTML Service og `google.script.run` i en innebygd ramme. Det brukes ikke `fetch(..., {mode: 'no-cors'})`, JSONP eller en uleselig HTTP-respons som bevis på lagring. Nettsiden får bare navn til invitasjonsvisning og høyde til tilpasning; matbehov går ikke i meldinger til hovedsiden.

Apps Script krever `ALLOWALL` for innbygging. Derfor avhenger beskyttelsen av denne kombinasjonen: serveren godtar bare forhåndsbestemte foreldredomener; rammen laster ingen gjesteopplysninger før en melding fra riktig toppvindu og riktig origin; toppsiden starter ikke koblingen hvis den selv er innrammet; og en tilfeldig kanal binder meldingene til riktig Google-ramme. Invitasjonskoden sendes først etter dette håndtrykket, aldri i iframe-adressen. Hvert kall validerer koden på nytt på serveren. Ikke fjern origin-, source- eller kanalkontrollene.

Invitations inneholder SHA-256-hasher av de tilfeldige kodene, ikke selve kodene. De private lenkene må likevel oppbevares trygt. Alle på én invitasjon kan se alle svarene innen den invitasjonen. Det er ingen innlogging eller identitetskontroll utover besittelse av lenken, og en videresendt lenke gir samme tilgang.

Serveren kontrollerer gjestetilhørighet, obligatoriske ja/nei-valg, tekstlengder, frist, revisjon og gjentatte innsendinger. En script-lås samordner lesing og skriving fra denne løsningen. Den hindrer ikke manuelle arkendringer eller andre skript; unngå å redigere svar og tekniske felt mens gjester svarer. Ved låsekonflikt etter ventetid returneres en feilmelding fremfor en ukontrollert endring. Dette er et lite RSVP-system, ikke en database med full transaksjonslogg.

Google behandler og lagrer opplysningene gjennom Sheets og Apps Script. Løsningen har ingen ekstra egen kryptering av matbehov. Ikke legg til analytics, logging av forespørsler eller permanent nettleserlagring av svar. Koden logger ikke invitasjonskoder eller matbehov; Google kan likevel ha egne tjenestelogger. Det er ingen automatiske e-poster i første versjon.

Apps Script har kvoter og ingen avtalt oppetid for denne gratisløsningen. Den er ment for et vanlig bryllup med noen hundre gjester som svarer fordelt over tid. Anonym offentlig tilgang betyr også at uønsket trafikk kan bruke kvoter, selv om den ikke kjenner gjestekodene. Ved større trafikk eller krav til sterkere misbruksvern bør en separat tjeneste med hastighetsbegrensning vurderes; ingen slik tjeneste er opprettet nå.

Offisiell dokumentasjon:

- [Apps Script-nettapper og distribusjon](https://developers.google.com/apps-script/guides/web)
- [Kommunikasjon og private funksjoner](https://developers.google.com/apps-script/guides/html/communication)
- [Rammeinnstillinger og ansvar for clickjacking-beskyttelse](https://developers.google.com/apps-script/reference/html/x-frame-options-mode)
- [Låsing ved samtidige forespørsler](https://developers.google.com/apps-script/reference/lock/lock-service)
- [Kvoter og begrensninger](https://developers.google.com/apps-script/guides/services/quotas)

## 11. Lokale utviklertester

Med Node.js installert, fra github-repository:

```text
node --test tests/rsvp.test.cjs
node tests/preview.cjs
```

Den andre kommandoen starter en lokal testserver på `http://127.0.0.1:8765`, med fiktive gjester og minnelagring. Den viser en testlenke i terminalen. Serveren endrer bare svarene den sender til nettleseren; produksjonskonfigurasjonen og Google blir ikke endret. Koden som tillater localhost finnes bare i testserverens respons, ikke i produksjonsbroen. Stopp serveren med Ctrl+C etter bruk.

Automatiske tester kjører den faktiske Code.gs med erstatninger for Google Sheets, klokke og lås. De dekker ja/nei, forskjellige svar på samme invitasjon, endring, duplikater, ugyldige og deaktiverte koder, andre gjesters ID-er, validering, formelinjeksjon, revisjonskonflikt, låsekonflikt, frist og lagringsfeil. Dette erstatter ikke samtidighetstesting eller lagringskontroll på ekte Google-infrastruktur. Se også RSVP_TEST_REPORT.md.
