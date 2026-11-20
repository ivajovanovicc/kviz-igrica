# Kviz igrica

Online kviz igrica u browseru, sa šest igara: Slagalica, Moj broj, Spojnice, Skočko, Ko zna zna i Asocijacije.

Trenutno rade (za jednog igrača): **Slagalica**, **Moj broj** i **Skočko**.

## Pokretanje na svom računaru

Potreban je [Node.js](https://nodejs.org) 20 ili noviji.

```bash
npm install
npm run dev
```

Zatim otvori http://localhost:5173 u browseru.

## Struktura

- `server/`: Node.js + Express backend. Svaka igra ima svoj modul u `server/src/games/<igra>/`.
- `client/`: React frontend (Vite). Svaka igra ima svoj ekran u `client/src/games/<igra>/`.

Server čuva tačna rešenja i proverava odgovore, da igrač ne bi mogao da vara iz browsera.

## Ostale komande

- `npm test`: pokreće testove logike igara
- `npm run build`: pravi produkcijsku verziju
- `npm start -w server`: pokreće produkcijsku verziju na http://localhost:3001

## Rečnik za Slagalicu

Spisak reči je u `server/data/slagalica/reci.txt` (jedna reč po redu). Možeš ručno da dodaješ ili brišeš reči.
Napravljen je iz otvorenog rečnika za proveru pisanja na srpskom
([dictionary-sr-latn](https://github.com/wooorm/dictionaries), zasnovan na projektu „Provera pisanja“ Gorana Rakića),
koji je objavljen pod licencama LGPL 2.1 / MPL 1.1 / GPL 2.0 / CC BY-SA 3.0.

Da ponovo napraviš spisak iz rečnika: `node scripts/build-dictionary.mjs`
