/**
 * Checks the production environment before anything else runs.
 *
 * Bundled into the image as ops/check-env.mjs and run first by the container
 * entrypoint, so a misconfigured deploy stops before it touches the database.
 * The server repeats the same check at boot (src/instrumentation.ts).
 */
import { environmentProblems } from "../src/server/env-check";

const problems = environmentProblems();

if (problems.length > 0) {
  console.error(
    [
      "The server cannot start: the environment is not configured correctly.",
      ...problems.map((problem) => `  - ${problem}`),
      "See DEPLOYMENT.md, section “Environment variables”.",
    ].join("\n"),
  );
  process.exit(1);
}
