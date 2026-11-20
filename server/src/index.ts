import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { slagalicaRouter } from "./games/slagalica/routes.js";
import { mojBrojRouter } from "./games/moj-broj/routes.js";
import { spojniceRouter } from "./games/spojnice/routes.js";
import { skockoRouter } from "./games/skocko/routes.js";
import { koZnaZnaRouter } from "./games/ko-zna-zna/routes.js";
import { asocijacijeRouter } from "./games/asocijacije/routes.js";
import { setupMatches } from "./match/match.js";

const app = express();
app.use(express.json());

// Svaka igra je poseban modul sa svojim rutama (modularni monolit)
app.use("/api/slagalica", slagalicaRouter);
app.use("/api/moj-broj", mojBrojRouter);
app.use("/api/spojnice", spojniceRouter);
app.use("/api/skocko", skockoRouter);
app.use("/api/ko-zna-zna", koZnaZnaRouter);
app.use("/api/asocijacije", asocijacijeRouter);

// U produkciji server servira i gotov frontend
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
app.use(express.static(clientDist));

// Igra u dvoje ide preko Socket.io veze (stalna veza između browsera i servera)
const server = http.createServer(app);
setupMatches(new Server(server));

const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, () => console.log(`Server radi na http://localhost:${PORT}`));
