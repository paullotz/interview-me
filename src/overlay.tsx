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

const TAG_CONFIG: Record<NoteTag, { label: string; icon: string; bg: string; color: string; border: string }> = {
  confusion: {
    label: "Confusion",
    icon: "❓",
    bg: "#fef3c7",
    color: "#92400e",
    border: "#fcd34d",
  },
  bug: {
    label: "Bug",
    icon: "🐛",
    bg: "#fee2e2",
    color: "#991b1b",
    border: "#fca5a5",
  },
  idea: {
    label: "Idee",
    icon: "💡",
    bg: "#ecfdf5",
    color: "#065f46",
    border: "#6ee7b7",
  },
  quote: {
    label: "Quote",
    icon: "💬",
    bg: "#f3e8ff",
    color: "#6b21a8",
    border: "#d8b4fe",
  },
  general: {
    label: "Notiz",
    icon: "📝",
    bg: "#f1f5f9",
    color: "#334155",
    border: "#cbd5e1",
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

  // Position CSS mapping
  const positionStyle: React.CSSProperties = useMemo(() => {
    switch (position) {
      case "bottom-left":
        return { bottom: "20px", left: "20px" };
      case "top-right":
        return { top: "20px", right: "20px" };
      case "top-left":
        return { top: "20px", left: "20px" };
      case "bottom-right":
      default:
        return { bottom: "20px", right: "20px" };
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
      className="interview-me-root"
      style={{
        position: "fixed",
        zIndex: 999999,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        fontSize: "13px",
        color: "#1e293b",
        ...positionStyle,
      }}
    >
      {/* Minimized Floating Pill */}
      {!isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 14px",
            borderRadius: "9999px",
            backgroundColor: isRecording ? "#dc2626" : "#0f172a",
            color: "#ffffff",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "13px",
            transition: "all 0.2s ease",
          }}
        >
          {isRecording ? (
            <>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  animation: "interview-pulse 1.2s infinite ease-in-out",
                }}
              />
              <span>REC {formatDuration(elapsedMs)}</span>
              {session && (
                <span
                  style={{
                    backgroundColor: "rgba(255,255,255,0.2)",
                    padding: "2px 7px",
                    borderRadius: "9999px",
                    fontSize: "11px",
                  }}
                >
                  {session.notes.length} Notizen
                </span>
              )}
            </>
          ) : (
            <>
              <span style={{ fontSize: "14px" }}>🎙️</span>
              <span>Interview-Tool</span>
              {sessions.length > 0 && (
                <span
                  style={{
                    backgroundColor: "rgba(255,255,255,0.2)",
                    padding: "2px 6px",
                    borderRadius: "9999px",
                    fontSize: "11px",
                  }}
                >
                  {sessions.length}
                </span>
              )}
            </>
          )}
        </button>
      )}

      {/* Expanded Dialog / Panel */}
      {isExpanded && (
        <div
          style={{
            width: "380px",
            maxHeight: "85vh",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow:
              "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 1px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #e2e8f0",
              backgroundColor: isRecording ? "#fef2f2" : "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isRecording ? (
                <>
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: "#dc2626",
                      animation: "interview-pulse 1.2s infinite ease-in-out",
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "#991b1b" }}>
                      AUFNAHME AKTIV ({formatDuration(elapsedMs)})
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#7f1d1d",
                        maxWidth: "200px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {session?.title}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "16px" }}>🎙️</span>
                  <span style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>
                    Interview-Dev-Tool
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                title="Minimieren"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                _
              </button>
            </div>
          </div>

          {/* Tab Navigation if not currently in active recording */}
          {!isRecording && (
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid #e2e8f0",
                backgroundColor: "#f1f5f9",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveTab("record");
                  setSelectedSessionForView(null);
                }}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  border: "none",
                  borderBottom: activeTab === "record" ? "2px solid #2563eb" : "2px solid transparent",
                  backgroundColor: activeTab === "record" ? "#ffffff" : "transparent",
                  color: activeTab === "record" ? "#2563eb" : "#64748b",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                + Neue Session
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("history");
                  loadSessions();
                }}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  border: "none",
                  borderBottom: activeTab === "history" ? "2px solid #2563eb" : "2px solid transparent",
                  backgroundColor: activeTab === "history" ? "#ffffff" : "transparent",
                  color: activeTab === "history" ? "#2563eb" : "#64748b",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Gespeicherte Sessions ({sessions.length})
              </button>
            </div>
          )}

          {/* Body Content */}
          <div style={{ padding: "16px", overflowY: "auto", flex: 1 }}>
            {/* RECORDING MODE */}
            {isRecording && session && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Note composer */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                    }}
                  >
                    <label style={{ fontWeight: 600, fontSize: "12px", color: "#334155" }}>
                      Schnellnotiz hinzufügen:
                    </label>
                    {noteSuccessToast && (
                      <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>
                        ✓ Notiz gespeichert!
                      </span>
                    )}
                  </div>

                  {/* Tag Selector Chips */}
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
                    {(["confusion", "bug", "idea", "quote", "general"] as NoteTag[]).map((t) => {
                      const cfg = TAG_CONFIG[t];
                      const isSelected = selectedTag === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTag(t)}
                          style={{
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                            backgroundColor: isSelected ? cfg.color : cfg.bg,
                            color: isSelected ? "#ffffff" : cfg.color,
                            border: `1px solid ${cfg.border}`,
                            transition: "all 0.15s ease",
                          }}
                        >
                          {cfg.icon} {cfg.label}
                        </button>
                      );
                    })}
                  </div>

                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    onKeyDown={handleKeyDownNote}
                    placeholder="Was beobachtest du? (Drücke Enter zum Speichern)"
                    rows={3}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                      fontFamily: "inherit",
                      resize: "none",
                      outline: "none",
                    }}
                  />

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                      Tipp: Enter = Speichern, Shift+Enter = Zeilenumbruch
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddNote()}
                      disabled={!noteContent.trim()}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "6px",
                        backgroundColor: noteContent.trim() ? "#0f172a" : "#e2e8f0",
                        color: noteContent.trim() ? "#ffffff" : "#94a3b8",
                        border: "none",
                        fontWeight: 600,
                        fontSize: "12px",
                        cursor: noteContent.trim() ? "pointer" : "default",
                      }}
                    >
                      + Notiz
                    </button>
                  </div>
                </div>

                {/* Live Stats */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "11px",
                    color: "#475569",
                  }}
                >
                  <div>
                    Klicks & Routes: <strong>{session.events.length}</strong>
                  </div>
                  <div>
                    Notizen: <strong>{session.notes.length}</strong>
                  </div>
                </div>

                {/* Recent notes list in current session */}
                {session.notes.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "11px",
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: "6px",
                      }}
                    >
                      Aktuelle Notizen ({session.notes.length})
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        maxHeight: "160px",
                        overflowY: "auto",
                      }}
                    >
                      {[...session.notes].reverse().map((n) => {
                        const tag = n.tag || "general";
                        const cfg = TAG_CONFIG[tag];
                        return (
                          <div
                            key={n.id}
                            style={{
                              padding: "6px 10px",
                              borderRadius: "6px",
                              backgroundColor: "#ffffff",
                              border: "1px solid #e2e8f0",
                              fontSize: "12px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "2px",
                              }}
                            >
                              <span
                                style={{
                                  padding: "1px 5px",
                                  borderRadius: "4px",
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  backgroundColor: cfg.bg,
                                  color: cfg.color,
                                }}
                              >
                                {cfg.icon} {cfg.label}
                              </span>
                              <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                                {formatRelativeTime(session.startTime, n.timestamp)}
                              </span>
                            </div>
                            <div style={{ color: "#1e293b", wordBreak: "break-word" }}>{n.content}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Finish & Pause Actions */}
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <button
                    type="button"
                    onClick={handleFinish}
                    style={{
                      flex: 2,
                      padding: "9px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#dc2626",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: 600,
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    ⏹ Session beenden & Exportieren
                  </button>

                  <button
                    type="button"
                    onClick={() => (isPaused ? resumeSession() : pauseSession())}
                    style={{
                      flex: 1,
                      padding: "9px 10px",
                      borderRadius: "8px",
                      backgroundColor: "#f1f5f9",
                      color: "#334155",
                      border: "1px solid #cbd5e1",
                      fontWeight: 600,
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    {isPaused ? "▶ Weiter" : "⏸ Pause"}
                  </button>
                </div>
              </div>
            )}

            {/* START SESSION FORM */}
            {!isRecording && activeTab === "record" && (
              <form onSubmit={handleStart} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>
                    Session-Titel (optional)
                  </label>
                  <input
                    type="text"
                    value={startTitle}
                    onChange={(e) => setStartTitle(e.target.value)}
                    placeholder="z.B. Feedback Zahnarzt Praxis-Setup"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>
                    Nutzer / Pseudonym (optional)
                  </label>
                  <input
                    type="text"
                    value={startUser}
                    onChange={(e) => setStartUser(e.target.value)}
                    placeholder="z.B. Dr. Müller / Ordinationsassistenz"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>
                    Feature / Flow (optional)
                  </label>
                  <input
                    type="text"
                    value={startFeature}
                    onChange={(e) => setStartFeature(e.target.value)}
                    placeholder="z.B. Zahnschema & Honorarnote"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                      outline: "none",
                    }}
                  />
                </div>

                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "11px",
                    color: "#64748b",
                    lineHeight: "1.4",
                  }}
                >
                  🔒 <strong>Local-First & Privacy:</strong> Daten werden ausschließlich in deinem Browser
                  gespeichert. Klicks und Routen werden automatisch mitgeloggt.
                </div>

                <button
                  type="submit"
                  style={{
                    marginTop: "4px",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <span>⏺</span>
                  <span>Interview Session Starten</span>
                </button>
              </form>
            )}

            {/* SAVED SESSIONS LIST / DETAIL */}
            {!isRecording && activeTab === "history" && (
              <div>
                {selectedSessionForView ? (
                  /* Detail inspection view */
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedSessionForView(null)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#2563eb",
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "12px",
                          padding: 0,
                        }}
                      >
                        ← Zurück zur Liste
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm("Diese Session wirklich löschen?")) {
                            await deleteSession(selectedSessionForView.id);
                            setSelectedSessionForView(null);
                          }
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#dc2626",
                          cursor: "pointer",
                          fontSize: "11px",
                        }}
                      >
                        🗑 Löschen
                      </button>
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>
                        {selectedSessionForView.title}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                        {new Date(selectedSessionForView.startTime).toLocaleString("de-AT")} • Dauer:{" "}
                        {formatDuration(
                          (selectedSessionForView.endTime ?? selectedSessionForView.startTime) -
                            selectedSessionForView.startTime
                        )}
                      </div>
                    </div>

                    {/* Export buttons */}
                    <div style={{ display: "flex", gap: "8px" }}>
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
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          borderRadius: "6px",
                          backgroundColor: "#0f172a",
                          color: "#ffffff",
                          border: "none",
                          fontWeight: 600,
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        📄 Export .MD
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
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          borderRadius: "6px",
                          backgroundColor: "#f1f5f9",
                          color: "#334155",
                          border: "1px solid #cbd5e1",
                          fontWeight: 600,
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        📦 Export .JSON
                      </button>
                    </div>

                    {/* Notes in this session */}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "6px" }}>
                        Notizen ({selectedSessionForView.notes.length})
                      </div>
                      {selectedSessionForView.notes.length === 0 ? (
                        <div style={{ fontSize: "12px", color: "#94a3b8" }}>Keine Notizen erfasst.</div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                            maxHeight: "180px",
                            overflowY: "auto",
                          }}
                        >
                          {selectedSessionForView.notes.map((n) => {
                            const cfg = TAG_CONFIG[n.tag || "general"];
                            return (
                              <div
                                key={n.id}
                                style={{
                                  padding: "6px 8px",
                                  backgroundColor: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                }}
                              >
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "1px 5px",
                                    borderRadius: "4px",
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    backgroundColor: cfg.bg,
                                    color: cfg.color,
                                    marginRight: "6px",
                                  }}
                                >
                                  {cfg.icon} {cfg.label}
                                </span>
                                <span>{n.content}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Events count */}
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      Erfasste Interaktionen: {selectedSessionForView.events.length} Events (Routen & Klicks).
                    </div>
                  </div>
                ) : (
                  /* Session list view */
                  <div>
                    {sessions.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "24px 12px",
                          color: "#94a3b8",
                          fontSize: "12px",
                        }}
                      >
                        Noch keine Interviews gespeichert. Starte eine Session, um Klicks und Notizen aufzuzeichnen!
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {sessions.map((s) => (
                          <div
                            key={s.id}
                            style={{
                              padding: "10px 12px",
                              borderRadius: "8px",
                              border: "1px solid #e2e8f0",
                              backgroundColor: "#ffffff",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              cursor: "pointer",
                              transition: "background 0.15s ease",
                            }}
                            onClick={() => setSelectedSessionForView(s)}
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "12px", color: "#0f172a" }}>
                                {s.title}
                              </div>
                              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                                {new Date(s.startTime).toLocaleDateString("de-AT")} • {s.notes.length} Notizen •{" "}
                                {s.events.length} Events
                              </div>
                            </div>
                            <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: 600 }}>Öffnen →</span>
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

      {/* Embedded keyframe style for recording dot pulse */}
      <style>{`
        @keyframes interview-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}
