// One-shot deploy of the Zubli web app to the Vercel project "zubli", plus the upload-service CORS update.
//   node scripts/deploy-app.mjs
// Prerequisite: `vercel login` as the account that owns the project (team scope below).
//
// It does, in order:
//   1. link this folder to the Vercel project "zubli"
//   2. copy the four PUBLIC (NEXT_PUBLIC_*) values from .env.local to that project's environment variables.
//      Never DATABASE_URL or any secret key: those must not go to the browser app.
//   3. deploy to production
//   4. allow the new site address in the upload service (zubli-upload) and redeploy it
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const SCOPE = "vaulted6";
const PROJECT = "zubli";
const UPLOAD_DIR = "services/upload";
const root = path.resolve(import.meta.dirname, "..");

const PUBLIC_VARS = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_CLERK_NEON_JWT_TEMPLATE",
  "NEXT_PUBLIC_NEON_DATA_API_URL",
  "NEXT_PUBLIC_UPLOAD_API_URL",
];

function readEnv(file) {
  const out = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

// shell: true so Windows finds vercel.cmd. Every argument is a fixed word or a URL/key without spaces.
function vercel(args, { cwd = root, capture = false } = {}) {
  const result = spawnSync("vercel", args, { cwd, shell: true, encoding: "utf8", stdio: capture ? ["inherit", "pipe", "pipe"] : "inherit" });
  if (result.status !== 0) {
    console.error(`\n"vercel ${args[0]} ${args[1] ?? ""}" failed (exit ${result.status}). Stopping.`);
    process.exit(result.status ?? 1);
  }
  // Vercel prints the build log (with the site address) on stderr and a JSON summary on stdout: return both.
  if (capture) process.stderr.write(result.stderr ?? "");
  return `${result.stderr ?? ""}
${result.stdout ?? ""}`;
}

const env = readEnv(path.join(root, ".env.local"));
const missing = PUBLIC_VARS.filter((name) => !env[name]);
if (missing.length) {
  console.error(`Missing in .env.local: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`\n[1/4] Linking to Vercel project "${PROJECT}" (${SCOPE})`);
vercel(["link", "--yes", "--project", PROJECT, "--scope", SCOPE]);

console.log("\n[2/4] Setting public environment variables (values are not printed)");
for (const name of PUBLIC_VARS) {
  console.log(`  - ${name}`);
  vercel(["env", "add", name, "production", "--value", env[name], "--yes", "--force"]);
}

console.log("\n[3/4] Deploying to production");
const output = vercel(["deploy", "--prod"], { capture: true });
const aliased = output.match(/Aliased\s+(https:\/\/\S+)/)?.[1];
const prodUrl = aliased ?? output.match(/Production\s+(https:\/\/\S+)/)?.[1];
if (!prodUrl) {
  console.error("Deployed, but couldn't read the site address from the output. Add it to ALLOWED_ORIGINS manually.");
  process.exit(1);
}
const origin = new URL(prodUrl).origin;
console.log(`Site address: ${origin}`);

console.log("\n[4/4] Allowing the site in the upload service, then redeploying it");
const origins = ["http://localhost:3000", origin].join(",");
vercel(["env", "add", "ALLOWED_ORIGINS", "production", "--value", `"${origins}"`, "--yes", "--force"], { cwd: path.join(root, UPLOAD_DIR) });
vercel(["deploy", "--prod"], { cwd: path.join(root, UPLOAD_DIR) });

console.log(`\nDone. Open ${origin}`);
