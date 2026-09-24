import { createApp } from "./app";
import { env } from "./lib/env";

if (env.jwtSecret === "dev-secret-change-me") {
  console.warn(
    "⚠️  JWT_SECRET is unset, using the insecure default. " +
      "Every token is forgeable. Set a real secret in .env before deploying anywhere real users can reach."
  );
}

// Log instead of crashing the process on a stray rejection — one bad request
// shouldn't take the whole server (and every in-flight upload) down with it.
process.on("unhandledRejection", (reason) => console.error("Unhandled rejection:", reason));

createApp().listen(env.port, () => {
  console.log(`exam-prep backend listening on :${env.port}`);
});
