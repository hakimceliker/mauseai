import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createNotificationAdapter } from '@/src/lib/integrations/notification-provider';

describe('Slack notification provider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NOTIFICATION_TYPE = 'slack';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.test/webhook';
  });

  it('posts Slack text and blocks without exposing the webhook URL', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));
    const adapter = createNotificationAdapter();
    const result = await adapter.sendSlack({ channel: 'ops', text: 'Task completed', blocks: [{ type: 'section' }] });
    expect(result.status).toBe('sent');
    expect(fetchMock).toHaveBeenCalledWith('https://hooks.slack.test/webhook', expect.objectContaining({ method: 'POST' }));
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain('Task completed');
  });

  it('fails safely when the webhook credential is absent', async () => {
    delete process.env.SLACK_WEBHOOK_URL;
    const adapter = createNotificationAdapter();
    await expect(adapter.sendSlack({ channel: 'ops', text: 'Task completed' })).rejects.toThrow('credential_not_configured:SLACK_WEBHOOK_URL');
  });
});
