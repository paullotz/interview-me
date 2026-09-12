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
  const formattedDate = new Date(startTime).toLocaleString("de-AT", {
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
  lines.push(`> Exportiert aus **Interview-Dev-Tool** am ${new Date().toLocaleString("de-AT")}`);
  lines.push("");

  // Metadata Table
  lines.push("## Session-Metadaten");
  lines.push("");
  lines.push("| Parameter | Wert |");
  lines.push("| :--- | :--- |");
  lines.push(`| **Datum** | ${formattedDate} |`);
  lines.push(`| **Dauer** | ${durationStr} |`);
  lines.push(`| **User / Pseudonym** | ${session.user || "—"} |`);
  lines.push(`| **Feature / Flow** | ${session.feature || "—"} |`);
  lines.push(`| **Events erfasst** | ${events.length} |`);
  lines.push(`| **Notizen erstellt** | ${notes.length} |`);
  lines.push("");

  // Tag distribution summary
  lines.push("### Insights-Übersicht");
  lines.push("");
  lines.push(
    `- **Verwirrung / Confusion**: ${tagCounts.confusion}` +
      `\n- **Bugs**: ${tagCounts.bug}` +
      `\n- **Ideen / Feature Requests**: ${tagCounts.idea}` +
      `\n- **Nutzerzitate (Quotes)**: ${tagCounts.quote}` +
      `\n- **Allgemeine Notizen**: ${tagCounts.general}`
  );
  lines.push("");

  // Developer Action Items / Issues Section
  const bugsAndConfusion = notes.filter((n) => n.tag === "bug" || n.tag === "confusion");
  if (bugsAndConfusion.length > 0) {
    lines.push("## Handlungsbedarf für Entwickler (Action Items)");
    lines.push("");
    lines.push("Aus den Notizen identifizierte Reibungspunkte und Fehler:");
    lines.push("");
    for (const item of bugsAndConfusion) {
      const tagLabel = item.tag === "bug" ? "BUG" : "CONFUSION";
      const relTime = formatRelativeTime(startTime, item.timestamp);
      lines.push(`- [ ] **[${tagLabel}]** \`${relTime}\`: ${item.content}`);
    }
    lines.push("");
  }

  // Notes Section
  lines.push("## Alle Notizen");
  lines.push("");
  if (notes.length === 0) {
    lines.push("_Keine Notizen in dieser Session erfasst._");
  } else {
    lines.push("| Zeit | Typ | Notiz |");
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
  lines.push("## Chronologische Timeline (Klicks, Routes & Notizen)");
  lines.push("");
  lines.push("| Zeit | Typ | Details |");
  lines.push("| :--- | :--- | :--- |");
  lines.push(`| \`+00:00\` | **Start** | Session gestartet: *${session.title}* |`);

  for (const item of timeline) {
    const relTime = formatRelativeTime(startTime, item.timestamp);
    if (item.kind === "note") {
      const tag = (item.data.tag || "general").toUpperCase();
      const text = item.data.content.replace(/\|/g, "\\|").replace(/\n/g, " ");
      lines.push(`| \`${relTime}\` | **NOTE [${tag}]** | "${text}" |`);
    } else {
      const ev = item.data;
      if (ev.type === "route") {
        lines.push(`| \`${relTime}\` | **Route** | Navigation zu \`${ev.path}\` |`);
      } else if (ev.type === "click") {
        const textSnippet = ev.text ? ` ("${ev.text.replace(/\|/g, "\\|")}")` : "";
        lines.push(`| \`${relTime}\` | **Click** | \`${ev.selector}\`${textSnippet} |`);
      }
    }
  }

  lines.push(`| \`+${durationStr}\` | **Ende** | Session beendet |`);
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
