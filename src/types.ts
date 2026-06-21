export interface TranscriptionSegment {
  timestamp: string;
  speaker: string;
  originalText: string;
  translationText: string;
  spokenLanguage: string;
}

export interface VocabularyItem {
  phrase: string;
  originalLanguage: string;
  literalMeaning: string;
  culturalContext: string;
}

export interface TranscriptionResult {
  title: string;
  summary: string;
  dominantLanguage: string;
  confidenceScore: string;
  languageMixPercentage: string;
  segments: TranscriptionSegment[];
  vocabulary: VocabularyItem[];
}

export interface SavedSession {
  id: string;
  timestamp: string;
  audioName: string;
  audioDuration?: string;
  result: TranscriptionResult;
  promptMode: "bilingual" | "hausa-only" | "english-only" | "vocab";
}

// Response from GET /api/transcribe/status/:jobId (background-job flow)
export interface TranscribeJobStatus {
  state: "processing" | "done" | "error";
  progress: number; // 0..100
  stage: string; // human-readable message, e.g. "Transcribing part 3 of 8…"
  totalChunks?: number;
  doneChunks?: number;
  result?: TranscriptionResult; // present only when state === "done"
  error?: string; // present only when state === "error"
}
