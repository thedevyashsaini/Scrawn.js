import { afterEach, beforeEach, vi } from "vitest";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv, SCRAWN_DEBUG: "" };
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...originalEnv };
});
