# Kviz igrica

Online kviz igrica u browseru, sa šest igara: Slagalica, Moj broj, Spojnice, Skočko, Ko zna zna i Asocijacije.

Trenutno radi:
- **Vežbanje**: svaka igra posebno, za jednog igrača
- **Igra u dvoje preko linka**: jedan igrač napravi partiju i pošalje link, drugi uđe i igraju svih šest igara redom

Kasnije: nasumičan protivnik, samostalna partija sa poređenjem sa računarom, redizajn.

## Pokretanje na svom računaru

Potreban je [Node.js](https://nodejs.org) 20 ili noviji.

```bash
npm install
npm run dev
```

Zatim otvori http://localhost:5173 u browseru.

## Igra u dvoje

Svaka igra se igra dva puta: Slagalica, Moj broj, Skočko, Ko zna zna, Spojnice, Asocijacije (ukupno 12 rundi).
Prva runda svake igre je "igra" igrača 1 (koji je napravio partiju), druga igrača 2 ("moja igra"):
vlasnik runde pobeđuje kad je izjednačeno, a u igrama na smenu igra prvi.

- **Slagalica**: 1 poen po slovu ispravne reči. Duža reč +6 (iste dužine: vlasnik runde).
  Vlasnik runde dobija još +3 ako je našao reč dugačku kao najduža reč kompjutera.
  Posle igre se vide obe reči i reč kompjutera.
- **Moj broj**: poene dobija samo bliži rezultat: tačan broj 10, inače 5 (isto blizu: vlasnik runde).
  Posle igre se vide rezultati i izrazi oba igrača, a ako niko nije pogodio i rešenje kompjutera.
- **Skočko**: kombinaciju pogađa vlasnik runde (6 pokušaja, 90 s), protivnik gleda. Pogodak u 1. ili 2. pokušaju 20,
  u 3. ili 4. 15, u 5. ili 6. 10 poena. Ako vlasnik ne pogodi, protivnik ima jedan pokušaj (15 s) za 5 poena.
- **Ko zna zna**: oba igrača istovremeno vide isto pitanje. Brži tačan odgovor +6, netačan −3.
- **Spojnice**: za svaki pojam prvo pokušava vlasnik runde (6 s); ako promaši, isti pojam pokušava protivnik. 2 poena po paru.
  Na kraju se parovi poređaju: spojeni u boji igrača, nespojeni žuti.
- **Asocijacije** se igraju na smenu, na zajedničkoj tabli. Prvi igra vlasnik runde.
- Igrači imaju boje: igrač 1 plava, igrač 2 crvena. Ako igrač osveži stranicu, vraća se u istu partiju.

Na lokalnom računaru drugi igrač se može probati u incognito prozoru. Za igru sa nekim preko interneta igricu treba
postaviti na hosting.

## Struktura

- `server/`: Node.js + Express backend. Svaka igra ima svoj modul u `server/src/games/<igra>/`, a igra u dvoje (Socket.io) je u `server/src/match/`.
- `client/`: React frontend (Vite). Svaka igra ima svoj ekran u `client/src/games/<igra>/`.

Server čuva tačna rešenja i proverava odgovore, da igrač ne bi mogao da vara iz browsera.

## Ostale komande

- `npm test`: pokreće testove logike igara
- `npm run build`: pravi produkcijsku verziju
- `npm start -w server`: pokreće produkcijsku verziju na http://localhost:3001

## Sadržaj igara („baza“)

Za sada je sadržaj u JSON fajlovima u `server/data/`. Možeš da ih menjaš i dopunjuješ ručno:

- `spojnice/spojnice.json`: teme sa po 8 parova
- `ko-zna-zna/pitanja.json`: pitanja sa jednim tačnim i tri netačna odgovora (igra bira 10 nasumičnih)
- `asocijacije/asocijacije.json`: 4 kolone po 4 polja + rešenja; u `prihvata` idu dodatni prihvatljivi odgovori

Odgovori u Asocijacijama se prihvataju bez obzira na velika slova i kvačice (npr. „skola“ = „Škola“).
Posle izmene fajla treba ponovo pokrenuti server.

## Rečnik za Slagalicu

Spisak reči je u `server/data/slagalica/reci.txt` (jedna reč po redu). Možeš ručno da dodaješ ili brišeš reči.
Napravljen je iz otvorenog rečnika za proveru pisanja na srpskom
([dictionary-sr-latn](https://github.com/wooorm/dictionaries), zasnovan na projektu „Provera pisanja“ Gorana Rakića),
koji je objavljen pod licencama LGPL 2.1 / MPL 1.1 / GPL 2.0 / CC BY-SA 3.0.

Da ponovo napraviš spisak iz rečnika: `node scripts/build-dictionary.mjs`
