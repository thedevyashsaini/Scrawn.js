import { describe, expect, it } from "vitest";
import { matchPath } from "../../../src/utils/pathMatcher.js";

describe("matchPath", () => {
  it("matches exact paths", () => {
    expect(matchPath("/api/users", "/api/users")).toBe(true);
    expect(matchPath("/api/users", "/api/user")).toBe(false);
  });

  it("matches single segment wildcards", () => {
    expect(matchPath("/api/users", "/api/*")).toBe(true);
    expect(matchPath("/api/users/123", "/api/*")).toBe(false);
  });

  it("matches multi-segment wildcards", () => {
    expect(matchPath("/api/users", "/api/**")).toBe(true);
    expect(matchPath("/api/users/123", "/api/**")).toBe(true);
    expect(matchPath("/api/users/123/details", "/api/**")).toBe(true);
  });

  it("matches mixed wildcard patterns", () => {
    expect(matchPath("/api/v1/users/data", "/api/**/data")).toBe(true);
    expect(matchPath("/api/v1/users/data", "/api/*/data")).toBe(false);
  });

  it("supports suffix patterns", () => {
    expect(matchPath("/index.php", "**.php")).toBe(true);
    expect(matchPath("/index.html", "**.php")).toBe(false);
  });
});
