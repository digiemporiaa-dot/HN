// Start-up warm-up, run by the entrypoint once the server is listening.
//
// The image's prerendered pages were built against an empty database. This
// discards them, then requests the main pages so each is regenerated from the
// real data before the healthcheck lets any visitor in.
import { readFile } from "node:fs/promises";

const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
const PAGES = [
  "/",
  "/products",
  "/categories",
  "/brands",
  "/specialties",
  "/solutions",
  "/applications",
  "/locations",
  "/contact",
  "/sitemap.xml",
  "/robots.txt",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer(timeoutMs = 120_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const response = await fetch(`${base}/api/health`);
      const body = await response.json();
      // Database and storage must be good; "warmed" is what this script is for.
      if (body.checks?.database && body.checks?.storage) return;
      console.log(`[warm] waiting: ${JSON.stringify(body.checks)}`);
    } catch {
      // Not listening yet.
    }
    await sleep(2000);
  }
  throw new Error("the server did not become ready");
}

await waitForServer();

const token = (await readFile(process.env.HN_WARM_TOKEN_FILE, "utf8")).trim();
const purge = await fetch(`${base}/api/internal/warm`, {
  method: "POST",
  headers: { "x-warm-token": token },
});
if (purge.status !== 204) throw new Error(`warm-up refused: ${purge.status}`);

for (const path of PAGES) {
  // Twice: the first request after an invalidation may still be answered from
  // the old copy while the new one is generated.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(`${base}${path}`, { redirect: "manual" });
    await response.arrayBuffer();
    if (attempt === 1) console.log(`[warm] ${path} ${response.status}`);
  }
}
