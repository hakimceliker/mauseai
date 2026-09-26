import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "mouseai-core",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
