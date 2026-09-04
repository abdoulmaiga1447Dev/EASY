import fs from "fs";
import path from "path";

const serverPath = path.join(process.cwd(), "server.ts");

function clean() {
  if (!fs.existsSync(serverPath)) return;
  let code = fs.readFileSync(serverPath, "utf-8");

  // 1. Replace double "async async" with single "async"
  console.log("Cleaning up double async keywords...");
  code = code.replace(/async\s+async/g, "async");

  // 2. Replace double "await await" with single "await"
  console.log("Cleaning up double await keywords...");
  code = code.replace(/await\s+await/g, "await");

  // Write it back
  fs.writeFileSync(serverPath, code, "utf-8");
  console.log("Cleanup complete!");
}

clean();
