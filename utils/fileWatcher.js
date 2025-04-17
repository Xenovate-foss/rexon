import chokidar from "chokidar";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..", "server");

export function initFileWatcher(io) {
  const watcher = chokidar.watch(rootDir, {
    persistent: true,
    ignoreInitial: true,
    depth: 10,
  });

  watcher
    .on("add", (path) => io.emit("file-update", { type: "add", path }))
    .on("unlink", (path) => io.emit("file-update", { type: "unlink", path }))
    .on("change", (path) => io.emit("file-update", { type: "change", path }))
    .on("addDir", (path) => io.emit("file-update", { type: "addDir", path }))
    .on("unlinkDir", (path) =>
      io.emit("file-update", { type: "unlinkDir", path })
    );
}
