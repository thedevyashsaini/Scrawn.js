import { describe, expect, it } from "vitest";
import { RequestBuilder } from "../../../src/core/grpc/requestBuilder.js";
import { createMockTransport } from "../../mocks/mockTransport.js";
import { PaymentService } from "../../../src/gen/payment/v1/payment_connect.js";
import { CreateCheckoutLinkResponse } from "../../../src/gen/payment/v1/payment_pb.js";

describe("RequestBuilder", () => {
  it("builds a request with headers and payload", async () => {
    const transport = createMockTransport({
      unary: ({ input, headers }) => {
        expect(headers).toEqual({ Authorization: "Bearer token" });
        expect(input).toEqual({ userId: "user_1" });
        return new CreateCheckoutLinkResponse({
          checkoutLink: "https://checkout.example",
        });
      },
    });

    const builder = new RequestBuilder(transport, PaymentService, "createCheckoutLink");
    const response = await builder
      .addHeader("Authorization", "Bearer token")
      .addPayload({ userId: "user_1" })
      .request();

    expect(response.checkoutLink).toBe("https://checkout.example");
  });

  it("throws when payload is missing", async () => {
    const transport = createMockTransport({
      unary: () => new CreateCheckoutLinkResponse({ checkoutLink: "" }),
    });

    const builder = new RequestBuilder(transport, PaymentService, "createCheckoutLink");
    await expect(builder.request()).rejects.toThrow("addPayload");
  });

  it("prevents payload from being set twice", () => {
    const transport = createMockTransport({
      unary: () => new CreateCheckoutLinkResponse({ checkoutLink: "" }),
    });

    const builder = new RequestBuilder(transport, PaymentService, "createCheckoutLink");
    builder.addPayload({ userId: "user_1" });

    expect(() => builder.addPayload({ userId: "user_2" })).toThrow(
      "Payload has already been set"
    );
  });
});
