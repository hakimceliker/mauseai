import { serve } from 'inngest/next';
import { inngest } from '@/src/inngest/client';
import { executeTask } from '@/src/inngest/functions/execute-task';

// Export the handler for Inngest
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [executeTask],
});
