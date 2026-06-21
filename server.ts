import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import cors from "cors";
import multer from "multer";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "@ffprobe-installer/ffprobe";
import { spawn } from "node:child_process";
import os from "node:os";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { randomUUID } from "node:crypto";

// Load environment variables
dotenv.config();

const ffprobePath = ffprobe.path;
if (!ffmpegPath) {
  throw new Error("ffmpeg-static binary not found for this platform.");
}

const app = express();
// Hosts like Render / Cloud Run inject the port to listen on via PORT.
const PORT = Number(process.env.PORT) || 3000;

// Allow the frontend to call this API cross-origin (e.g. when the frontend is
// hosted on Netlify and this server runs on Render). Set ALLOWED_ORIGIN to lock
// it to your site; defaults to "*" (open) since no cookies/credentials are used.
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));

// High limit for handling JSON payloads (/api/ask sends the full transcript).
// NOTE: /api/transcribe/start is multipart (multer), so it bypasses these.
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));

let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Set it as an environment variable on your host (or in .env for local dev).");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

const MODEL = "gemini-3.5-flash";
const MAX_OUTPUT_TOKENS = 65536;

// ---- Chunking configuration -------------------------------------------------
const CHUNK_SEC = 900; // 15-minute windows (≈28.8k input tokens each at 16kHz mono)
const TARGET_SR = 16000; // 16 kHz
const CHUNK_EXT = "ogg";
const CHUNK_MIME = "audio/ogg";
const INTER_CHUNK_DELAY_MS = 6500; // keep us comfortably under ~10 RPM free-tier

// ---- Prompt + schema (preserved from original) ------------------------------
function getPromptInstruction(promptMode: string): string {
  if (promptMode === "bilingual") {
    return `
      Perform a professional, line-by-line VERBATIM TRANSCRIPTION of the provided audio recording.
      The audio may contain Hausa, English, or a mix of both (code-mixing/code-switching).
      - Transcribe exactly what was said, word for word, in 'originalText'. Keep Hausa text in Hausa and English text in English, and preserve code-mixed speech exactly as spoken. Do NOT translate or paraphrase.
      - Set 'spokenLanguage' of each segment correctly to either 'Hausa', 'English', or 'Bilingual Code-Mixed'.
      - Identify speakers and estimate conversational timestamps for each segment.
    `;
  } else if (promptMode === "hausa-only") {
    return `
      Perform transcription and translation where the ultimate target is Hausa.
      The audio can have Hausa, English, or both.
      - In 'originalText', transcribe the spoken words exactly.
      - In 'translationText', ensure everything is translated into natural, fluent Hausa. Even if they spoke English, write the Hausa translation here. If they spoke Hausa, provide a simplified Hausa rephrasing or explanation.
      - Set 'spokenLanguage' correctly.
      - Transcribe and summarize primarily with a focus on native Hausa speakers.
    `;
  } else if (promptMode === "english-only") {
    return `
      Perform transcription and translation where the ultimate target is English.
      The audio can have Hausa, English, or both.
      - In 'originalText', transcribe what was spoken verbatim.
      - In 'translationText', ensure everything is translated into natural, polished English. If they spoke Hausa, translate it. If they spoke English, provide the verbatim text or a natural polish.
      - Set 'spokenLanguage' correctly.
    `;
  } else {
    // Default / vocab focus
    return `
      Provide a line-by-line bilingual transcription and translation.
      Specially highlight regional vocabulary, linguistic borrowings, mixing styles, and colloquial local slang.
      - Keep Hausa as Hausa, English as English in 'originalText'.
      - Formulate high-quality English and Hausa alternate translations in 'translationText'.
      - Pay deep attention to local dialects or loanwords during transcription. Set 'spokenLanguage' correctly.
    `;
  }
}

const TRANSCRIBE_SYSTEM_INSTRUCTION = `
  You are an expert bilingual linguist, translator, and transcriber specializing in West African languages, particularly Hausa (including standard and regional dialects) and English.
  Your task is to analyze the audio clip and provide a precise transcription that is aware of bilingual interactions, code-mixing (blending Hausa and English in same sentences), and code-switching.
  Always analyze the entire audio clip. Make sure to divide the audio into logical segments based on conversation shifts, pauses, or speaker changes, and provide estimated mm:ss timestamps.
  You must respond ONLY with a JSON object adhering exactly to the requested Schema.
`;

const TRANSCRIBE_RESPONSE_SCHEMA: any = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A concise and fitting title for this audio clip.",
    },
    dominantLanguage: {
      type: Type.STRING,
      description: "The dominant language of the audio (e.g., 'Hausa', 'English', or 'Mixed (Bilingual)').",
    },
    confidenceScore: {
      type: Type.STRING,
      description: "Confidence level of transcription (e.g., 'High', 'Medium', 'Low').",
    },
    languageMixPercentage: {
      type: Type.STRING,
      description: "Apprx. percentage (e.g., '60% Hausa, 40% English').",
    },
    segments: {
      type: Type.ARRAY,
      description: "An ordered list of conversational segments / dialogue turns transcribed from the audio.",
      items: {
        type: Type.OBJECT,
        properties: {
          timestamp: {
            type: Type.STRING,
            description: "Approximate time range in mm:ss format (e.g., '00:00 - 00:12'). Guess based on text density if precise times are unavailable.",
          },
          speaker: {
            type: Type.STRING,
            description: "Identified speaker (e.g., 'Speaker 1', 'Speaker 2'). If conversation is a monologue, use 'Speaker 1'.",
          },
          originalText: {
            type: Type.STRING,
            description: "The actual words spoken. If code-mixed, preserve both Hausa and English exactly as spoken.",
          },
          spokenLanguage: {
            type: Type.STRING,
            description: "The language of this specific segment (e.g., 'Hausa', 'English', or 'Bilingual Code-Mixed').",
          },
        },
        required: ["timestamp", "speaker", "originalText", "spokenLanguage"],
      },
    },
  },
  required: [
    "title",
    "dominantLanguage",
    "confidenceScore",
    "languageMixPercentage",
    "segments",
  ],
};

// ---- Job store --------------------------------------------------------------
// NOTE: In-memory only — jobs do NOT survive a server restart, and this will
// NOT work across multiple instances (e.g. Cloud Run scale-out). Pin this
// service to a single instance, or move job state to a shared store, if scaled.
type JobState = "processing" | "done" | "error";
interface Job {
  state: JobState;
  progress: number; // 0..100
  stage: string;
  totalChunks?: number;
  doneChunks?: number;
  result?: any; // TranscriptionResult
  error?: string;
}
const jobs = new Map<string, Job>();

function setJob(jobId: string, patch: Partial<Job>) {
  const existing = jobs.get(jobId);
  if (!existing) return;
  jobs.set(jobId, { ...existing, ...patch });
}

// ---- ffmpeg / ffprobe helpers ----------------------------------------------
function getAudioDurationSec(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const args = [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      inputPath,
    ];
    const p = spawn(ffprobePath, args);
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffprobe exited ${code}: ${err}`));
      const sec = parseFloat(out.trim());
      if (!isFinite(sec) || sec <= 0) {
        return reject(new Error(`Could not read audio duration (got "${out.trim()}"). The file may be corrupt or not a valid audio file.`));
      }
      resolve(sec);
    });
  });
}

function chunkAudio(inputPath: string, startSec: number, lenSec: number, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "-hide_banner", "-loglevel", "error",
      "-i", inputPath,
      "-ss", String(startSec), // output-seek (after -i) = frame-accurate, no drift
      "-t", String(lenSec),
      "-vn", // drop any video / cover art
      "-ac", "1", // mono
      "-ar", String(TARGET_SR), // 16 kHz
      "-c:a", "libopus", "-b:a", "24k",
      "-f", "ogg",
      "-y", outPath,
    ];
    const p = spawn(ffmpegPath!, args);
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${err}`)));
  });
}

// ---- Rate-limit-aware retry -------------------------------------------------
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isQuotaError(err: any): boolean {
  const status = err?.status ?? err?.code;
  return (
    status === 429 ||
    status === 500 ||
    status === 503 ||
    /429|RESOURCE_EXHAUSTED|quota|rate limit|overloaded|unavailable/i.test(String(err?.message ?? ""))
  );
}

// Exponential backoff: 3 retry waits at ~10s, 25s, 60s.
const BACKOFF_DELAYS_MS = [10000, 25000, 60000];

async function withBackoff<T>(fn: () => Promise<T>, onWait?: (waitMs: number, attempt: number) => void): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt <= BACKOFF_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      if (attempt >= BACKOFF_DELAYS_MS.length || !isQuotaError(e)) throw e;
      const waitMs = BACKOFF_DELAYS_MS[attempt] + Math.floor(Math.random() * 1000);
      if (onWait) onWait(waitMs, attempt + 1);
      await sleep(waitMs);
    }
  }
  throw lastErr;
}

// ---- Timestamp parsing / offsetting ----------------------------------------
// Accepts "mm:ss", "h:mm:ss", or ranges like "00:00 - 00:12" / "1:02:00 - 1:03:30".
// Returns seconds, or null if unparseable.
function parseTimeToSec(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const parts = t.split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || isNaN(Number(p)))) return null;
  let sec = 0;
  if (parts.length === 3) {
    sec = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  } else if (parts.length === 2) {
    sec = Number(parts[0]) * 60 + Number(parts[1]);
  } else if (parts.length === 1) {
    sec = Number(parts[0]);
  } else {
    return null;
  }
  return isFinite(sec) ? sec : null;
}

function formatHMS(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

// Offset a single timestamp string (possibly a range) by offsetSec, reformatting
// to HH:MM:SS - HH:MM:SS. If unparseable, fall back to a clean range starting at offset.
function offsetTimestamp(raw: string, offsetSec: number): string {
  const sep = raw.includes("-") ? "-" : raw.includes("–") ? "–" : null;
  if (sep) {
    const [a, b] = raw.split(sep);
    const sa = parseTimeToSec(a);
    const sb = parseTimeToSec(b);
    if (sa !== null && sb !== null) {
      return `${formatHMS(sa + offsetSec)} - ${formatHMS(sb + offsetSec)}`;
    }
    if (sa !== null) {
      return `${formatHMS(sa + offsetSec)} - ${formatHMS(sa + offsetSec)}`;
    }
  } else {
    const sa = parseTimeToSec(raw);
    if (sa !== null) {
      return `${formatHMS(sa + offsetSec)} - ${formatHMS(sa + offsetSec)}`;
    }
  }
  // Unparseable: anchor at the chunk's start time so ordering stays sane.
  return `${formatHMS(offsetSec)} - ${formatHMS(offsetSec)}`;
}

// ---- Gemini calls -----------------------------------------------------------

// Pull every COMPLETE {...} object out of a (possibly truncated) JSON array named
// `key`. Brace-matched and string/escape aware, so a response cut off mid-array
// (e.g. MAX_TOKENS) still yields all the elements that did arrive intact.
function extractArrayObjects(text: string, key: string): any[] {
  const out: any[] = [];
  const keyIdx = text.indexOf(`"${key}"`);
  if (keyIdx === -1) return out;
  let i = text.indexOf("[", keyIdx);
  if (i === -1) return out;
  i++; // step past '['
  const n = text.length;
  while (i < n) {
    while (i < n && (text[i] === " " || text[i] === "\n" || text[i] === "\r" || text[i] === "\t" || text[i] === ",")) i++;
    if (i >= n || text[i] === "]") break; // end of array
    if (text[i] !== "{") break; // not an object array we understand
    let depth = 0, inStr = false, esc = false, closed = false;
    const start = i;
    for (; i < n; i++) {
      const c = text[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') inStr = false;
      } else if (c === '"') inStr = true;
      else if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) { i++; closed = true; break; }
      }
    }
    if (!closed) break; // object was truncated mid-way — stop here
    try { out.push(JSON.parse(text.slice(start, i))); } catch { /* skip a malformed element */ }
  }
  return out;
}

// Parse a chunk's response defensively. A single chunk must NEVER throw and kill
// the whole job: on truncated/invalid JSON we salvage the segments/vocab that did
// arrive; if nothing is usable we return a visible "skipped" placeholder so the
// rest of the transcript still completes.
function salvageChunk(text: string, partLabel: string): any {
  const trimmed = (text || "").trim();
  if (trimmed) {
    try {
      return JSON.parse(trimmed);
    } catch {
      const segments = extractArrayObjects(trimmed, "segments");
      const vocabulary = extractArrayObjects(trimmed, "vocabulary");
      if (segments.length || vocabulary.length) {
        console.warn(
          `[transcribe] ${partLabel}: response JSON was truncated/partial; salvaged ${segments.length} segment(s) and ${vocabulary.length} vocab item(s).`,
        );
        return { title: "", summary: "", dominantLanguage: "", confidenceScore: "", languageMixPercentage: "", segments, vocabulary };
      }
    }
  }
  console.warn(`[transcribe] ${partLabel}: response was empty or unparseable; marking this part as skipped.`);
  const note = `[This portion of the audio (${partLabel}) could not be transcribed and was skipped.]`;
  return {
    title: "",
    summary: "",
    dominantLanguage: "",
    confidenceScore: "",
    languageMixPercentage: "",
    segments: [{ timestamp: "0:00", speaker: "System", originalText: note, translationText: note, spokenLanguage: "Unknown" }],
    vocabulary: [],
  };
}

async function transcribeChunk(base64: string, promptInstruction: string, partLabel: string): Promise<any> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        inlineData: {
          mimeType: CHUNK_MIME,
          data: base64,
        },
      },
      {
        text: `Please transcribe and analyze this audio according to these instructions: ${promptInstruction}`,
      },
    ],
    config: {
      systemInstruction: TRANSCRIBE_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: TRANSCRIBE_RESPONSE_SCHEMA,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  });

  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason === "MAX_TOKENS") {
    console.warn(
      `[transcribe] ${partLabel} hit MAX_TOKENS output cap (${MAX_OUTPUT_TOKENS}); salvaging the complete portion. Consider smaller chunks.`,
    );
  }

  // Note: network / 429 quota errors are thrown by generateContent above and
  // handled by withBackoff in the caller. Here we only guard the response body,
  // which must degrade gracefully rather than fail the whole job.
  return salvageChunk(response.text || "", partLabel);
}

// ---- Merge ------------------------------------------------------------------
function mergeResults(chunkResults: any[]): any {
  const segments: any[] = [];
  const vocabulary: any[] = [];
  const seenVocab = new Set<string>();

  chunkResults.forEach((cr, idx) => {
    const offset = idx * CHUNK_SEC;
    const segs = Array.isArray(cr?.segments) ? cr.segments : [];
    for (const s of segs) {
      segments.push({
        timestamp: offsetTimestamp(String(s?.timestamp ?? ""), offset),
        speaker: String(s?.speaker ?? "Speaker 1"),
        originalText: String(s?.originalText ?? ""),
        translationText: String(s?.translationText ?? ""),
        spokenLanguage: String(s?.spokenLanguage ?? ""),
      });
    }
    const vocab = Array.isArray(cr?.vocabulary) ? cr.vocabulary : [];
    for (const v of vocab) {
      const key = String(v?.phrase ?? "").trim().toLowerCase();
      if (!key || seenVocab.has(key)) continue;
      seenVocab.add(key);
      vocabulary.push({
        phrase: String(v?.phrase ?? ""),
        originalLanguage: String(v?.originalLanguage ?? ""),
        literalMeaning: String(v?.literalMeaning ?? ""),
        culturalContext: String(v?.culturalContext ?? ""),
      });
    }
  });

  const first = chunkResults[0] ?? {};
  return {
    title: first.title || "Untitled Recording",
    summary: first.summary || "",
    dominantLanguage: first.dominantLanguage || "Mixed (Bilingual)",
    confidenceScore: first.confidenceScore || "Medium",
    languageMixPercentage: first.languageMixPercentage || "",
    segments,
    vocabulary: vocabulary.slice(0, 30),
  };
}

// ---- Pipeline ---------------------------------------------------------------
async function runPipeline(jobId: string, inputPath: string, promptMode: string) {
  const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), "scribre-job-"));
  const promptInstruction = getPromptInstruction(promptMode);
  setJob(jobId, { state: "processing", progress: 2, stage: "Reading audio…" });

  try {
    // 1. Probe duration
    const dur = await getAudioDurationSec(inputPath);
    const totalChunks = Math.max(1, Math.ceil(dur / CHUNK_SEC));
    setJob(jobId, {
      progress: 5,
      stage: totalChunks > 1 ? "Splitting audio…" : "Preparing audio…",
      totalChunks,
      doneChunks: 0,
    });

    // 2. Split + downsample all chunks up-front, then transcribe sequentially.
    const chunkPaths: string[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SEC;
      const len = Math.min(CHUNK_SEC, dur - start);
      const outPath = path.join(workDir, `chunk_${i}.${CHUNK_EXT}`);
      await chunkAudio(inputPath, start, len, outPath);
      chunkPaths.push(outPath);
      // Splitting occupies the 5%..15% progress band.
      setJob(jobId, { progress: 5 + Math.round(((i + 1) / totalChunks) * 10) });
    }

    // 3. Transcribe each chunk sequentially (rate-limit polite).
    // Transcription occupies the 15%..90% progress band.
    const chunkResults: any[] = [];
    for (let i = 0; i < totalChunks; i++) {
      setJob(jobId, {
        stage: `Transcribing part ${i + 1} of ${totalChunks}…`,
      });

      const data = await fsp.readFile(chunkPaths[i]);
      const base64 = data.toString("base64");

      const result = await withBackoff(
        () => transcribeChunk(base64, promptInstruction, `part ${i + 1} of ${totalChunks}`),
        (waitMs, attempt) => {
          setJob(jobId, {
            stage: `Rate limit hit — waiting ${Math.round(waitMs / 1000)}s, then retrying part ${i + 1} of ${totalChunks} (attempt ${attempt})…`,
          });
        },
      );
      chunkResults.push(result);

      setJob(jobId, {
        doneChunks: i + 1,
        progress: 15 + Math.round(((i + 1) / totalChunks) * 75),
      });

      // Pace requests to stay under free-tier RPM (skip after the last chunk).
      if (i < totalChunks - 1) {
        await sleep(INTER_CHUNK_DELAY_MS);
      }
    }

    // 4. Merge
    setJob(jobId, { stage: "Merging…", progress: 92 });
    const merged = mergeResults(chunkResults);

    setJob(jobId, {
      state: "done",
      progress: 100,
      stage: "Done",
      result: merged,
    });
  } catch (e: any) {
    console.error(`[transcribe] Job ${jobId} failed:`, e);
    let message = e?.message || "Processing failed.";
    if (isQuotaError(e)) {
      message =
        "Transcription is temporarily rate-limited by the AI service (quota exceeded). Please wait a minute and try again.";
    }
    setJob(jobId, { state: "error", progress: 0, stage: "Failed", error: message });
  } finally {
    // Always clean up the upload + all chunk files.
    await fsp.rm(workDir, { recursive: true, force: true }).catch(() => {});
    await fsp.rm(inputPath, { force: true }).catch(() => {});
    // Drop the job from memory ~10 minutes after it settles, so the Map doesn't grow.
    setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000).unref?.();
  }
}

// ---- Multer (single large file → disk temp) --------------------------------
const uploadDir = path.join(os.tmpdir(), "scribre-uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) =>
      cb(null, `${randomUUID()}${path.extname(file.originalname) || ""}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ---- Transcription: start (async job) --------------------------------------
app.post("/api/transcribe/start", (req, res) => {
  upload.single("audio")(req, res, (err: any) => {
    if (err) {
      const msg =
        err?.code === "LIMIT_FILE_SIZE"
          ? "File too large (max 2GB)."
          : err?.message || "Upload failed.";
      return res.status(400).json({ error: msg });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Missing 'audio' file." });
    }

    // Validate the API key is configured before accepting the job.
    try {
      getGeminiClient();
    } catch (e: any) {
      fsp.rm(req.file.path, { force: true }).catch(() => {});
      return res.status(500).json({ error: e?.message || "AI service is not configured." });
    }

    const promptMode = (req.body?.promptMode as string) || "bilingual";
    const jobId = randomUUID();

    jobs.set(jobId, { state: "processing", progress: 0, stage: "Queued…" });
    res.json({ jobId });

    // Run the pipeline detached — do NOT await it before responding.
    runPipeline(jobId, req.file.path, promptMode).catch((e) => {
      console.error(`[transcribe] Unhandled pipeline error for ${jobId}:`, e);
      setJob(jobId, {
        state: "error",
        progress: 0,
        stage: "Failed",
        error: "An unexpected error occurred during audio processing.",
      });
    });
  });
});

// ---- Transcription: status -------------------------------------------------
app.get("/api/transcribe/status/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: "Unknown jobId." });
  }
  res.json(job);
});

// Interactive Ask-the-Transcript Endpoint
app.post("/api/ask", async (req, res) => {
  try {
    const { result, question, history } = req.body;

    if (!result) {
      return res.status(400).json({ error: "Missing transcript context (result)." });
    }

    if (!question) {
      return res.status(400).json({ error: "Missing user question." });
    }

    const ai = getGeminiClient();

    const systemInstruction = `
      You are an expert bilingual conversational co-pilot helping users understand and extract insights from a transcribed and translated Hausa-English audio clip.
      You are friendly, professional, and possess deep linguistic and cultural knowledge about West African customs, Northern Nigerian commerce, and common Hausa behaviors / idioms.
      Base your answers precisely on the provided audio transcript, dialogue segments, vocabulary definitions, and general cultural realities.
      If the user asks you to write emails, summaries, summaries in Hausa, or explain translation nuance, satisfy their requests with utmost craftsmanship.
      Use elegant markdown to format your response (including bullet points, bold headers, or inline quotes). Keep answers tidy.
    `;

    // Construct the context-enriched prompt
    const segmentsFormatted = result.segments
      .map((s: any) => `[${s.timestamp}] ${s.speaker} (${s.spokenLanguage}): "${s.originalText}" (TR: "${s.translationText}")`)
      .join("\n");

    const vocabFormatted = result.vocabulary
      .map((v: any) => `- Phrase: "${v.phrase}" (${v.originalLanguage}) | Literal: "${v.literalMeaning}" | Cultural Context: "${v.culturalContext}"`)
      .join("\n");

    const chatContextPrompt = `
      Here is the complete transcribed Hausa-English audio context:
      --------------------------------------------------
      Title: ${result.title}
      Dominant Language: ${result.dominantLanguage}
      Confidence Level: ${result.confidenceScore}
      Language Mix: ${result.languageMixPercentage}

      Summary:
      ${result.summary}

      Dialogue Transcript Segments:
      ${segmentsFormatted}

      Highlighted Vocabulary Card:
      ${vocabFormatted}
      --------------------------------------------------

      Please answer this user question, maintaining high accuracy regarding what was said:
      Question: "${question}"
    `;

    // Supporting Multi-turn history if provided
    let contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: chatContextPrompt }],
    });

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: contents,
      config: {
        systemInstruction,
      },
    });

    const answer = response.text || "I was unable to formulate a response. Please try again.";
    return res.json({ answer });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred during transcription query.",
    });
  }
});

// Setup Vite and Static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
