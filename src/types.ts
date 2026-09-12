export type SessionEvent =
  | {
      type: "route";
      path: string;
      timestamp: number;
    }
  | {
      type: "click";
      selector: string;
      text?: string;
      timestamp: number;
    };

export type NoteTag = "confusion" | "bug" | "idea" | "quote" | "general";

export interface InterviewNote {
  id: string;
  type: "text";
  content: string;
  timestamp: number;
  tag?: NoteTag;
}

export interface InterviewSession {
  id: string;
  title: string;
  user?: string;
  feature?: string;
  startTime: number;
  endTime?: number;
  events: SessionEvent[];
  notes: InterviewNote[];
}

export interface StartSessionOptions {
  title?: string;
  user?: string;
  feature?: string;
}

export interface InterviewContextValue {
  session: InterviewSession | null;
  isRecording: boolean;
  isPaused: boolean;
  elapsedMs: number;
  startSession: (options?: StartSessionOptions) => string;
  stopSession: () => Promise<InterviewSession | null>;
  pauseSession: () => void;
  resumeSession: () => void;
  addNote: (content: string, tag?: NoteTag) => InterviewNote;
  recordEvent: (event: SessionEvent) => void;
  sessions: InterviewSession[];
  loadSessions: () => Promise<InterviewSession[]>;
  deleteSession: (id: string) => Promise<void>;
  clearAllSessions: () => Promise<void>;
}
