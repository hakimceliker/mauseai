import { Inngest } from 'inngest';

// Define event types
export type TaskExecuteEvent = {
  name: 'task.execute';
  data: {
    taskId: string;
    tenantId: string;
    workflowId: string;
  };
};

export type TaskCheckpointEvent = {
  name: 'task.checkpoint.save';
  data: {
    taskId: string;
    stepId: string;
    state: Record<string, unknown>;
  };
};

// Create Inngest client
export const inngest = new Inngest({
  id: 'mauseai',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
