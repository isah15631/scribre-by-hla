import React, { useState, useRef, useEffect } from "react";
import { 
  Mic, UploadCloud, Volume2, Play, Square, Trash2, 
  Settings2, Sparkles, AlertCircle, CheckCircle2, ChevronRight 
} from "lucide-react";
import { AUDIO_SAMPLES, AudioSample } from "../utils/samples";
import { motion, AnimatePresence } from "motion/react";

interface AudioSelectorProps {
  onTranscribeRequested: (audioBase64: string, mimeType: string, promptMode: string, fileName: string) => void;
  onSampleSelected: (sample: AudioSample) => void;
  isProcessing: boolean;
}

type InputTab = "upload" | "record" | "samples";

export default function AudioSelector({
  onTranscribeRequested,
  onSampleSelected,
  isProcessing,
}: AudioSelectorProps) {
  const [activeTab, setActiveTab] = useState<InputTab>("upload");
  const [promptMode, setPromptMode] = useState<string>("bilingual");

  // Drag and Drop State
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileAudioUrl, setFileAudioUrl] = useState<string | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup recorded URLs
  useEffect(() => {
    return () => {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      if (fileAudioUrl) URL.revokeObjectURL(fileAudioUrl);
    };
  }, [recordedUrl, fileAudioUrl]);

  // Recording Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Drag handlings
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("audio/")) {
        setSelectedFile(file);
        setFileAudioUrl(URL.createObjectURL(file));
      } else {
        alert("Please drop a valid audio file (e.g. .mp3, .wav, .m4a).");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFileAudioUrl(URL.createObjectURL(file));
    }
  };

  // Recording handlings
  const startRecording = async () => {
    setRecordError(null);
    setRecordedBlob(null);
    setRecordedUrl(null);
    audioChunksRef.current = [];
    setRecordingDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine supported mimeType safely
      let options = { mimeType: "audio/webm" };
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        options = { mimeType: "audio/ogg" };
      }
      if (!MediaRecorder.isTypeSupported("audio/ogg") && !MediaRecorder.isTypeSupported("audio/webm")) {
        options = { mimeType: "" }; // default fallback
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
        setRecordedBlob(audioBlob);
        setRecordedUrl(URL.createObjectURL(audioBlob));
        
        // Stop all mic tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(200); // chunk size time-slice
      setIsRecording(true);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      setRecordError(
        "Could not access microphone. Please ensure microphone permissions are granted in your browser settings, or use one of the pre-recorded samples below."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  // Convert blob/file to base64 and trigger transcription request
  const submitAudioPayload = (blobOrFile: Blob | File, filenameValue: string) => {
    const reader = new FileReader();
    reader.readAsDataURL(blobOrFile);
    reader.onloadend = () => {
      const base64WithHeader = reader.result as string;
      const base64String = base64WithHeader.split(",")[1];
      const mimeType = blobOrFile.type || "audio/webm";
      onTranscribeRequested(base64String, mimeType, promptMode, filenameValue);
    };
  };

  const handleTranscribeSubmit = () => {
    if (activeTab === "upload" && selectedFile) {
      submitAudioPayload(selectedFile, selectedFile.name);
    } else if (activeTab === "record" && recordedBlob) {
      submitAudioPayload(recordedBlob, `Live-Recording-${new Date().toISOString().slice(11,19)}.webm`);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFileAudioUrl(null);
  };

  const removeRecordedBlob = () => {
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingDuration(0);
  };

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 md:p-8 shadow-2xl space-y-8" id="audio-input-manager">
      
      {/* Tab Switchers */}
      <div className="flex border-b border-slate-800/80 p-1 bg-slate-950/60 rounded-2xl max-w-md mx-auto">
        {(["upload", "record", "samples"] as const).map((tab) => {
          const capitalized = tab === "upload" ? "Upload Audio" : tab === "record" ? "Record Voice" : "Bilingual Samples";
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-center py-2.5 rounded-xl font-display font-medium text-xs transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-slate-800 text-emerald-400 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id={`tab-select-${tab}`}
            >
              {capitalized}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content Display */}
      <div className="min-h-[220px] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {activeTab === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {!selectedFile ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                    dragActive
                      ? "border-emerald-500 bg-emerald-500/5"
                      : "border-slate-800 hover:border-slate-700 bg-slate-950/20"
                  }`}
                  id="drop-zone"
                >
                  <input
                    type="file"
                    id="audio-file-input"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="audio-file-input" className="cursor-pointer flex flex-col items-center group">
                    <div className="p-4 bg-slate-800/60 rounded-full text-slate-400 group-hover:text-emerald-400 group-hover:scale-105 duration-200 mb-4 shadow">
                      <UploadCloud className="w-10 h-10" />
                    </div>
                    <p className="font-display font-semibold text-sm text-slate-100 group-hover:text-emerald-400 transition-colors">
                      Drag & Drop Audio File Here
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Supports MP3, WAV, M4A, WEBM, or OGG files (Max 15MB)
                    </p>
                    <span className="mt-4 px-4 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-[11px] font-medium border border-slate-700 group-hover:bg-slate-700 group-hover:-translate-y-0.5 transition duration-150 shadow-sm">
                      Or browse your files
                    </span>
                  </label>
                </div>
              ) : (
                <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                        <Volume2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate max-w-xs md:max-w-md">
                          {selectedFile.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || "Audio"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={removeSelectedFile}
                      className="p-1.5 hover:bg-red-500/15 hover:text-red-400 text-slate-500 rounded-lg duration-150 cursor-pointer"
                      title="Remove file"
                      id="remove-uploaded-file-btn"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <audio src={fileAudioUrl || ""} controls className="w-full custom-audio-player h-9 bg-slate-950 rounded-lg" />
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "record" && (
            <motion.div
              key="record"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center space-y-6"
            >
              {recordError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-left max-w-lg mx-auto">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{recordError}</span>
                </div>
              )}

              {!recordedBlob ? (
                <div className="flex flex-col items-center space-y-4">
                  {isRecording ? (
                    <div className="space-y-4">
                      {/* CSS-Animated Waveform bars */}
                      <div className="flex items-end justify-center gap-1 h-12 w-48 mb-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((val, idx) => (
                          <motion.div
                            key={idx}
                            animate={{
                              height: [
                                "15%",
                                `${Math.floor(Math.random() * 80) + 20}%`,
                                "15%",
                              ],
                            }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              repeatType: "reverse",
                              delay: idx * 0.04,
                            }}
                            className="bg-emerald-500 w-1 rounded-full"
                          />
                        ))}
                      </div>

                      <div className="bg-slate-950 px-4 py-1.5 rounded-full border border-slate-800 text-[11px] text-slate-400 font-mono tracking-wider inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span>Live Recording • {formatTime(recordingDuration)}</span>
                      </div>

                      <div>
                        <button
                          onClick={stopRecording}
                          className="p-5 bg-red-500 hover:bg-red-600 active:scale-95 text-slate-950 rounded-full transition duration-150 animate-pulse shadow-lg hover:shadow-red-500/20 cursor-pointer outline-none"
                          title="Stop recording"
                          id="btn-stop-recording"
                        >
                          <Square className="w-6 h-6 fill-slate-950" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 py-4">
                      <p className="text-xs text-slate-300 max-w-sm mx-auto">
                        Speak clearly into your microphone using Hausa, English, or both. Your accent, local idioms, and code-mixed styles will be accurately transcribed.
                      </p>
                      <button
                        onClick={startRecording}
                        className="mt-4 inline-flex items-center gap-2 px-5 py-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-emerald-400 rounded-xl transition duration-150 group shadow-md active:scale-95 cursor-pointer"
                        id="btn-start-record"
                      >
                        <Mic className="w-4 h-4 group-hover:scale-110 duration-150" />
                        <span className="text-xs font-semibold">Start Live Recording</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800/80 space-y-4 max-w-lg mx-auto">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 animate-bounce" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-xs font-semibold text-slate-200">
                          Live Recording Completed
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          WebM Audio • {formatTime(recordingDuration)} seconds
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={removeRecordedBlob}
                      className="p-1.5 hover:bg-red-500/15 hover:text-red-400 text-slate-500 rounded-lg duration-150 cursor-pointer"
                      title="Discard recording"
                      id="discard-recording-btn"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <audio src={recordedUrl || ""} controls className="w-full custom-audio-player h-9 bg-slate-950 rounded-lg" />
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "samples" && (
            <motion.div
              key="samples"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {AUDIO_SAMPLES.map((sample) => (
                <div
                  key={sample.id}
                  onClick={() => !isProcessing && onSampleSelected(sample)}
                  className={`group flex flex-col justify-between p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                    isProcessing 
                      ? "opacity-50 cursor-not-allowed" 
                      : "bg-slate-950/40 border-slate-800/80 hover:border-emerald-500/35 hover:bg-slate-900/60 shadow"
                  }`}
                  id={`sample-card-${sample.id}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[10px] bg-slate-800 text-emerald-400 font-mono px-2 py-0.5 rounded-full">
                        {sample.duration}
                      </span>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition duration-200" />
                    </div>
                    <h4 className="font-display font-bold text-xs text-slate-100 group-hover:text-emerald-400 transition-colors">
                      {sample.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 line-clamp-3">
                      {sample.description}
                    </p>
                  </div>
                  
                  <div className="border-t border-slate-900/80 pt-3 mt-4 flex items-center justify-between">
                    <span className="text-[9px] text-slate-500 truncate max-w-[130px] font-mono">
                      {sample.mixRatio}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5 transform translate-x-0 group-hover:translate-x-1 duration-200">
                      <span>Simulate</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Advanced Transcription Mode Panel */}
      <div className="border-t border-slate-800/80 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-4 h-4 text-emerald-400" />
          <h3 className="font-display font-semibold text-sm text-slate-200">Transcription Mode</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60">
          {[
            {
              id: "bilingual",
              label: "Bilingual Transcript",
              desc: "Preserves native speakers' mixing style, transcribing each back and forth verbatim with alternate cross translation.",
            },
            {
              id: "english-only",
              label: "English Focus",
              desc: "Transcribes verbatim, translating any raw Hausa speech segments cleanly into high-grade English.",
            },
            {
              id: "hausa-only",
              label: "Hausa Focus Focus (Akan Hausa)",
              desc: "Bi-directional. Transcribes spoken content, translating any raw English segments into beautiful Hausa prose.",
            },
            {
              id: "vocab",
              label: "Cultural Glossary Scope",
              desc: "Bilingual output plus creates a vocabulary card of unique cultural phrases, loanwords, and idioms with breakdowns.",
            },
          ].map((mode) => {
            const isSel = promptMode === mode.id;
            return (
              <div
                key={mode.id}
                onClick={() => setPromptMode(mode.id)}
                className={`flex flex-col p-3 rounded-xl cursor-pointer transition border text-left justify-between ${
                  isSel
                    ? "bg-emerald-500/5 border-emerald-500/40 shadow-sm"
                    : "bg-slate-900/40 border-transparent hover:bg-slate-900/80"
                }`}
                id={`mode-select-${mode.id}`}
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-1 justify-between">
                    <span className={`text-[11px] font-bold ${isSel ? "text-emerald-400" : "text-slate-300"}`}>
                      {mode.label}
                    </span>
                    <input
                      type="radio"
                      checked={isSel}
                      onChange={() => {}}
                      className="accent-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    {mode.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Submit Action Trigger */}
      {activeTab !== "samples" && (
        <div className="flex justify-center border-t border-slate-800/80 pt-6">
          <button
            onClick={handleTranscribeSubmit}
            disabled={
              isProcessing ||
              (activeTab === "upload" && !selectedFile) ||
              (activeTab === "record" && !recordedBlob)
            }
            className={`flex items-center justify-center gap-2 font-display font-semibold text-sm py-3.5 px-8 rounded-xl transition duration-150 shadow-lg min-w-[200px] cursor-pointer ${
              isProcessing
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : (activeTab === "upload" && selectedFile) || (activeTab === "record" && recordedBlob)
                ? "bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 shadow-emerald-500/10"
                : "bg-slate-800 text-slate-400 cursor-not-allowed"
            }`}
            id="transcribe-submit-btn"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Analyzing Audio...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4.5 h-4.5" />
                <span>Transcribe with Gemini</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
