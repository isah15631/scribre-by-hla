import React, { useState, useEffect, useRef } from "react";
import { TranscriptionResult, SavedSession, TranscribeJobStatus } from "./types";
import { AUDIO_SAMPLES, AudioSample } from "./utils/samples";
import { apiUrl } from "./utils/api";
import { 
  UploadCloud, FileAudio, Copy, Check, RotateCcw, 
  Trash2, Play, Volume2, AlertCircle, Sparkles, Plus, Headphones,
  Printer
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const STAGGERED_STEPS = [
  { p: 15, msg: "Reading audio stream..." },
  { p: 40, msg: "Re-calibrating speech audio..." },
  { p: 65, msg: "Transcribing line-by-line..." },
  { p: 85, msg: "Translating Hausa and English speech..." },
  { p: 98, msg: "Wrapping up transcription..." }
];

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  
  // Real or Simulated transcription session
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [currentSession, setCurrentSession] = useState<SavedSession | null>(null);
  
  // Progress states
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Polling interval handle for the background transcription job (cleaned up on unmount/completion)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Make sure we never leave a poll running if the component unmounts mid-job
  useEffect(() => {
    return () => stopPolling();
  }, []);

  // Load from local storage to keep history
  useEffect(() => {
    const saved = localStorage.getItem("scribre_sessions_v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
      } catch (err) {
        console.error("Failed to parse sessions", err);
      }
    }
  }, []);

  const saveSessions = (updated: SavedSession[]) => {
    setSessions(updated);
    localStorage.setItem("scribre_sessions_v1", JSON.stringify(updated));
  };

  // Sound play simulation for demo segments
  const [playingSegment, setPlayingSegment] = useState<number | null>(null);
  const playSampleSoundSim = (index: number) => {
    setPlayingSegment(index);
    setTimeout(() => {
      setPlayingSegment(null);
    }, 2000);
  };

  // Drag over handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("audio/") || file.name.endsWith(".mp3") || file.name.endsWith(".wav") || file.name.endsWith(".m4a") || file.name.endsWith(".webm")) {
        setSelectedFile(file);
        setProcessingError(null);
      } else {
        setProcessingError("Please upload a valid audio file (MP3, WAV, M4A, etc.)");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setProcessingError(null);
    }
  };

  // Run Real Audio Transcription using the background-job backend flow.
  // 1) POST the file (multipart) to /api/transcribe/start -> { jobId }
  // 2) Poll /api/transcribe/status/:jobId every ~1.5s, driving the REAL progress UI,
  //    until state is 'done' (save + show result) or 'error' (surface the message).
  const handleTranscribeReal = async () => {
    if (!selectedFile) return;

    const file = selectedFile;

    stopPolling();
    setIsProcessing(true);
    setProgressPercent(0);
    setProgressMessage("Uploading audio…");
    setProcessingError(null);

    const fail = (message: string) => {
      stopPolling();
      console.error(message);
      setProcessingError(message);
      setIsProcessing(false);
    };

    try {
      // Send the File directly as multipart/form-data (no base64 round-trip).
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("promptMode", "bilingual");

      const startRes = await fetch(apiUrl("/api/transcribe/start"), {
        method: "POST",
        body: formData,
      });

      if (!startRes.ok) {
        const errData = await startRes.json().catch(() => ({}));
        throw new Error(errData.error || "The server could not accept the audio. Please verify your GEMINI_API_KEY and try again.");
      }

      const { jobId } = await startRes.json();
      if (!jobId) {
        throw new Error("The server did not return a job id.");
      }

      setProgressPercent(2);
      setProgressMessage("Queued — preparing audio…");

      // Poll for status until the job finishes or errors out.
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(apiUrl(`/api/transcribe/status/${jobId}`));

          if (statusRes.status === 404) {
            fail("The transcription job could not be found. It may have expired — please try again.");
            return;
          }

          if (!statusRes.ok) {
            const errData = await statusRes.json().catch(() => ({}));
            throw new Error(errData.error || "Lost connection to the transcription job.");
          }

          const status: TranscribeJobStatus = await statusRes.json();

          // Drive the existing progress UI straight from the real backend values.
          if (typeof status.progress === "number") {
            setProgressPercent(status.progress);
          }
          if (status.stage) {
            setProgressMessage(status.stage);
          }

          if (status.state === "done" && status.result) {
            stopPolling();

            const newSession: SavedSession = {
              id: "session-" + Date.now(),
              timestamp: new Date().toISOString(),
              audioName: file.name,
              result: status.result,
              promptMode: "bilingual",
            };

            const updated = [newSession, ...sessions];
            saveSessions(updated);

            // Finalise progress bar beautifully.
            setProgressPercent(100);
            setProgressMessage("Completed successfully!");

            setTimeout(() => {
              setCurrentSession(newSession);
              setIsProcessing(false);
              setSelectedFile(null);
            }, 700);
          } else if (status.state === "error") {
            fail(status.error || "An unexpected error occurred during transcription.");
          }
        } catch (pollErr: any) {
          fail(pollErr.message || "An unexpected error occurred while checking transcription progress.");
        }
      }, 1500);
    } catch (err: any) {
      fail(err.message || "An unexpected error occurred during transcription.");
    }
  };

  // Trigger Simulated Fast-Path with built-in Nigerian Hausa-English Samples
  const handleSimulateSample = (sample: AudioSample) => {
    setIsProcessing(true);
    setProgressPercent(1);
    setProgressMessage("Accessing sample audio stream...");
    setProcessingError(null);

    // Staggered animated loader steps
    let currentStepIdx = 0;
    const interval = setInterval(() => {
      if (currentStepIdx < STAGGERED_STEPS.length) {
        const step = STAGGERED_STEPS[currentStepIdx];
        setProgressPercent(step.p);
        setProgressMessage(step.msg);
        currentStepIdx++;
      } else {
        clearInterval(interval);
        setProgressPercent(100);
        setProgressMessage("Boom! Transcribed text completed!");
        
        setTimeout(() => {
          const newSession: SavedSession = {
            id: "session-sample-" + Date.now(),
            timestamp: new Date().toISOString(),
            audioName: `${sample.title} (${sample.duration})`,
            result: sample.result,
            promptMode: "bilingual"
          };

          const updated = [newSession, ...sessions];
          saveSessions(updated);
          setCurrentSession(newSession);
          setIsProcessing(false);
        }, 600);
      }
    }, 700);
  };

  // Grab copyable dialogue text
  const getFullTranscriptText = () => {
    if (!currentSession) return "";
    let lines = `Title: ${currentSession.result.title}\n\n`;
    lines += `--- TRANSCRIPT ---\n`;
    currentSession.result.segments.forEach((seg) => {
      lines += `[${seg.timestamp}] ${seg.speaker}: "${seg.originalText}"\n\n`;
    });
    return lines;
  };

  const handleCopyText = () => {
    const text = getFullTranscriptText();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDoAnother = () => {
    setCurrentSession(null);
    setSelectedFile(null);
    setProcessingError(null);
  };

  const handleRedoCurrent = () => {
    if (!currentSession) return;
    // Redo simply triggers a re-loading state on the exact same session data to refresh the user
    setIsProcessing(true);
    setProgressPercent(10);
    setProgressMessage("Clearing caches and resetting pipeline...");
    
    setTimeout(() => setProgressPercent(45), 300);
    setTimeout(() => setProgressPercent(80), 600);
    setTimeout(() => {
      setProgressPercent(100);
      setProgressMessage("Re-rendered perfectly!");
      setTimeout(() => {
        setIsProcessing(false);
      }, 300);
    }, 1000);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    saveSessions(updated);
    if (currentSession?.id === id) {
      setCurrentSession(updated.length > 0 ? updated[0] : null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-pink-500 selection:text-white" id="scribre-root">
      
      {/* Decorative ambient glowing grids */}
      <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-pink-500/10 to-transparent pointer-events-none blur-3xl" />
      <div className="absolute -left-40 top-40 w-96 h-96 bg-pink-500/5 rounded-full pointer-events-none blur-3xl animate-pulse" />
      <div className="absolute -right-40 bottom-40 w-96 h-96 bg-purple-500/5 rounded-full pointer-events-none blur-3xl" />

      {/* Title Header */}
      <header className="px-4 sm:px-6 py-4 sm:py-5 border-b border-pink-500/10 backdrop-blur-md bg-slate-950/85 sticky top-0 z-50 transition" id="scribre-header">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-lg sm:text-2xl text-pink-400 leading-tight">
                Scribre <span className="text-slate-300 font-light text-sm">by HLA</span>
              </h1>
              <p className="text-xs text-pink-300 tracking-wide uppercase">
                Instant Audio Transcriber
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-pink-500/5 px-3 py-1.5 rounded-full border border-pink-500/10 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse shrink-0" />
            <span className="text-xs text-pink-300 font-bold tracking-wide">BILINGUAL</span>
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-grow max-w-4xl w-full mx-auto p-3 sm:p-6 md:p-8 flex flex-col justify-center relative z-10" id="scribre-main">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: PROCESSING / PROGRESS ANIMATION */}
          {isProcessing ? (
            <motion.div
              key="processing-view"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-2xl mx-auto py-12 px-6 text-center space-y-8"
              id="scribre-progress-card"
            >
              <div className="relative inline-flex items-center justify-center p-6 bg-pink-500/10 rounded-full border border-pink-500/20 shadow-inner">
                <FileAudio className="w-12 h-12 text-pink-400 animate-bounce" />
                <div className="absolute inset-0 rounded-full border-2 border-pink-500/30 border-t-pink-500 animate-spin" />
              </div>

              <div className="space-y-4 max-w-md mx-auto">
                <h3 className="text-xl font-bold text-pink-200 tracking-tight">
                  Transcribing Dialogue...
                </h3>

                {/* COOL PROGRESS BAR */}
                <div className="space-y-2">
                  <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-pink-400 animate-progress-pulse"
                      initial={{ width: "0%" }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-slate-300">
                    <span>{progressMessage}</span>
                    <span className="text-pink-400 font-bold">{Math.round(progressPercent)}%</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-300 tracking-wide leading-relaxed">
                Converting regional Hausa expressions and code-mixed lines with Gemini...
              </p>

              <p className="text-xs text-slate-400 tracking-wide leading-relaxed max-w-md mx-auto">
                Large files are split and transcribed in parts — this can take a few minutes.
              </p>
            </motion.div>
          ) : currentSession ? (
            
            /* STEP 2: BOOM! COMPLETED TRANSCRIPTION VIEW */
            <motion.div
              key="completed-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6 w-full"
              id="scribre-completed-card"
            >
              <div className="bg-slate-900/90 border border-pink-500/20 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-2xl pointer-events-none" />

                {/* Result Title & Basic Information Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
                  <div>
                    <span className="text-xs font-bold text-pink-300 uppercase tracking-wide bg-pink-500/10 px-3 py-1 rounded-full border border-pink-500/20">
                      Transcript Ready
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-3" id="transcript-heading">
                      {currentSession.result.title || currentSession.audioName}
                    </h2>
                    <p className="text-sm text-slate-300 mt-1.5">
                      Resource: {currentSession.audioName}
                    </p>
                  </div>

                  {/* Actions: Copy, Print/PDF, Redo, and New transcription */}
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:justify-end no-print">
                    {/* Copy Text Button */}
                    <button
                      onClick={handleCopyText}
                      className="px-4 py-2.5 bg-pink-500 hover:bg-pink-600 text-slate-950 active:scale-95 text-sm font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-pink-500/10 cursor-pointer shrink-0"
                      title="Copy full transcript to clipboard"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? "Copied!" : "Copy text"}</span>
                    </button>

                    {/* Print / PDF Button */}
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2 shrink-0"
                      title="Print or Save Transcript as PDF"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print / PDF</span>
                    </button>

                    {/* Redo current symbol */}
                    <button
                      onClick={handleRedoCurrent}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2 shrink-0"
                      title="Redo this transcription"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Redo</span>
                    </button>

                    {/* Plus symbol to do another */}
                    <button
                      onClick={handleDoAnother}
                      className="px-4 py-2.5 bg-slate-950 border border-slate-800 hover:border-pink-500/40 text-pink-300 hover:text-pink-200 text-sm font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shrink-0"
                      title="Transcribe another audio file"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New</span>
                    </button>
                  </div>
                </div>

                {/* Dialogue segments neatly laid out line by line */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide border-b border-slate-800 pb-2 mb-3">Verbatim Transcription</h3>

                  <div className="space-y-5 divide-y divide-slate-800">
                    {currentSession.result.segments.map((seg, i) => (
                      <div key={i} className={`pt-5 first:pt-0 group relative`}>

                        {/* Audio speaker and timestamp */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0" />
                            <span className="text-base font-bold text-pink-200">
                              {seg.speaker}
                            </span>
                            <span className="text-xs font-semibold text-slate-200 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-700">
                              {seg.spokenLanguage}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-400">{seg.timestamp}</span>
                            <button
                              onClick={() => playSampleSoundSim(i)}
                              className="p-1 text-slate-400 hover:text-pink-400 hover:bg-slate-950 rounded transition cursor-pointer"
                              title="Listen to segment audio clip"
                            >
                              <Volume2 className={`w-4 h-4 ${playingSegment === i ? "text-pink-500 animate-bounce" : ""}`} />
                            </button>
                          </div>
                        </div>

                        {/* Transcribed speech */}
                        <div className="pl-4 border-l-2 border-pink-500/30 group-hover:border-pink-500/60 transition">
                          <div className="text-base text-white font-medium leading-relaxed">
                            {seg.originalText}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* History list inside footer for navigation */}
              {sessions.length > 1 && (
                <div className="bg-slate-900/40 p-4 rounded-3xl border border-slate-900 space-y-3 no-print">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wide pl-1">Recent Transcripts</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {sessions.map((sess) => (
                      <div
                        key={sess.id}
                        onClick={() => {
                          setCurrentSession(sess);
                          setSelectedFile(null);
                        }}
                        className={`p-3 rounded-xl border cursor-pointer text-left transition relative group overflow-hidden ${
                          currentSession.id === sess.id
                            ? "bg-pink-500/10 border-pink-500/40"
                            : "bg-slate-950 border-slate-900 hover:border-slate-800"
                        }`}
                      >
                        <p className="text-sm font-bold truncate text-slate-100 group-hover:text-pink-400">
                          {sess.result.title || sess.audioName}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {sess.audioName}
                        </p>

                        <button
                          onClick={(e) => handleDeleteSession(sess.id, e)}
                          className="absolute right-2 bottom-2 p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            
            /* STEP 3: INITIAL FILE UPLOAD / DRAG & DROP WITH SAMPLES ACCORDION */
            <motion.div
              key="uploader-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto space-y-6"
              id="scribre-upload-pane"
            >
              {/* Main Dropper Container Card */}
              <div 
                className={`bg-slate-900/90 rounded-3xl border-2 border-dashed p-8 md:p-12 text-center transition-all shadow-2xl relative select-none ${
                  isDragActive 
                    ? "border-pink-500 bg-pink-500/5 scale-[1.01]" 
                    : "border-slate-800 hover:border-pink-500/40 bg-slate-900"
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                {/* Simulated Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent pointer-events-none rounded-3xl" />

                <div className="relative z-10 space-y-6">
                  <div className="w-16 h-16 bg-pink-500/10 rounded-2xl flex items-center justify-center mx-auto border border-pink-500/20 text-pink-400 shadow-md">
                    <UploadCloud className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      Upload Hausa or English Audio
                    </h2>
                    <p className="text-base text-slate-300 max-w-sm mx-auto leading-relaxed">
                      Drag and drop your audio recording file here, or browse local folders. Supports MP3, WAV, M4A, or WEBM.
                    </p>
                  </div>

                  {/* Browse CTA Button */}
                  <div className="flex flex-col items-center justify-center gap-3">
                    <label className="px-6 py-3 bg-slate-950 hover:bg-slate-900 text-pink-300 hover:text-pink-200 font-semibold text-sm rounded-xl border border-pink-500/20 hover:border-pink-500/40 transition-all shadow-sm cursor-pointer inline-flex items-center gap-2">
                      <span>Choose Audio File</span>
                      <input 
                        type="file" 
                        accept="audio/*" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </label>

                    {selectedFile && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl text-sm text-pink-200 font-semibold max-w-xs mx-auto flex items-center justify-between gap-4"
                      >
                        <span className="truncate max-w-[170px]">{selectedFile.name}</span>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="text-pink-300 hover:text-pink-100 transition ml-2 py-1 px-2 bg-pink-950/40 rounded text-xs"
                        >
                          Clear
                        </button>
                      </motion.div>
                    )}
                  </div>

                  {/* Press to Transcribe Container */}
                  <div className="pt-4 border-t border-slate-850/60 max-w-xs mx-auto">
                    <button
                      onClick={handleTranscribeReal}
                      disabled={!selectedFile}
                      className={`w-full py-3.5 rounded-xl font-bold text-sm transition duration-200 flex items-center justify-center gap-2 ${
                        selectedFile
                          ? "bg-pink-500 text-slate-950 hover:bg-pink-400 active:scale-95 shadow-lg shadow-pink-500/25 cursor-pointer"
                          : "bg-slate-950 text-slate-500 border border-slate-900 cursor-not-allowed"
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Press to Transcribe</span>
                    </button>
                  </div>
                </div>
              </div>



              {processingError && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-left flex gap-3 items-start">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="block text-red-200 font-bold">
                      {/(429|quota|rate.?limit|resource_?exhausted)/i.test(processingError)
                        ? "Rate Limit Reached:"
                        : "Transcription Stopped:"}
                    </strong>
                    <p className="leading-relaxed">{processingError}</p>
                    {/(429|quota|rate.?limit|resource_?exhausted)/i.test(processingError) && (
                      <p className="leading-relaxed text-red-300/80">
                        The free Gemini tier limits how much audio can be processed per minute. Please wait a moment and try again — long files are split into parts and may need a short cooldown.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Simplified Footer information stamp with developer signature label */}
      <footer className="py-6 border-t border-pink-500/5 text-center shrink-0 w-full" id="scribre-footer">
        <p className="text-xs text-slate-400">
          Scribre by HLA &copy; 2026. Made with love for West African multi-lingual dialogues.
        </p>
      </footer>
    </div>
  );
}
