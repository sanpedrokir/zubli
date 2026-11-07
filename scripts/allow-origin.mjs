// Allows the live site to call the upload service, then redeploys the service so it takes effect.
//   node scripts/allow-origin.mjs [extra-origin ...]
// Origins are exact (scheme + host, no trailing slash). localhost:3000 and the live site are always included.
import { spawnSync } from "node:child_process";
import path from "node:path";

const dir = path.resolve(import.meta.dirname, "..", "services", "upload");
const origins = ["http://localhost:3000", "https://zubli.vercel.app", ...process.argv.slice(2)];

function vercel(args) {
  const result = spawnSync("vercel", args, { cwd: dir, shell: true, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\n"vercel ${args[0]} ${args[1] ?? ""}" failed (exit ${result.status}).`);
    process.exit(result.status ?? 1);
  }
}

console.log(`Allowed origins: ${origins.join(", ")}`);
vercel(["env", "add", "ALLOWED_ORIGINS", "production", "--value", `"${origins.join(",")}"`, "--yes", "--force"]);
vercel(["deploy", "--prod"]);
console.log("\nDone. The upload service now accepts requests from the live site.");
