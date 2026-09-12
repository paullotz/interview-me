import { describe, expect, it } from "vitest";
import {
  exportToMarkdown,
  exportToJson,
  formatDuration,
  formatRelativeTime,
} from "../src/export";
import { getCleanSelector, getCleanText } from "../src/tracker";
import type { InterviewSession } from "../src/types";

describe("interview-me export utilities", () => {
  it("formats durations accurately", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(5000)).toBe("00:05");
    expect(formatDuration(65000)).toBe("01:05");
    expect(formatDuration(3665000)).toBe("61:05");
  });

  it("formats relative timestamps with leading plus sign", () => {
    const start = 10000;
    expect(formatRelativeTime(start, 10000)).toBe("+00:00");
    expect(formatRelativeTime(start, 25000)).toBe("+00:15");
    expect(formatRelativeTime(start, 130000)).toBe("+02:00");
  });

  it("exports session to valid JSON", () => {
    const mockSession: InterviewSession = {
      id: "session-123",
      title: "Test Interview Session",
      user: "Dr. Musterzahn",
      feature: "Honorarnoten-Export",
      startTime: 1700000000000,
      endTime: 1700000120000,
      events: [
        { type: "route", path: "/patients", timestamp: 1700000010000 },
        { type: "click", selector: "button[data-testid='save']", text: "Speichern", timestamp: 1700000020000 },
      ],
      notes: [
        {
          id: "note-1",
          type: "text",
          content: "User looked for the SVNr field",
          timestamp: 1700000030000,
          tag: "confusion",
        },
        {
          id: "note-2",
          type: "text",
          content: "Button color is hard to read",
          timestamp: 1700000040000,
          tag: "bug",
        },
      ],
    };

    const jsonStr = exportToJson(mockSession);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.id).toBe("session-123");
    expect(parsed.events.length).toBe(2);
    expect(parsed.notes.length).toBe(2);
  });

  it("generates structured markdown with summary, notes, and chronological timeline", () => {
    const start = 1700000000000;
    const mockSession: InterviewSession = {
      id: "session-456",
      title: "Praxis Workflow Feedback",
      user: "Assistentin Anna",
      feature: "FDI Zahnschema",
      startTime: start,
      endTime: start + 75000, // 01:15
      events: [
        { type: "route", path: "/dental-chart", timestamp: start + 5000 },
        { type: "click", selector: "button#tooth-18", text: "Zahn 18", timestamp: start + 12000 },
      ],
      notes: [
        {
          id: "n-1",
          type: "text",
          content: "Konnte Karies-Status nicht sofort finden",
          timestamp: start + 20000,
          tag: "confusion",
        },
        {
          id: "n-2",
          type: "text",
          content: "Tastatur-Navigation wäre schneller",
          timestamp: start + 45000,
          tag: "idea",
        },
      ],
    };

    const md = exportToMarkdown(mockSession);

    // Title
    expect(md).toContain("# Interview Session: Praxis Workflow Feedback");
    // Metadata
    expect(md).toContain("Assistentin Anna");
    expect(md).toContain("FDI Zahnschema");
    expect(md).toContain("01:15");
    // Action Items / Confusion
    expect(md).toContain("❓ CONFUSION");
    expect(md).toContain("Konnte Karies-Status nicht sofort finden");
    // Notes Table
    expect(md).toContain("Tastatur-Navigation wäre schneller");
    // Timeline
    expect(md).toContain("+00:05");
    expect(md).toContain("/dental-chart");
    expect(md).toContain("button#tooth-18");
    expect(md).toContain("Ende");
  });
});

describe("interview-me tracker selectors", () => {
  function createMockElement(options: {
    tagName: string;
    id?: string;
    attrs?: Record<string, string>;
    classes?: string[];
    text?: string;
  }) {
    const attrs = options.attrs || {};
    const classes = options.classes || [];

    const el: any = {
      tagName: options.tagName.toUpperCase(),
      id: options.id || "",
      getAttribute: (name: string) => attrs[name] ?? null,
      classList: classes,
      innerText: options.text || "",
      textContent: options.text || "",
      parentElement: null,
      closest: (selector: string) => {
        if (selector.includes("[data-interview-highlight]")) {
          return attrs["data-interview-highlight"] ? el : null;
        }
        return el;
      },
    };
    return el;
  }

  it("extracts selector with data-testid if present", () => {
    const btn = createMockElement({
      tagName: "button",
      attrs: { "data-testid": "checkout-btn" },
      text: "Zur Kasse",
    });

    const selector = getCleanSelector(btn);
    expect(selector).toBe("button[data-testid=\"checkout-btn\"]");
    expect(getCleanText(btn)).toBe("Zur Kasse");
  });

  it("extracts selector with data-interview-highlight", () => {
    const div = createMockElement({
      tagName: "div",
      attrs: { "data-interview-highlight": "priority-step" },
      text: "Wichtiger Schritt",
    });

    const selector = getCleanSelector(div);
    expect(selector).toBe("div[data-interview-highlight=\"priority-step\"]");
  });

  it("extracts selector with id if available", () => {
    const a = createMockElement({
      tagName: "a",
      id: "main-nav-link",
      text: "Dashboard",
    });

    const selector = getCleanSelector(a);
    expect(selector).toBe("#main-nav-link");
  });
});
