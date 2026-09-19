import next from "next";
import { createServer } from "node:http";
const port = Number(process.env.PORT || 3030);
const app = next({ dev: process.env.NODE_ENV !== "production", hostname: "127.0.0.1", port });
await app.prepare();
const handler = app.getRequestHandler();
createServer((request, response) => { handler(request, response).catch(() => { response.statusCode = 500; response.end("Internal server error"); }); }).listen(port, "127.0.0.1", () => console.log(`TradeCo-Pilot: http://localhost:${port}`));
