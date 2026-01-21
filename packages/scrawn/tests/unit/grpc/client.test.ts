import { describe, expect, it, vi } from "vitest";
import { GrpcClient } from "../../../src/core/grpc/client.js";
import { EventService } from "../../../src/gen/event/v1/event_connect.js";
import { createMockTransport } from "../../mocks/mockTransport.js";
import { RegisterEventResponse } from "../../../src/gen/event/v1/event_pb.js";

const mockTransport = createMockTransport({
  unary: () => new RegisterEventResponse({ random: "ok" }),
});

vi.mock("@connectrpc/connect-node", () => ({
  createConnectTransport: () => mockTransport,
}));

describe("GrpcClient", () => {
  it("creates request builders with the configured base URL", () => {
    const client = new GrpcClient("https://api.example");

    expect(client.getBaseURL()).toBe("https://api.example");
    expect(() => client.newCall(EventService, "registerEvent")).not.toThrow();
  });
});
