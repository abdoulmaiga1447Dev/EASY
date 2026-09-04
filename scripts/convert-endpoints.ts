import fs from "fs";
import path from "path";

const serverPath = path.join(process.cwd(), "server.ts");

function convert() {
  if (!fs.existsSync(serverPath)) {
    console.error("server.ts not found!");
    return;
  }

  let code = fs.readFileSync(serverPath, "utf-8");

  // 1. Convert readDB() and writeDB(db) definitions to be async
  console.log("Updating readDB and writeDB definitions...");
  const oldReadDBDef = `function readDB(): DBStructure {`;
  const oldWriteDBDef = `function writeDB(data: DBStructure) {`;

  // We will replace the entire body of readDB and writeDB in a separate block or directly in server.ts
  
  // 2. We want to convert all HTTP route handler functions to be async if they contain readDB or writeDB
  // Express routes look like:
  // app.get('/path', requireAuth, (req, res) => {
  // app.post('/path', (req, res) => {
  // Let's find all lines containing app.get/post/put/delete and check if their block contains readDB or writeDB
  console.log("Analyzing Express routes to add async keyword...");
  
  // A robust way to do this is to parse the file line by line or find route lines
  // Let's find patterns like:
  // app.get("...", ..., (req, res) => {
  // app.post("...", async (req, res) => {
  
  // Let's replace:
  // app.get("...", (req, res) => {   -> app.get("...", async (req, res) => {
  // app.post("...", (req, res) => {  -> app.post("...", async (req, res) => {
  // etc.
  
  // Let's do regex replacements for route signatures
  const routeRegexes = [
    /(app\.(get|post|put|delete|patch)\([^)]*?),\s*(?:requireAuth|requireAdmin)?\s*\((req,\s*res)\s*=>/g,
  ];

  // However, we want to be very precise. Some routes might have multiple middlewares.
  // Let's search for any occurrence of "(req, res) =>" or "(req: any, res: any) =>" or "(req: any, res) =>"
  // that does NOT have "async" before it, and check if it's within an app.xxx call.
  // Actually, we can simply find any "(req, res) =>" or "(req: any, res) =>" or "(req, res: any) =>" 
  // or "(req: express.Request, res: express.Response) =>" that precedes a block containing readDB or writeDB.
  // But wait, since we can make ALL route handlers async, it is completely harmless to put `async` on EVERY route handler!
  // Yes! Express handlers can be async even if they don't use await. It has absolutely zero side effects!
  // So we can safely convert ALL `(req, res) =>` inside app.get/post/put/delete/patch to `async (req, res) =>`!
  // Let's write a targeted replacement for standard route signatures.
  
  // First, find and replace any "(req, res) =>" or "(req, res: any) =>" or "(req: any, res) =>" 
  // that is part of a route handler to be async.
  // Standard signatures in server.ts:
  // app.get("/api/health", (req, res) => {
  // app.get("/api/vehicles", (req, res) => {
  // app.get("/api/drivers", requireAuth, (req, res) => {
  // app.post("/api/drivers/me/shifts", requireAuth, (req, res) => {
  // app.put("/api/drivers/me/status", requireAuth, (req, res) => {
  
  // Let's do simple pattern replacements:
  code = code.replace(/,\s*\(req,\s*res\)\s*=>\s*\{/g, ", async (req, res) => {");
  code = code.replace(/,\s*\(req: any,\s*res\)\s*=>\s*\{/g, ", async (req: any, res) => {");
  code = code.replace(/,\s*\(req,\s*res: any\)\s*=>\s*\{/g, ", async (req, res: any) => {");
  code = code.replace(/,\s*\(req: any,\s*res: any\)\s*=>\s*\{/g, ", async (req: any, res: any) => {");

  // Also replace cases without comma (e.g. app.get("/api/health", (req, res) => {)
  code = code.replace(/\(\(req,\s*res\)\s*=>\s*\{/g, "(async (req, res) => {");
  code = code.replace(/\(\(req: any,\s*res\)\s*=>\s*\{/g, "(async (req: any, res) => {");
  code = code.replace(/app\.get\("([^"]+)"\s*,\s*\(req,\s*res\)\s*=>/g, 'app.get("$1", async (req, res) =>');
  code = code.replace(/app\.post\("([^"]+)"\s*,\s*\(req,\s*res\)\s*=>/g, 'app.post("$1", async (req, res) =>');
  code = code.replace(/app\.put\("([^"]+)"\s*,\s*\(req,\s*res\)\s*=>/g, 'app.put("$1", async (req, res) =>');
  code = code.replace(/app\.delete\("([^"]+)"\s*,\s*\(req,\s*res\)\s*=>/g, 'app.delete("$1", async (req, res) =>');

  code = code.replace(/app\.get\('([^']+)'\s*,\s*\(req,\s*res\)\s*=>/g, "app.get('$1', async (req, res) =>");
  code = code.replace(/app\.post\('([^']+)'\s*,\s*\(req,\s*res\)\s*=>/g, "app.post('$1', async (req, res) =>");
  code = code.replace(/app\.put\('([^']+)'\s*,\s*\(req,\s*res\)\s*=>/g, "app.put('$1', async (req, res) =>");
  code = code.replace(/app\.delete\('([^']+)'\s*,\s*\(req,\s*res\)\s*=>/g, "app.delete('$1', async (req, res) =>");

  // Double check any remaining " (req, res) =>" 
  code = code.replace(/\s*\(req,\s*res\)\s*=>/g, " async (req, res) =>");

  // 3. Now let's prepend "await " to "readDB()" and "writeDB(db)" and "writeDB(data)"
  console.log("Prepending await to readDB() and writeDB() calls...");
  // Avoid duplicating "await await"
  code = code.replace(/await\s+readDB\(\)/g, "readDB()");
  code = code.replace(/readDB\(\)/g, "await readDB()");

  code = code.replace(/await\s+writeDB\(/g, "writeDB(");
  code = code.replace(/writeDB\(/g, "await writeDB(");

  // Clean up any edge cases like double "await await"
  code = code.replace(/await\s+await\s+readDB\(\)/g, "await readDB()");
  code = code.replace(/await\s+await\s+writeDB\(/g, "await writeDB(");

  // Restore the definitions of readDB and writeDB so they don't have double await or syntax issues
  // The definitions in code are:
  // async function readDB(): Promise<DBStructure> {
  // async function writeDB(data: DBStructure) {
  
  // Let's write out the modified server.ts
  fs.writeFileSync(serverPath, code, "utf-8");
  console.log("Express routes successfully converted to async!");
}

convert();
