import { describe, expect, it } from "vitest";
import type { QuotaExport } from "../src/lib/quota-export-types.js";

describe("QuotaExport schema shape", () => {
  it("round-trips through JSON with all status variants", () => {
    const data: QuotaExport = {
      version: 1,
      exportedAt: 1_717_000_000,
      fromCache: true,
      cacheAgeSeconds: 120,
      providers: {
        copilot: {
          status: "ok",
          fetchedAt: 1_716_999_900,
          entries: [
            {
              name: "Copilot",
              window: "Monthly",
              percentRemaining: 75,
              resetAt: 1_720_000_000,
              unlimited: false,
            },
          ],
        },
        "opencode-go": {
          status: "error",
          fetchedAt: 1_716_999_800,
          error: "Network error",
        },
        unavailable: { status: "unavailable" },
      },
    };

    const json = JSON.stringify(data);
    const parsed = JSON.parse(json);

    expect(parsed).toEqual(data);
    expect(parsed.version).toBe(1);
    expect(parsed.providers.copilot.status).toBe("ok");
    expect(parsed.providers.copilot.entries[0].percentRemaining).toBe(75);
    expect(parsed.providers.copilot.entries[0].unlimited).toBe(false);
    expect(parsed.providers.copilot.entries[0].window).toBe("Monthly");
    expect(parsed.providers["opencode-go"].status).toBe("error");
    expect(parsed.providers["opencode-go"].error).toBe("Network error");
    expect(parsed.providers.unavailable.status).toBe("unavailable");
  });

  it("serializes minimal ok entry without optional fields", () => {
    const data: QuotaExport = {
      version: 1,
      exportedAt: 100,
      fromCache: false,
      cacheAgeSeconds: 0,
      providers: {
        p: {
          status: "ok",
          fetchedAt: 50,
          entries: [{ name: "Minimal", unlimited: false }],
        },
      },
    };

    const parsed = JSON.parse(JSON.stringify(data));
    expect(parsed.providers.p.entries[0]).toEqual({
      name: "Minimal",
      unlimited: false,
    });
    // Optional fields are absent (not null) when not set.
    expect(parsed.providers.p.entries[0].percentRemaining).toBeUndefined();
    expect(parsed.providers.p.entries[0].window).toBeUndefined();
    expect(parsed.providers.p.entries[0].resetAt).toBeUndefined();
  });

  it("serializes error provider without entries array", () => {
    const data: QuotaExport = {
      version: 1,
      exportedAt: 100,
      fromCache: true,
      cacheAgeSeconds: 0,
      providers: {
        p: { status: "error", fetchedAt: 50, error: "Timeout" },
      },
    };

    expect(JSON.parse(JSON.stringify(data)).providers.p).toEqual({
      status: "error",
      fetchedAt: 50,
      error: "Timeout",
    });
  });

  it("serializes unavailable provider without extra fields", () => {
    const data: QuotaExport = {
      version: 1,
      exportedAt: 100,
      fromCache: true,
      cacheAgeSeconds: 0,
      providers: {
        p: { status: "unavailable" },
      },
    };

    expect(JSON.parse(JSON.stringify(data)).providers.p).toEqual({
      status: "unavailable",
    });
  });

  it("handles empty providers record", () => {
    const data: QuotaExport = {
      version: 1,
      exportedAt: 100,
      fromCache: false,
      cacheAgeSeconds: 0,
      providers: {},
    };

    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
  });
});
