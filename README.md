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

- Oba igrača dobijaju isti zadatak u isto vreme.
- **Slagalica**: duža ispravna reč nosi 2 poena po slovu (iste dužine: oba igrača dobijaju poene).
- **Moj broj**: tačan broj 10 poena; ako niko nije pogodio, bliži dobija 5.
- **Skočko, Ko zna zna**: svako dobija poene koje je sam osvojio.
- **Spojnice** se igraju na smenu, u dve polovine sa različitim temama: jedan igrač spaja redom (jedan pokušaj po pojmu, 6 s),
  a promašene parove zatim pokušava protivnik. U drugoj polovini je obrnuto. 2 poena po paru.
- **Asocijacije** se igraju na smenu, na zajedničkoj tabli: igrač na potezu otvori polje, pa pogađa ili predaje potez.
  Tačan odgovor: ostaje na potezu. Promašaj ili isteklo vreme (15 s): potez prelazi na protivnika.
  Prvi igra onaj ko ima manje poena. Cela igra traje najviše 4 minuta.
- Ako igrač osveži stranicu, vraća se u istu partiju.

Na lokalnom računaru link radi samo na tom računaru. Za igru sa nekim preko interneta igricu treba postaviti na hosting.

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
