import type { InterviewNote, InterviewSession, SessionEvent } from "./types";

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function formatRelativeTime(startTime: number, targetTime: number): string {
  const diff = Math.max(0, targetTime - startTime);
  return `+${formatDuration(diff)}`;
}

export function exportToJson(session: InterviewSession): string {
  return JSON.stringify(session, null, 2);
}

type MergedItem =
  | { kind: "event"; data: SessionEvent; timestamp: number }
  | { kind: "note"; data: InterviewNote; timestamp: number };

export function exportToMarkdown(session: InterviewSession): string {
  const startTime = session.startTime;
  const endTime = session.endTime ?? Date.now();
  const durationStr = formatDuration(endTime - startTime);
  const formattedDate = new Date(startTime).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const notes = session.notes || [];
  const events = session.events || [];

  // Tag counters
  const tagCounts: Record<string, number> = {
    confusion: 0,
    bug: 0,
    idea: 0,
    quote: 0,
    general: 0,
  };

  for (const n of notes) {
    const t = n.tag || "general";
    tagCounts[t] = (tagCounts[t] || 0) + 1;
  }

  // Merge items chronologically
  const timeline: MergedItem[] = [
    ...events.map((e) => ({ kind: "event" as const, data: e, timestamp: e.timestamp })),
    ...notes.map((n) => ({ kind: "note" as const, data: n, timestamp: n.timestamp })),
  ];
  timeline.sort((a, b) => a.timestamp - b.timestamp);

  const lines: string[] = [];

  lines.push(`# Interview Session: ${session.title}`);
  lines.push("");
  lines.push(`> Exported from **User Interview** on ${new Date().toLocaleString("en-US")}`);
  lines.push("");

  // Metadata Table
  lines.push("## Session Metadata");
  lines.push("");
  lines.push("| Parameter | Value |");
  lines.push("| :--- | :--- |");
  lines.push(`| **Date** | ${formattedDate} |`);
  lines.push(`| **Duration** | ${durationStr} |`);
  lines.push(`| **User / Pseudonym** | ${session.user || "—"} |`);
  lines.push(`| **Feature / Flow** | ${session.feature || "—"} |`);
  lines.push(`| **Events Captured** | ${events.length} |`);
  lines.push(`| **Notes Created** | ${notes.length} |`);
  lines.push("");

  // Tag distribution summary
  lines.push("### Insights Overview");
  lines.push("");
  lines.push(
    `- **Confusion**: ${tagCounts.confusion}` +
      `\n- **Bugs**: ${tagCounts.bug}` +
      `\n- **Ideas / Feature Requests**: ${tagCounts.idea}` +
      `\n- **Quotes**: ${tagCounts.quote}` +
      `\n- **General Notes**: ${tagCounts.general}`
  );
  lines.push("");

  // AI Agent Instructions Section
  lines.push("## Instructions for AI Agents");
  lines.push("");
  lines.push("How to interpret and work with this session file:");
  lines.push(
    "1. **Analyze Priorities**: Review the \"Developer Action Items\" below. Treat `[BUG]` items as high-priority functional fixes, and `[CONFUSION]` items as UX/clarity improvements."
  );
  lines.push(
    "2. **Inspect Context in Timeline**: Check the \"Chronological Timeline\" section to trace what the user did right before a note was created. Preceding route changes and click events reveal the exact user workflow and screen context."
  );
  lines.push(
    "3. **Locate Code via Selectors & Routes**: Search the codebase for the recorded route paths and click selectors (e.g. `[data-testid=\"...\"]`, `[data-interview-highlight=\"...\"]`, or element IDs) to pinpoint the exact components."
  );
  lines.push(
    "4. **Resolve Issues**: Implement fixes or refactors that address the root cause of user hesitation or errors. Respect direct user quotes (`[QUOTE]`) to stay aligned with user expectations."
  );
  lines.push("");

  // Developer Action Items / Issues Section
  const bugsAndConfusion = notes.filter((n) => n.tag === "bug" || n.tag === "confusion");
  if (bugsAndConfusion.length > 0) {
    lines.push("## Developer Action Items");
    lines.push("");
    lines.push("Friction points and bugs identified from session notes:");
    lines.push("");
    for (const item of bugsAndConfusion) {
      const tagLabel = item.tag === "bug" ? "BUG" : "CONFUSION";
      const relTime = formatRelativeTime(startTime, item.timestamp);
      lines.push(`- [ ] **[${tagLabel}]** \`${relTime}\`: ${item.content}`);
    }
    lines.push("");
  }

  // Notes Section
  lines.push("## All Notes");
  lines.push("");
  if (notes.length === 0) {
    lines.push("_No notes recorded in this session._");
  } else {
    lines.push("| Time | Type | Note |");
    lines.push("| :--- | :--- | :--- |");
    for (const note of notes) {
      const relTime = formatRelativeTime(startTime, note.timestamp);
      const tag = (note.tag || "general").toUpperCase();
      const escapedContent = note.content.replace(/\|/g, "\\|").replace(/\n/g, " ");
      lines.push(`| \`${relTime}\` | **${tag}** | ${escapedContent} |`);
    }
  }
  lines.push("");

  // Chronological Timeline
  lines.push("## Chronological Timeline (Clicks, Routes & Notes)");
  lines.push("");
  lines.push("| Time | Type | Details |");
  lines.push("| :--- | :--- | :--- |");
  lines.push(`| \`+00:00\` | **Start** | Session started: *${session.title}* |`);

  for (const item of timeline) {
    const relTime = formatRelativeTime(startTime, item.timestamp);
    if (item.kind === "note") {
      const tag = (item.data.tag || "general").toUpperCase();
      const text = item.data.content.replace(/\|/g, "\\|").replace(/\n/g, " ");
      lines.push(`| \`${relTime}\` | **NOTE [${tag}]** | "${text}" |`);
    } else {
      const ev = item.data;
      if (ev.type === "route") {
        lines.push(`| \`${relTime}\` | **Route** | Navigated to \`${ev.path}\` |`);
      } else if (ev.type === "click") {
        const textSnippet = ev.text ? ` ("${ev.text.replace(/\|/g, "\\|")}")` : "";
        lines.push(`| \`${relTime}\` | **Click** | \`${ev.selector}\`${textSnippet} |`);
      }
    }
  }

  lines.push(`| \`+${durationStr}\` | **End** | Session ended |`);
  lines.push("");

  return lines.join("\n");
}

export function downloadFile(filename: string, content: string, mimeType: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
