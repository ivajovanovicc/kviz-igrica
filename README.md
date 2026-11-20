# Kviz igrica

Online kviz igrica u browseru, sa šest igara: Slagalica, Moj broj, Spojnice, Skočko, Ko zna zna i Asocijacije.

Trenutno radi: **Skočko** (za jednog igrača).

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
