import { describe, expect, it } from "vitest";
import { AgentCommandSchema, AgentHeartbeatSchema } from "@/src/types/agent";

const ids = {
  agentId: "00000000-0000-4000-8000-000000000001",
  tenantId: "00000000-0000-4000-8000-000000000002",
  taskId: "00000000-0000-4000-8000-000000000003",
  stepId: "00000000-0000-4000-8000-000000000004",
};

describe("MouseAI Agent contracts", () => {
  it("accepts a valid signed command envelope", () => {
    const result = AgentCommandSchema.safeParse({
      ...ids,
      commandId: "00000000-0000-4000-8000-000000000005",
      expiresAt: "2026-09-26T12:00:00.000Z",
      action: "task.execute",
      signature: "test-signature",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a heartbeat with a negative task count", () => {
    const result = AgentHeartbeatSchema.safeParse({
      agentId: ids.agentId,
      tenantId: ids.tenantId,
      version: "0.1.0",
      status: "ONLINE",
      activeTasks: -1,
      sentAt: "2026-09-26T12:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});
