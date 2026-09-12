# interview-me

> **Local-First User Interview Tool & Instruction Generator**

[![npm version](https://img.shields.io/npm/v/@paullotz/interview-me?style=flat&color=0e7066)](https://www.npmjs.com/package/@paullotz/interview-me)
[![npm downloads](https://img.shields.io/npm/dm/@paullotz/interview-me?style=flat)](https://www.npmjs.com/package/@paullotz/interview-me)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/paullotz/interview-me/actions/workflows/ci.yml/badge.svg)](https://github.com/paullotz/interview-me/actions/workflows/ci.yml)

Capture real behavioral insights from user interviews inside your Next.js application without voice recordings, external tracking services, or complex backends. All data stays 100% private in the browser (IndexedDB / localStorage) and exports directly to structured Markdown and JSON for developers and AI agents.

**Open source, MIT, local-first. No backend, no tracking, no data leaves the browser.**

---

## Why interview-me over maze, sprig, posthog replay?

| | interview-me | Maze / Sprig | PostHog replay |
|---|---|---|---|
| Setup | 3 lines, zero backend | Cloud account + SDK | Cloud account + SDK |
| Data residency | 100% browser (IndexedDB) | US/EU cloud | Cloud |
| Cost for 10 interviews | Free | $99+ | $0 but noisy |
| Export | Markdown with AI instructions + JSON for Linear/Jira | Figma/video | Session replay only |
| Works in dev without config | Yes, dev-only by default | No | No |

Built for teams that want **signal, not surveillance**.

---

## Features

- **Zero-Friction Interview Recording**: Start and stop sessions with a single click.
- **Automatic Interaction Capture**: Tracks button clicks, links, form interactions, and route changes with clean semantic selectors.
- **Live Contextual Notes**: Jot down observations, quotes, and pain points tagged with:
  - `confusion`
  - `bug`
  - `idea`
  - `quote`
  - `general`
- **Local-First & Privacy-Focused**: Stored in browser IndexedDB with automatic localStorage fallback.
- **One-Click Dev Handoff**:
  - **Markdown (`.md`)**: Human-readable report with metadata, note categorization, action items for developers, and a unified chronological timeline.
  - **JSON (`.json`)**: Machine-readable format ready for Jira, Linear, GitHub Issues, or AI spec generation.
- **Dev-Only by Default**: Automatically hidden in production builds (`process.env.NODE_ENV === "production"`), or toggleable via `?interview=true`.

---

## Installation

Inside a monorepo workspace:

```bash
pnpm add @paullotz/interview-me --filter web
```

Or standalone:

```bash
pnpm add @paullotz/interview-me
npm install @paullotz/interview-me
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

That is it. In development mode (`npm run dev`), a floating widget will appear at the bottom-right corner.

### Tailwind CSS Setup

The UI is styled with Tailwind CSS utility classes. Ensure your app's Tailwind configuration includes `@paullotz/interview-me`:

**Tailwind v4** (`globals.css`):
```css
@import "tailwindcss";
@source "node_modules/@paullotz/interview-me/src";
/* or dist, both work: */
@source "node_modules/@paullotz/interview-me/dist";
/* monorepo workspace: */
@source "../../../packages/interview-me/src";
```

**Tailwind v3** (`tailwind.config.js`):
```js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@paullotz/interview-me/src/**/*.{js,ts,jsx,tsx}",
  ],
};
```

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

## Cloud waitlist and paid support

This package is MIT and will stay MIT. To fund maintenance, a hosted team workspace is coming: cloud sync, share links, AI summaries, Linear/Jira one-click issues.

- Join the waitlist: https://github.com/paullotz/interview-me/discussions (open a Discussion)
- Sponsor: https://github.com/sponsors/paullotz
- Need research ops setup for your Next.js team? Email `paul@paullotz.com`

See `LAUNCH_CHECKLIST.md` for the roadmap.

---

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build   # -> dist/
```

See `CONTRIBUTING.md` for commit style and release flow.

## License

MIT © [Paul Lotz](https://github.com/paullotz)
