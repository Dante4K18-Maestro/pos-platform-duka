// Copies the hand-edited templates/ into public/templates/ so the web app
// can serve it without a committed duplicate. Runs on every dev/build; the
// copy is gitignored so templates/ stays the single source of truth.
import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd(); // apps/web
const templatesDir = join(root, "..", "..", "templates");
const outDir = join(root, "public", "templates");

mkdirSync(outDir, { recursive: true });
for (const file of ["pos.html"]) {
  copyFileSync(join(templatesDir, file), join(outDir, file));
  console.log(`[templates] copied ${file}`);
}
