import { createApp } from "./app";
import { env } from "./lib/env";

if (env.jwtSecret === "dev-secret-change-me") {
  console.warn(
    "⚠️  JWT_SECRET is unset, using the insecure default. " +
      "Every token is forgeable. Set a real secret in .env before deploying anywhere real users can reach."
  );
}

createApp().listen(env.port, () => {
  console.log(`exam-prep backend listening on :${env.port}`);
});
