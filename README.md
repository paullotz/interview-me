# @paullotz/interview-me

> **Local-First User Interview Dev Tool & Handoff Generator for Next.js**

Capture real behavioral insights from user interviews inside your Next.js application without voice recordings, external tracking services, or complex backends. All data stays 100% private in the browser (IndexedDB / localStorage) and exports directly to structured Markdown and JSON for developers and AI agents.

---

## Features

- 🎙️ **Zero-Friction Interview Recording**: Start and stop sessions with a single click.
- 👆 **Automatic Interaction Capture**: Tracks button clicks, links, form interactions, and route changes with clean semantic selectors.
- 📝 **Live Contextual Notes**: Jot down observations, quotes, and pain points tagged with:
  - ❓ `confusion`
  - 🐛 `bug`
  - 💡 `idea`
  - 💬 `quote`
  - 📝 `general`
- 🔒 **Local-First & Privacy-Focused**: Stored in browser IndexedDB with automatic localStorage fallback.
- 📦 **One-Click Dev Handoff**:
  - **Markdown (`.md`)**: Human-readable report with metadata, note categorization, action items for developers, and a unified chronological timeline.
  - **JSON (`.json`)**: Machine-readable format ready for Jira, Linear, GitHub Issues, or AI spec generation.
- 🛡️ **Dev-Only by Default**: Automatically hidden in production builds (`process.env.NODE_ENV === "production"`), or toggleable via `?interview=true`.

---

## Installation

Inside a monorepo workspace:

```bash
pnpm add @paullotz/interview-me --filter web
```

Or standalone:

```bash
pnpm add @paullotz/interview-me
```

---

## Quick Start (Next.js App Router)

In your root layout (`app/layout.tsx`):

```tsx
import { InterviewProvider, InterviewOverlay } from "@paullotz/interview-me";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <InterviewProvider>
          {children}
          <InterviewOverlay />
        </InterviewProvider>
      </body>
    </html>
  );
}
```

That's it! In development mode (`npm run dev`), a floating widget will appear at the bottom-right corner.

---

## Customizing & Headless Usage

You can also access the session state programmatically using `useInterviewSession`:

```tsx
"use client";

import { useInterviewSession } from "@paullotz/interview-me";

export function CustomInterviewBar() {
  const { isRecording, startSession, stopSession, addNote } = useInterviewSession();

  return (
    <div>
      {isRecording ? (
        <button onClick={() => stopSession()}>Stop</button>
      ) : (
        <button onClick={() => startSession({ title: "User Feedback" })}>Start</button>
      )}
      <button onClick={() => addNote("User hesitated on checkout button", "confusion")}>
        Log Confusion
      </button>
    </div>
  );
}
```

---

## Highlight Priority Targets

To automatically highlight specific priority components during an interview, add `data-interview-highlight` to any element:

```tsx
<button data-interview-highlight="primary-checkout-cta">
  Termin bestätigen
</button>
```

---

## License

MIT © [Paul Lotz](https://github.com/paullotz)
