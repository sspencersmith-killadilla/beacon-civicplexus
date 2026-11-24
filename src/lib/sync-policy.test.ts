import { describe, expect, it } from "vitest";
import { backoffDelay, classifyFailure, MAX_AUTO_RETRIES } from "./sync-policy";
import { fitWithin } from "./photoCompressor";

describe("sync retry policy", () => {
  it("backs off 5s → 15s → 45s and stops after 5 automatic retries", () => {
    expect(backoffDelay(1)).toBe(5000);
    expect(backoffDelay(2)).toBe(15000);
    expect(backoffDelay(3)).toBe(45000);
    expect(MAX_AUTO_RETRIES).toBe(5);
    expect(backoffDelay(6)).toBeNull();
  });
  it("pauses on 401/403 or an expired session instead of retrying", () => {
    expect(classifyFailure(401, "")).toBe("auth");
    expect(classifyFailure(403, "")).toBe("auth");
    expect(classifyFailure(400, "JWT expired")).toBe("auth");
  });
  it("retries network and 5xx failures, not validation errors", () => {
    expect(classifyFailure(undefined, "TypeError: Failed to fetch")).toBe("transient");
    expect(classifyFailure(503, "")).toBe("transient");
    expect(classifyFailure(400, "invalid input syntax")).toBe("permanent");
  });
});

describe("photo resize", () => {
  it("caps the longest edge at 1600px, keeps proportions, never upscales", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

import { isRefusedHost } from "./pwa-register";
describe("offline app shell host guard", () => {
  it("never registers in Lovable previews", () => {
    expect(isRefusedHost("id-preview--8ea0815f-aa8f-4dcf-8bf2-0c25ded6500a.lovable.app")).toBe(true);
    expect(isRefusedHost("preview-v2--beacon.lovable.app")).toBe(true);
    expect(isRefusedHost("abc.lovableproject.com")).toBe(true);
  });
  it("registers on the published and custom domains", () => {
    expect(isRefusedHost("beacon.civicplexus.org")).toBe(false);
    expect(isRefusedHost("beacon-civicplexus.lovable.app")).toBe(false);
  });
});
