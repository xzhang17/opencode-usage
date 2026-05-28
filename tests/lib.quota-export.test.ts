import { homedir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --------------- mock modules ---------------

vi.mock("../src/lib/opencode-runtime-paths.js", () => ({
  getOpencodeRuntimeDirs: () => ({
    dataDir: "/tmp/test-opencode-quota-export/data",
    configDir: "/tmp/test-opencode-quota-export/config",
    cacheDir: "/tmp/test-opencode-quota-export/cache",
    stateDir: "/tmp/test-opencode-quota-export/state",
  }),
}));

vi.mock("../src/lib/atomic-json.js", () => ({
  writeJsonAtomic: vi.fn(),
}));

// Mock readCachedProviderResult — each test sets it up via the hoisted ref.
const { mockReadCachedProviderResult } = vi.hoisted(() => {
  const mockReadCachedProviderResult = vi.fn();
  return { mockReadCachedProviderResult };
});

vi.mock("../src/lib/quota-state.js", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/quota-state.js")>(
    "../src/lib/quota-state.js",
  );
  return {
    ...actual,
    readCachedProviderResult: mockReadCachedProviderResult,
  };
});

// --------------- imports ---------------

import { writeJsonAtomic } from "../src/lib/atomic-json.js";
import {
  resolveExportPath,
  buildQuotaExport,
  writeQuotaExport,
} from "../src/lib/quota-export.js";

// --------------- helpers ---------------

function createMockProvider(id: string) {
  return {
    id,
    isAvailable: vi.fn(),
    fetch: vi.fn(),
  };
}

function createMockContext(): any {
  return {
    client: {
      config: {
        providers: async () => ({ data: { providers: [] } }),
        get: async () => ({ data: {} }),
      },
    },
    config: {
      googleModels: ["CLAUDE"],
      anthropicBinaryPath: "claude",
      alibabaCodingPlanTier: "lite",
      cursorPlan: "none",
      onlyCurrentModel: false,
    },
    session: {},
  };
}

// --------------- describe blocks ---------------

describe("resolveExportPath", () => {
  it("returns XDG default path when configured path is empty", () => {
    const result = resolveExportPath("");
    expect(result).toBe("/tmp/test-opencode-quota-export/cache/quota-export.json");
  });

  it("expands ~/ prefix to homedir", () => {
    const result = resolveExportPath("~/my-exports/quota.json");
    expect(result).toBe(join(homedir(), "my-exports/quota.json"));
  });

  it("passes absolute paths through unchanged", () => {
    const result = resolveExportPath("/etc/opencode/export.json");
    expect(result).toBe("/etc/opencode/export.json");
  });

  it("passes relative non-tilde paths through as-is", () => {
    const result = resolveExportPath("relative/path/quota.json");
    expect(result).toBe("relative/path/quota.json");
  });
});

describe("buildQuotaExport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    mockReadCachedProviderResult.mockReset();
  });

  it("returns status ok when provider has a cache hit with percent entries", async () => {
    mockReadCachedProviderResult.mockResolvedValue({
      hit: true,
      result: {
        attempted: true,
        entries: [
          {
            name: "Copilot",
            percentRemaining: 75,
            resetTimeIso: "2026-07-01T00:00:00.000Z",
            label: "Monthly:",
          },
        ],
        errors: [],
      },
      timestamp: new Date("2026-06-01T11:00:00.000Z").getTime(),
      stale: false,
    });

    const exportData = await buildQuotaExport({
      providers: [createMockProvider("copilot")],
      ctx: createMockContext(),
      ttlMs: 60_000,
      fromCache: true,
    });

    expect(exportData.version).toBe(1);
    expect(exportData.fromCache).toBe(true);
    expect(exportData.exportedAt).toBe(Math.floor(Date.now() / 1000));

    const provider = exportData.providers.copilot;
    expect(provider).toBeDefined();
    expect(provider.status).toBe("ok");

    if (provider.status === "ok") {
      expect(provider.entries).toHaveLength(1);
      expect(provider.entries[0]).toEqual({
        name: "Copilot",
        percentRemaining: 75,
        resetAt: Math.floor(new Date("2026-07-01T00:00:00.000Z").getTime() / 1000),
        window: "Monthly",
        unlimited: false,
      });
    }
  });

  it("maps value-kind entries without percentRemaining", async () => {
    mockReadCachedProviderResult.mockResolvedValue({
      hit: true,
      result: {
        attempted: true,
        entries: [
          { name: "OpenCode Go", kind: "value", value: "$42.50", label: "Weekly:" },
        ],
        errors: [],
      },
      timestamp: new Date("2026-06-01T11:00:00.000Z").getTime(),
      stale: false,
    });

    const exportData = await buildQuotaExport({
      providers: [createMockProvider("opencode-go")],
      ctx: createMockContext(),
      ttlMs: 60_000,
      fromCache: false,
    });

    const provider = exportData.providers["opencode-go"];
    expect(provider.status).toBe("ok");

    if (provider.status === "ok") {
      expect(provider.entries[0].percentRemaining).toBeUndefined();
      expect(provider.entries[0].unlimited).toBe(false);
      // Label "Weekly:" normalizes to window "Weekly".
      expect(provider.entries[0].window).toBe("Weekly");
    }
  });

  it("omits resetAt when entry has no resetTimeIso", async () => {
    mockReadCachedProviderResult.mockResolvedValue({
      hit: true,
      result: {
        attempted: true,
        entries: [{ name: "No Reset", percentRemaining: 50 }],
        errors: [],
      },
      timestamp: new Date("2026-06-01T11:00:00.000Z").getTime(),
      stale: false,
    });

    const exportData = await buildQuotaExport({
      providers: [createMockProvider("no-reset")],
      ctx: createMockContext(),
      ttlMs: 60_000,
      fromCache: true,
    });

    const provider = exportData.providers["no-reset"];
    expect(provider.status).toBe("ok");

    if (provider.status === "ok") {
      expect(provider.entries[0].resetAt).toBeUndefined();
    }
  });

  it("returns status unavailable when provider has no cache entry", async () => {
    mockReadCachedProviderResult.mockResolvedValue({ hit: false });

    const exportData = await buildQuotaExport({
      providers: [createMockProvider("ghost")],
      ctx: createMockContext(),
      ttlMs: 60_000,
      fromCache: true,
    });

    expect(exportData.providers.ghost).toEqual({ status: "unavailable" });
  });

  it("returns status error when cache has only errors", async () => {
    mockReadCachedProviderResult.mockResolvedValue({
      hit: true,
      result: {
        attempted: true,
        entries: [],
        errors: [{ label: "Fetch", message: "Request failed with 429" }],
      },
      timestamp: new Date("2026-06-01T11:00:00.000Z").getTime(),
      stale: false,
    });

    const exportData = await buildQuotaExport({
      providers: [createMockProvider("broken")],
      ctx: createMockContext(),
      ttlMs: 60_000,
      fromCache: true,
    });

    expect(exportData.providers.broken).toEqual({
      status: "error",
      fetchedAt: Math.floor(new Date("2026-06-01T11:00:00.000Z").getTime() / 1000),
      error: "Request failed with 429",
    });
  });

  it("computes cacheAgeSeconds from oldest fetchedAt across ok/error providers", async () => {
    mockReadCachedProviderResult
      .mockResolvedValueOnce({
        hit: true,
        result: { attempted: true, entries: [{ name: "A", percentRemaining: 90 }], errors: [] },
        timestamp: new Date("2026-06-01T10:00:00.000Z").getTime(), // 2h old
        stale: true,
      })
      .mockResolvedValueOnce({
        hit: true,
        result: { attempted: true, entries: [], errors: [{ label: "E", message: "err" }] },
        timestamp: new Date("2026-06-01T11:30:00.000Z").getTime(), // 30m old
        stale: false,
      });

    const exportData = await buildQuotaExport({
      providers: [createMockProvider("a"), createMockProvider("b")],
      ctx: createMockContext(),
      ttlMs: 60_000,
      fromCache: true,
    });

    // Oldest is "a" at 10:00, now is 12:00 → 2h = 7200s
    expect(exportData.cacheAgeSeconds).toBe(7200);
  });

  it("sets cacheAgeSeconds to 0 when no ok/error providers exist", async () => {
    mockReadCachedProviderResult.mockResolvedValue({ hit: false });

    const exportData = await buildQuotaExport({
      providers: [createMockProvider("x")],
      ctx: createMockContext(),
      ttlMs: 60_000,
      fromCache: true,
    });

    expect(exportData.cacheAgeSeconds).toBe(0);
  });

  it("propagates fromCache flag", async () => {
    mockReadCachedProviderResult.mockResolvedValue({ hit: false });

    const cached = await buildQuotaExport({
      providers: [createMockProvider("x")],
      ctx: createMockContext(),
      ttlMs: 60_000,
      fromCache: true,
    });
    expect(cached.fromCache).toBe(true);

    const notCached = await buildQuotaExport({
      providers: [createMockProvider("x")],
      ctx: createMockContext(),
      ttlMs: 60_000,
      fromCache: false,
    });
    expect(notCached.fromCache).toBe(false);
  });

  it("handles multiple providers with mixed statuses", async () => {
    mockReadCachedProviderResult
      .mockResolvedValueOnce({
        hit: true,
        result: {
          attempted: true,
          entries: [{ name: "OK Provider", percentRemaining: 80 }],
          errors: [],
        },
        timestamp: new Date("2026-06-01T11:50:00.000Z").getTime(),
        stale: false,
      })
      .mockResolvedValueOnce({ hit: false })
      .mockResolvedValueOnce({
        hit: true,
        result: {
          attempted: true,
          entries: [],
          errors: [{ label: "E", message: "fail" }],
        },
        timestamp: new Date("2026-06-01T11:55:00.000Z").getTime(),
        stale: false,
      });

    const exportData = await buildQuotaExport({
      providers: [
        createMockProvider("good"),
        createMockProvider("missing"),
        createMockProvider("errored"),
      ],
      ctx: createMockContext(),
      ttlMs: 60_000,
      fromCache: true,
    });

    expect(exportData.providers.good.status).toBe("ok");
    expect(exportData.providers.missing.status).toBe("unavailable");
    expect(exportData.providers.errored.status).toBe("error");
  });

  it("omits window when neither label nor name matches a known pattern", async () => {
    mockReadCachedProviderResult.mockResolvedValue({
      hit: true,
      result: {
        attempted: true,
        entries: [{ name: "Custom Metric", percentRemaining: 100, label: "Arbitrary:" }],
        errors: [],
      },
      timestamp: new Date("2026-06-01T11:00:00.000Z").getTime(),
      stale: false,
    });

    const exportData = await buildQuotaExport({
      providers: [createMockProvider("custom")],
      ctx: createMockContext(),
      ttlMs: 60_000,
      fromCache: true,
    });

    const provider = exportData.providers.custom;
    expect(provider.status).toBe("ok");
    if (provider.status === "ok") {
      expect(provider.entries[0].window).toBeUndefined();
    }
  });
});

describe("writeQuotaExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls writeJsonAtomic with the resolved path and trailing newline", async () => {
    const exportData: any = { version: 1, providers: {} };
    await writeQuotaExport(exportData, "/tmp/export.json");

    expect(writeJsonAtomic).toHaveBeenCalledWith("/tmp/export.json", exportData, {
      trailingNewline: true,
    });
  });

  it("re-throws errors from writeJsonAtomic", async () => {
    const error = new Error("Disk full");
    vi.mocked(writeJsonAtomic).mockRejectedValueOnce(error);

    await expect(
      writeQuotaExport({ version: 1, providers: {} } as any, "/tmp/fail.json"),
    ).rejects.toThrow("Disk full");
  });
});
