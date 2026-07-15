import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("GitHub workflows", () => {
  it("keeps provider-API-blocked issues exempt from stale automation", async () => {
    const workflow = await readFile(".github/workflows/close-inactive-issues.yml", "utf8");

    expect(workflow).toContain("uses: actions/stale@v10");
    expect(workflow).toContain('exempt-issue-labels: "Blocked: not in provider API"');
    expect(workflow).toContain("days-before-issue-stale: 23");
    expect(workflow).toContain("days-before-issue-close: 7");
    expect(workflow).toContain("days-before-pr-stale: -1");
    expect(workflow).toContain("days-before-pr-close: -1");
  });
});
