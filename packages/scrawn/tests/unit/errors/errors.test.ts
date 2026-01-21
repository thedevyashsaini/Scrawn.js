import { describe, expect, it } from "vitest";
import {
  ScrawnAPIError,
  ScrawnAuthenticationError,
  ScrawnConfigError,
  ScrawnNetworkError,
  ScrawnRateLimitError,
  ScrawnValidationError,
  convertGrpcError,
  isRetryableError,
  isScrawnError,
} from "../../../src/core/errors/index.js";

describe("Scrawn errors", () => {
  it("creates typed errors with metadata", () => {
    const error = new ScrawnValidationError("Invalid payload", {
      details: { field: "userId" },
    });

    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ field: "userId" });
  });

  it("converts grpc errors to auth errors", () => {
    const grpcError = { code: 16, message: "Unauthenticated" };
    const converted = convertGrpcError(grpcError);

    expect(converted).toBeInstanceOf(ScrawnAuthenticationError);
    expect(converted.statusCode).toBe(401);
  });

  it("converts grpc errors to validation errors", () => {
    const grpcError = { code: 3, message: "Invalid" };
    const converted = convertGrpcError(grpcError);

    expect(converted).toBeInstanceOf(ScrawnValidationError);
    expect(converted.statusCode).toBe(400);
  });

  it("converts grpc errors to rate limit errors", () => {
    const grpcError = { code: 8, message: "Rate limit" };
    const converted = convertGrpcError(grpcError);

    expect(converted).toBeInstanceOf(ScrawnRateLimitError);
    expect(converted.retryable).toBe(true);
  });

  it("converts grpc errors to network errors", () => {
    const grpcError = { code: 14, message: "Unavailable" };
    const converted = convertGrpcError(grpcError);

    expect(converted).toBeInstanceOf(ScrawnNetworkError);
    expect(converted.retryable).toBe(true);
  });

  it("converts grpc errors to api errors", () => {
    const grpcError = { code: 13, message: "Internal" };
    const converted = convertGrpcError(grpcError);

    expect(converted).toBeInstanceOf(ScrawnAPIError);
    expect(converted.statusCode).toBe(500);
  });

  it("marks retryable errors", () => {
    const retryable = new ScrawnNetworkError("Timeout");
    const nonRetryable = new ScrawnConfigError("Bad config");

    expect(isScrawnError(retryable)).toBe(true);
    expect(isRetryableError(retryable)).toBe(true);
    expect(isRetryableError(nonRetryable)).toBe(false);
  });
});
