import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { skockoRouter } from "./games/skocko/routes.js";

const app = express();
app.use(express.json());

// Svaka igra je poseban modul sa svojim rutama (modularni monolit)
app.use("/api/skocko", skockoRouter);

// U produkciji server servira i gotov frontend
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
app.use(express.static(clientDist));

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => console.log(`Server radi na http://localhost:${PORT}`));
