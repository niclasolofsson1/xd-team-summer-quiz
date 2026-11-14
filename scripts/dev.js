// npm run dev: the quiz server (port 4173) and the Vite dev server (port 5173) together.
// Vite passes /api and /events through to the quiz server (vite.config.mjs).
// Player: http://localhost:5173/participant.html · Host: http://localhost:5173/host.html · Big screen: http://localhost:5173/display.html
const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.join(__dirname, "..");
const children = [
  spawn(process.execPath, ["--watch", "server.js"], { cwd: root, stdio: "inherit" }),
  spawn(process.execPath, [path.join(root, "node_modules", "vite", "bin", "vite.js")], { cwd: root, stdio: "inherit" })
];

function stopAll() {
  for (const child of children) if (child.exitCode === null) child.kill();
}

for (const child of children) child.on("exit", () => { stopAll(); process.exit(); });
process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);
