"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useInterviewSession } from "./context";
import { formatDuration, exportToMarkdown, exportToJson, downloadFile, formatRelativeTime } from "./export";
import type { InterviewSession, NoteTag } from "./types";

export interface InterviewOverlayProps {
  /**
   * Explicitly enable or disable the overlay.
   * If not provided, automatically defaults to enabled in development (NODE_ENV !== "production")
   * or when URL contains ?interview=true.
   */
  enabled?: boolean;
  /**
   * Screen position for the floating widget.
   * Default is "bottom-right".
   */
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

const TAG_CONFIG: Record<
  NoteTag,
  { label: string; activeClass: string; inactiveClass: string; badgeClass: string }
> = {
  confusion: {
    label: "Confusion",
    activeClass: "bg-amber-600 text-white border-amber-600",
    inactiveClass: "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100",
    badgeClass: "bg-amber-100 text-amber-900",
  },
  bug: {
    label: "Bug",
    activeClass: "bg-red-600 text-white border-red-600",
    inactiveClass: "bg-red-50 text-red-900 border-red-200 hover:bg-red-100",
    badgeClass: "bg-red-100 text-red-900",
  },
  idea: {
    label: "Idea",
    activeClass: "bg-emerald-600 text-white border-emerald-600",
    inactiveClass: "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100",
    badgeClass: "bg-emerald-100 text-emerald-900",
  },
  quote: {
    label: "Quote",
    activeClass: "bg-purple-600 text-white border-purple-600",
    inactiveClass: "bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100",
    badgeClass: "bg-purple-100 text-purple-900",
  },
  general: {
    label: "Note",
    activeClass: "bg-slate-700 text-white border-slate-700",
    inactiveClass: "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200",
    badgeClass: "bg-slate-100 text-slate-800",
  },
};

export function InterviewOverlay({ enabled, position = "bottom-right" }: InterviewOverlayProps) {
  const {
    session,
    isRecording,
    isPaused,
    elapsedMs,
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    addNote,
    sessions,
    loadSessions,
    deleteSession,
  } = useInterviewSession();

  const [isClient, setIsClient] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"record" | "history">("record");
  const [selectedSessionForView, setSelectedSessionForView] = useState<InterviewSession | null>(null);

  // Form states
  const [startTitle, setStartTitle] = useState("");
  const [startUser, setStartUser] = useState("");
  const [startFeature, setStartFeature] = useState("");

  // Note states
  const [noteContent, setNoteContent] = useState("");
  const [selectedTag, setSelectedTag] = useState<NoteTag>("confusion");
  const [noteSuccessToast, setNoteSuccessToast] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Determine visibility: dev or query param
  const shouldRender = useMemo(() => {
    if (typeof enabled === "boolean") return enabled;
    if (typeof window === "undefined") return false;
    const isDev = process.env.NODE_ENV !== "production";
    const hasQuery = new URLSearchParams(window.location.search).get("interview") === "true";
    const hasStorage = window.localStorage.getItem("interview-me:enabled") === "true";
    return isDev || hasQuery || hasStorage;
  }, [enabled]);

  // Position class mapping
  const positionClass = useMemo(() => {
    switch (position) {
      case "bottom-left":
        return "bottom-5 left-5";
      case "top-right":
        return "top-5 right-5";
      case "top-left":
        return "top-5 left-5";
      case "bottom-right":
      default:
        return "bottom-5 right-5";
    }
  }, [position]);

  if (!isClient || !shouldRender) return null;

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    startSession({
      title: startTitle || undefined,
      user: startUser || undefined,
      feature: startFeature || undefined,
    });
    setStartTitle("");
    setStartUser("");
    setStartFeature("");
    setIsExpanded(true);
  };

  const handleAddNote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!noteContent.trim()) return;
    addNote(noteContent.trim(), selectedTag);
    setNoteContent("");
    setNoteSuccessToast(true);
    setTimeout(() => setNoteSuccessToast(false), 1500);
  };

  const handleKeyDownNote = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  const handleFinish = async () => {
    const finished = await stopSession();
    if (finished) {
      setSelectedSessionForView(finished);
      setActiveTab("history");
      setIsExpanded(true);
    }
  };

  return (
    <div
      data-interview-ui="true"
      className={`interview-me-root fixed z-[999999] font-sans text-xs text-slate-800 antialiased ${positionClass}`}
    >
      {/* Minimized Floating Pill */}
      {!isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full font-semibold text-white shadow-xl transition-all duration-200 border border-white/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
            isRecording ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-slate-800"
          }`}
        >
          {isRecording ? (
            <>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>REC {formatDuration(elapsedMs)}</span>
              {session && (
                <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">
                  {session.notes.length} notes
                </span>
              )}
            </>
          ) : (
            <>
              <span>Interview-Tool</span>
              {sessions.length > 0 && (
                <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">
                  {sessions.length}
                </span>
              )}
            </>
          )}
        </button>
      )}

      {/* Expanded Dialog / Panel */}
      {isExpanded && (
        <div className="w-[380px] max-h-[85vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden text-xs">
          {/* Header */}
          <div
            className={`px-4 py-3 border-b flex items-center justify-between ${
              isRecording ? "bg-red-50/70 border-red-100" : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {isRecording ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-red-900 tracking-wide">
                      RECORDING ACTIVE ({formatDuration(elapsedMs)})
                    </div>
                    <div className="text-[11px] text-red-700 truncate max-w-[220px]">
                      {session?.title}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm font-bold text-slate-900">Interview-Dev-Tool</div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                title="Minimize"
                className="text-slate-400 hover:text-slate-700 px-2 py-0.5 rounded hover:bg-black/5 font-bold text-sm transition-colors cursor-pointer"
              >
                _
              </button>
            </div>
          </div>

          {/* Tab Navigation if not currently in active recording */}
          {!isRecording && (
            <div className="flex border-b border-slate-200 bg-slate-100">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("record");
                  setSelectedSessionForView(null);
                }}
                className={`flex-1 py-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === "record"
                    ? "bg-white text-blue-600 border-blue-600"
                    : "text-slate-500 hover:text-slate-900 border-transparent bg-transparent"
                }`}
              >
                + New Session
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("history");
                  loadSessions();
                }}
                className={`flex-1 py-2 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === "history"
                    ? "bg-white text-blue-600 border-blue-600"
                    : "text-slate-500 hover:text-slate-900 border-transparent bg-transparent"
                }`}
              >
                Saved Sessions ({sessions.length})
              </button>
            </div>
          )}

          {/* Body Content */}
          <div className="p-4 overflow-y-auto flex-1">
            {/* RECORDING MODE */}
            {isRecording && session && (
              <div className="flex flex-col gap-3.5">
                {/* Note composer */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="font-semibold text-xs text-slate-700">Add quick note:</label>
                    {noteSuccessToast && (
                      <span className="text-[11px] text-emerald-600 font-semibold">
                        Note saved
                      </span>
                    )}
                  </div>

                  {/* Tag Selector Chips */}
                  <div className="flex gap-1 flex-wrap mb-2">
                    {(["confusion", "bug", "idea", "quote", "general"] as NoteTag[]).map((t) => {
                      const cfg = TAG_CONFIG[t];
                      const isSelected = selectedTag === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTag(t)}
                          className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                            isSelected ? cfg.activeClass : cfg.inactiveClass
                          }`}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>

                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    onKeyDown={handleKeyDownNote}
                    placeholder="What did you observe? (Press Enter to save)"
                    rows={3}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 resize-none font-sans"
                  />

                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-[11px] text-slate-400">
                      Tip: Enter = save, Shift+Enter = line break
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddNote()}
                      disabled={!noteContent.trim()}
                      className="px-3 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
                    >
                      + Note
                    </button>
                  </div>
                </div>

                {/* Live Stats */}
                <div className="flex justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 font-medium">
                  <div>
                    Clicks & Routes: <strong className="text-slate-900">{session.events.length}</strong>
                  </div>
                  <div>
                    Notes: <strong className="text-slate-900">{session.notes.length}</strong>
                  </div>
                </div>

                {/* Recent notes list in current session */}
                {session.notes.length > 0 && (
                  <div>
                    <div className="font-semibold text-[11px] text-slate-500 uppercase tracking-wider mb-1.5">
                      Current Notes ({session.notes.length})
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                      {[...session.notes].reverse().map((n) => {
                        const tag = n.tag || "general";
                        const cfg = TAG_CONFIG[tag];
                        return (
                          <div
                            key={n.id}
                            className="p-2 rounded-md bg-white border border-slate-200 text-xs shadow-xs"
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${cfg.badgeClass}`}
                              >
                                {cfg.label}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {formatRelativeTime(session.startTime, n.timestamp)}
                              </span>
                            </div>
                            <div className="text-slate-800 break-words">{n.content}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Finish & Pause Actions */}
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="flex-[2] py-2.5 px-3.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 active:bg-red-800 transition-colors cursor-pointer shadow-xs"
                  >
                    Finish & Export Session
                  </button>

                  <button
                    type="button"
                    onClick={() => (isPaused ? resumeSession() : pauseSession())}
                    className="flex-1 py-2.5 px-2.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    {isPaused ? "Resume" : "Pause"}
                  </button>
                </div>
              </div>
            )}

            {/* START SESSION FORM */}
            {!isRecording && activeTab === "record" && (
              <form onSubmit={handleStart} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Session Title (optional)
                  </label>
                  <input
                    type="text"
                    value={startTitle}
                    onChange={(e) => setStartTitle(e.target.value)}
                    placeholder="e.g. Checkout flow usability test"
                    className="w-full px-2.5 py-2 rounded-md border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    User / Pseudonym (optional)
                  </label>
                  <input
                    type="text"
                    value={startUser}
                    onChange={(e) => setStartUser(e.target.value)}
                    placeholder="e.g. Dr. Miller / Clinic Assistant"
                    className="w-full px-2.5 py-2 rounded-md border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Feature / Flow (optional)
                  </label>
                  <input
                    type="text"
                    value={startFeature}
                    onChange={(e) => setStartFeature(e.target.value)}
                    placeholder="e.g. Appointment Booking Flow"
                    className="w-full px-2.5 py-2 rounded-md border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                  <strong>Local-First & Privacy:</strong> Data is stored entirely inside your browser.
                  Clicks and route changes are logged automatically.
                </div>

                <button
                  type="submit"
                  className="mt-1 w-full py-2.5 px-4 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 active:bg-blue-800 transition-colors cursor-pointer shadow-xs"
                >
                  Start Interview Session
                </button>
              </form>
            )}

            {/* SAVED SESSIONS LIST / DETAIL */}
            {!isRecording && activeTab === "history" && (
              <div>
                {selectedSessionForView ? (
                  /* Detail inspection view */
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => setSelectedSessionForView(null)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                      >
                        Back to list
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm("Are you sure you want to delete this session?")) {
                            await deleteSession(selectedSessionForView.id);
                            setSelectedSessionForView(null);
                          }
                        }}
                        className="text-[11px] font-medium text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>

                    <div>
                      <div className="font-bold text-sm text-slate-900">
                        {selectedSessionForView.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(selectedSessionForView.startTime).toLocaleString("en-US")} • Duration:{" "}
                        {formatDuration(
                          (selectedSessionForView.endTime ?? selectedSessionForView.startTime) -
                            selectedSessionForView.startTime
                        )}
                      </div>
                    </div>

                    {/* Export buttons */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const md = exportToMarkdown(selectedSessionForView);
                          downloadFile(
                            `interview-${selectedSessionForView.id.slice(0, 8)}.md`,
                            md,
                            "text/markdown"
                          );
                        }}
                        className="flex-1 py-2 px-2.5 rounded-md bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer text-center shadow-xs"
                      >
                        Export Markdown (.md)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const json = exportToJson(selectedSessionForView);
                          downloadFile(
                            `interview-${selectedSessionForView.id.slice(0, 8)}.json`,
                            json,
                            "application/json"
                          );
                        }}
                        className="flex-1 py-2 px-2.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer text-center"
                      >
                        Export JSON (.json)
                      </button>
                    </div>

                    {/* Notes in this session */}
                    <div>
                      <div className="font-semibold text-xs mb-1.5">
                        Notes ({selectedSessionForView.notes.length})
                      </div>
                      {selectedSessionForView.notes.length === 0 ? (
                        <div className="text-xs text-slate-400">No notes recorded.</div>
                      ) : (
                        <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto">
                          {selectedSessionForView.notes.map((n) => {
                            const cfg = TAG_CONFIG[n.tag || "general"];
                            return (
                              <div
                                key={n.id}
                                className="p-2 bg-slate-50 border border-slate-200 rounded-md text-xs shadow-xs"
                              >
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mr-1.5 ${cfg.badgeClass}`}
                                >
                                  {cfg.label}
                                </span>
                                <span className="text-slate-800">{n.content}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Events count */}
                    <div className="text-[11px] text-slate-500">
                      Captured interactions: {selectedSessionForView.events.length} events (routes & clicks).
                    </div>
                  </div>
                ) : (
                  /* Session list view */
                  <div>
                    {sessions.length === 0 ? (
                      <div className="text-center py-6 px-3 text-slate-400 text-xs">
                        No interviews saved yet. Start a session to record clicks and notes!
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {sessions.map((s) => (
                          <div
                            key={s.id}
                            className="p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex justify-between items-center cursor-pointer transition-colors shadow-xs"
                            onClick={() => setSelectedSessionForView(s)}
                          >
                            <div>
                              <div className="font-semibold text-xs text-slate-900">
                                {s.title}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {new Date(s.startTime).toLocaleDateString("en-US")} • {s.notes.length} notes •{" "}
                                {s.events.length} events
                              </div>
                            </div>
                            <span className="text-xs text-blue-600 font-semibold">Open</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
