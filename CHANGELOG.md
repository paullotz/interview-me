# Changelog

All notable changes to this project will be documented in this file. Format based on Keep a Changelog and Conventional Commits.

## [1.0.0] - 2026-09-12

### Added
- Initial public release
- `InterviewProvider`, `InterviewOverlay`, `useInterviewSession`
- Automatic click/route capture with `data-testid` / `data-interview-highlight` / `id` selectors
- Tagged notes: confusion, bug, idea, quote, general
- Local-first storage: IndexedDB with localStorage/memory fallback
- Exports: `exportToMarkdown` with AI agent instructions and chronological timeline, `exportToJson`
- Dev-only by default (`NODE_ENV !== "production"` or `?interview=true`)

[1.0.0]: https://github.com/paullotz/interview-me/releases/tag/v1.0.0
