"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import type {
  InterviewContextValue,
  InterviewNote,
  InterviewSession,
  NoteTag,
  SessionEvent,
  StartSessionOptions,
} from "./types";
import {
  clearActiveDraft,
  clearSessions,
  deleteSession as deleteSessionStorage,
  getAllSessions,
  loadActiveDraft,
  saveActiveDraft,
  saveSession as saveSessionStorage,
} from "./storage";
import { setupClickTracker, setupRouteTracker } from "./tracker";

const InterviewContext = createContext<InterviewContextValue | null>(null);

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function InterviewProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);

  // Ref to hold latest active session to avoid stale closures in event handlers
  const sessionRef = useRef<InterviewSession | null>(null);
  sessionRef.current = session;

  const isRecordingRef = useRef<boolean>(false);
  isRecordingRef.current = isRecording;

  const isPausedRef = useRef<boolean>(false);
  isPausedRef.current = isPaused;

  // Load past sessions from storage on mount
  const loadSessions = useCallback(async (): Promise<InterviewSession[]> => {
    try {
      const list = await getAllSessions();
      setSessions(list);
      return list;
    } catch (err) {
      console.warn("[interview-me] Failed to load sessions:", err);
      return [];
    }
  }, []);

  useEffect(() => {
    loadSessions();

    // Check for recovered active draft
    const draft = loadActiveDraft();
    if (draft && !draft.endTime) {
      setSession(draft);
      setIsRecording(true);
      setElapsedMs(Date.now() - draft.startTime);
    }
  }, [loadSessions]);

  // Timer interval
  useEffect(() => {
    if (!isRecording || isPaused || !session) return;

    const interval = setInterval(() => {
      setElapsedMs(Date.now() - session.startTime);
    }, 500);

    return () => clearInterval(interval);
  }, [isRecording, isPaused, session]);

  // Record an event into the current session
  const recordEvent = useCallback((event: SessionEvent) => {
    if (!isRecordingRef.current || isPausedRef.current) return;

    setSession((prev) => {
      if (!prev) return null;
      const updated: InterviewSession = {
        ...prev,
        events: [...prev.events, event],
      };
      saveActiveDraft(updated);
      return updated;
    });
  }, []);

  // Event trackers (clicks + routes)
  useEffect(() => {
    if (!isRecording || isPaused) return;

    const cleanupClick = setupClickTracker((event) => {
      recordEvent(event);
    });

    const cleanupRoute = setupRouteTracker((event) => {
      recordEvent(event);
    });

    return () => {
      cleanupClick();
      cleanupRoute();
    };
  }, [isRecording, isPaused, recordEvent]);

  // Start a new session
  const startSession = useCallback(
    (options?: StartSessionOptions): string => {
      const id = generateId();
      const startTime = Date.now();
      const title =
        options?.title?.trim() ||
        `Interview Session - ${new Date(startTime).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`;

      const newSession: InterviewSession = {
        id,
        title,
        user: options?.user?.trim() || undefined,
        feature: options?.feature?.trim() || undefined,
        startTime,
        events: [],
        notes: [],
      };

      setSession(newSession);
      setIsRecording(true);
      setIsPaused(false);
      setElapsedMs(0);
      saveActiveDraft(newSession);

      return id;
    },
    []
  );

  // Stop current session
  const stopSession = useCallback(async (): Promise<InterviewSession | null> => {
    const active = sessionRef.current;
    if (!active) return null;

    const completed: InterviewSession = {
      ...active,
      endTime: Date.now(),
    };

    setIsRecording(false);
    setIsPaused(false);
    setSession(null);
    setElapsedMs(0);
    clearActiveDraft();

    try {
      await saveSessionStorage(completed);
      await loadSessions();
    } catch (err) {
      console.error("[interview-me] Failed to save session:", err);
    }

    return completed;
  }, [loadSessions]);

  const pauseSession = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeSession = useCallback(() => {
    setIsPaused(false);
  }, []);

  const addNote = useCallback(
    (content: string, tag?: NoteTag): InterviewNote => {
      const note: InterviewNote = {
        id: generateId(),
        type: "text",
        content: content.trim(),
        timestamp: Date.now(),
        tag: tag || "general",
      };

      setSession((prev) => {
        if (!prev) return null;
        const updated: InterviewSession = {
          ...prev,
          notes: [...prev.notes, note],
        };
        saveActiveDraft(updated);
        return updated;
      });

      return note;
    },
    []
  );

  const deleteSession = useCallback(
    async (id: string): Promise<void> => {
      await deleteSessionStorage(id);
      await loadSessions();
      if (session?.id === id) {
        setSession(null);
        setIsRecording(false);
        clearActiveDraft();
      }
    },
    [loadSessions, session?.id]
  );

  const clearAllSessions = useCallback(async (): Promise<void> => {
    await clearSessions();
    setSessions([]);
    if (session) {
      setSession(null);
      setIsRecording(false);
      clearActiveDraft();
    }
  }, [session]);

  const value: InterviewContextValue = {
    session,
    isRecording,
    isPaused,
    elapsedMs,
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    addNote,
    recordEvent,
    sessions,
    loadSessions,
    deleteSession,
    clearAllSessions,
  };

  return <InterviewContext.Provider value={value}>{children}</InterviewContext.Provider>;
}

export function useInterviewSession(): InterviewContextValue {
  const context = useContext(InterviewContext);
  if (!context) {
    throw new Error("useInterviewSession must be used within an InterviewProvider");
  }
  return context;
}
