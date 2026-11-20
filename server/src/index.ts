import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { skockoRouter } from "./games/skocko/routes.js";
import { mojBrojRouter } from "./games/moj-broj/routes.js";
import { slagalicaRouter } from "./games/slagalica/routes.js";
import { spojniceRouter } from "./games/spojnice/routes.js";
import { koZnaZnaRouter } from "./games/ko-zna-zna/routes.js";
import { asocijacijeRouter } from "./games/asocijacije/routes.js";

const app = express();
app.use(express.json());

// Svaka igra je poseban modul sa svojim rutama (modularni monolit)
app.use("/api/slagalica", slagalicaRouter);
app.use("/api/spojnice", spojniceRouter);
app.use("/api/skocko", skockoRouter);
app.use("/api/ko-zna-zna", koZnaZnaRouter);
app.use("/api/asocijacije", asocijacijeRouter);
app.use("/api/moj-broj", mojBrojRouter);

// U produkciji server servira i gotov frontend
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
app.use(express.static(clientDist));

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => console.log(`Server radi na http://localhost:${PORT}`));
