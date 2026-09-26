import { serve } from "inngest/next";
import { inngest } from "@/src/inngest/client";
import { taskWorker } from "@/src/inngest/functions/task-worker";
import { azFunctions } from "@/src/inngest/functions/a-z-pipelines";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [taskWorker, ...azFunctions],
});
