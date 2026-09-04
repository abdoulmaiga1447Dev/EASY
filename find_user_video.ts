import fs from "fs";
import path from "path";

const now = Date.now();
const twoHoursAgo = now - 2 * 60 * 60 * 1000;

function scan(dir: string) {
  if (dir.includes("node_modules") || dir.includes(".git") || dir.includes(".npm") || dir.includes(".cache") || dir.includes("dist")) {
    return;
  }
  try {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      const full = path.join(dir, item);
      let stat;
      try {
        stat = fs.statSync(full);
      } catch (e) {
        continue;
      }
      if (stat.isDirectory()) {
        scan(full);
      } else {
        if (stat.mtimeMs > twoHoursAgo) {
          console.log(`RECENT FILE: ${full} (${stat.size} bytes) - Mod: ${new Date(stat.mtimeMs).toISOString()}`);
        }
      }
    }
  } catch (e) {}
}

console.log("Scanning workspace for files modified in the last 2 hours...");
scan(".");

// Also scan standard user asset folders in the parent container
console.log("\nScanning outside workspace standard paths...");
const paths = ["/workspace", "/assets", "/tmp", "/app"];
paths.forEach(p => {
  if (p !== "./applet" && p !== ".") {
    scan(p);
  }
});
