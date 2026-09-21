import { createApp } from "./app";
import { env } from "./lib/env";

createApp().listen(env.port, () => {
  console.log(`exam-prep backend listening on :${env.port}`);
});
