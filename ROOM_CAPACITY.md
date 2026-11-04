# Romkapasitet

Grensene i `RSVP.roomLimits` er 12 Dobbeltrom, 30 Superior Dobbeltrom og
10 Enkeltrom. Brukte rom beregnes fra gjeldende rader i `Guests` hver gang
invitasjonen hentes og svar lagres. Ingen separat teller må oppdateres manuelt.

Tellingen bruker Wedding (D) = Ja, Accommodation (G) = Ja og Room type (H).
Hver invitasjon grupperes per romtype. Enkeltrom teller per person;
dobbeltrom teller ett rom per påbegynt par innen samme invitasjon.
Tre gjester som ønsker dobbeltrom bruker dermed to rom. Personer fra ulike
invitasjoner deler ikke automatisk rom. Begge oppholdsvalgene omfatter lørdag,
så antall rom lørdag bestemmer kapasiteten for hele helgen.

Før publisering må eksisterende overnattingssvar uten romtype avklares og få
romtype i kolonne H. Rader uten romtype kan ikke knyttes til en romkategori.
Reservasjoner gjort utenfor svarskjemaet må også være ført i gjestelisten
med riktig invitasjon, overnatting og romtype for å inngå i tellingen.

Fullbookede valg skjules for nye reservasjoner. Den aktuelle invitasjonens
allerede registrerte rom regnes med i tilgjengelig kapasitet for egne endringer.
Rom frigjøres når overnatting avbestilles eller romtype endres.
Nettleseren oppdaterer tilgjengelighet hvert 30. sekund. `saveInvitation`
kontrollerer hele innsendingens rombehov under samme Apps Script-lås før noen
rader skrives. En annen innsending kan derfor ikke ta siste rom mellom kontroll
og lagring. Gjesten får ikke bekreftelse før alle skriverader og flush er ferdige.
Dette er ikke en database-transaksjon: ved en tjenestefeil midt i flere skriverader
kan noen svar være lagret. Samme innsending kan prøves igjen idempotent;
feilmeldingen ber også gjesten kontrollere siste lagrede svar.

Ingen navn eller svar fra andre invitasjoner sendes til nettleseren; bare
kapasitet per romtype. Ingen reelle gjestelistedata brukes i forhåndsvisningen.

Publisert 4. november 2026 som Apps Script-versjon 5 på eksisterende nettappadresse.
`Code.gs` og `Rsvp.html` deployes sammen. Nettsidens GitHub-deploy alene oppdaterer ikke skjemaet.
Romoversikt i Google-arket viser romgrenser og formler som speiler serverens telling.

Oppdatert 4. november 2026: 10 enkeltrom à 1250 kr, 12 dobbeltrom à 1550 kr og 30 superior dobbeltrom à 1850 kr per natt, inkl. frokost. Samme pris per natt ved ett og to døgn.
