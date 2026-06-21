import { TranscriptionResult, TranscriptionSegment, VocabularyItem } from "../types";
import { useState } from "react";
import { 
  Search, Copy, Check, Download, Languages, Sparkles, 
  MessageSquare, BookOpen, Volume2, Bookmark, BarChart3, HelpCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TranscribeDashboardProps {
  result: TranscriptionResult;
  onAskQuestionClick?: () => void;
}

export default function TranscribeDashboard({
  result,
  onAskQuestionClick,
}: TranscribeDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [activeSegmentTab, setActiveSegmentTab] = useState<"both" | "original" | "translated">("both");

  // Get segments filtering by searched term
  const filteredSegments = result.segments.filter((s) => {
    const text = `${s.originalText} ${s.translationText} ${s.speaker}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  const handleCopySegment = (segment: TranscriptionSegment, idx: number) => {
    const textToCopy = `[${segment.timestamp}] ${segment.speaker}:\nSpoken: ${segment.originalText}\nTranslation: ${segment.translationText}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyFullTranscript = () => {
    const text = result.segments
      .map(
        (s) =>
          `[${s.timestamp}] ${s.speaker} (${s.spokenLanguage}):\nOriginal: ${s.originalText}\nTranslation: ${s.translationText}\n`
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Download plain TXT report
  const downloadTXTReport = () => {
    const content = `HAUSA-ENGLISH BILINGUAL TRANSCRIPTION REPORT
==================================================
Title: ${result.title}
Dominant Language: ${result.dominantLanguage}
Language Mix Ratio: ${result.languageMixPercentage}
Confidence Level: ${result.confidenceScore}

OVERALL SUMMARY
--------------------------------------------------
${result.summary}

TRANSCRIPTION DIALOGUE
--------------------------------------------------
${result.segments
  .map(
    (s) =>
      `[${s.timestamp}] ${s.speaker} [${s.spokenLanguage}]:
Original: ${s.originalText}
Translation: ${s.translationText}\n`
  )
  .join("\n")}

CULTURAL GLOSSARY & KEY KEYWORDS
--------------------------------------------------
${result.vocabulary
  .map(
    (v) =>
      `- PHRASE: ${v.phrase} (${v.originalLanguage})
  Literal Translation: ${v.literalMeaning}
  Cultural / Contextual Usage: ${v.culturalContext}\n`
  )
  .join("\n")}
`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${result.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-transcript.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download JSON report
  const downloadJSONReport = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${result.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-transcript.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" id="transcribe-dashboard">
      
      {/* 1. Bento Dashboard Metrics Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Brief Info Card */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[170px] shadow-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">
                Gemini Audio Analysis
              </span>
            </div>
            <h2 className="font-display font-bold text-xl md:text-2xl text-slate-100 tracking-tight">
              {result.title}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed md:max-w-xl">
              {result.summary}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 mt-4 border-t border-slate-800/60 pt-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="text-[10px] text-slate-500">Confidence</span>
              <span className="text-xs font-semibold text-emerald-400">{result.confidenceScore}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="text-[10px] text-slate-500">Dominant</span>
              <span className="text-xs font-semibold text-slate-200">{result.dominantLanguage}</span>
            </div>
            {onAskQuestionClick && (
              <button
                onClick={onAskQuestionClick}
                className="ml-auto bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 px-4 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                id="btn-ask-question-trigger"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Ask about audio</span>
              </button>
            )}
          </div>
        </div>

        {/* Language Percentage Mix Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span className="font-display font-semibold text-sm text-slate-200">Bilingual Balance</span>
            </div>
            <div className="p-1 bg-slate-950/60 rounded-lg text-[9px] font-mono text-slate-400 border border-slate-800">
              {result.languageMixPercentage}
            </div>
          </div>

          <div className="space-y-4 my-4">
            {/* Mix slider visualisation */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Hausa</span>
                <span>English</span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: result.languageMixPercentage.toLowerCase().includes("hausa") ? "65%" : "35%" }} 
                />
                <div 
                  className="bg-sky-500 h-full transition-all duration-500" 
                  style={{ width: result.languageMixPercentage.toLowerCase().includes("hausa") ? "35%" : "65%" }} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-emerald-500/5 rounded-xl p-2.5 border border-emerald-500/10">
                <p className="text-[10px] text-emerald-400 font-medium">Bicultural Dialects</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Spontaneous borrowing</p>
              </div>
              <div className="bg-sky-500/5 rounded-xl p-2.5 border border-sky-500/10">
                <p className="text-[10px] text-sky-450 font-medium">Code-Mixing</p>
                <p className="text-[10px] text-slate-400 mt-0.5">High level fluid transition</p>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 leading-snug">
            Fluently switching between languages represents conversational standards in West African metropolises.
          </p>
        </div>
      </div>

      {/* 2. Main Transcription Grid View Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Segments Script Timeline (Takes 2 columns) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-sm" id="timeline-transcript-panel">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-display font-bold text-base text-slate-200 flex items-center gap-2">
              <Languages className="w-5 h-5 text-emerald-400" />
              <span>Dialogue Transcript Timeline</span>
            </h3>

            {/* Segment Display Switcher */}
            <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800/80">
              {(["both", "original", "translated"] as const).map((tab) => {
                const label = tab === "both" ? "Dual View" : tab === "original" ? "Original" : "Translation";
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveSegmentTab(tab)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                      activeSegmentTab === tab
                        ? "bg-slate-800 text-emerald-450 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtering Tools Row */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search words in transcript..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 border border-slate-800 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Copy / Export Buttons */}
            <div className="flex items-center gap-2 shrink-0 self-end">
              <button
                onClick={handleCopyFullTranscript}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer border border-slate-800"
                title="Copy entire transcript text"
                id="copy-all-btn"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAll ? "Copied!" : "Copy All"}</span>
              </button>
              
              <button
                onClick={downloadTXTReport}
                className="p-1.5 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded-xl transition cursor-pointer border border-slate-800"
                title="Download report (.txt)"
                id="download-txt-btn"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={downloadJSONReport}
                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-850 text-slate-400 rounded-xl text-xs transition cursor-pointer border border-slate-800 font-mono"
                title="Export JSON metadata"
                id="download-json-btn"
              >
                JSON
              </button>
            </div>
          </div>

          {/* Script list scrollholder */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {filteredSegments.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Search className="w-8 h-8 mx-auto stroke-1 mb-2 opacity-40" />
                <p className="text-xs">
                  {searchTerm ? "No lines match your search criteria." : "No transcript lines found."}
                </p>
              </div>
            ) : (
              filteredSegments.map((segment, idx) => {
                const isActive = activeSegmentIndex === idx;
                const isBilingualSpeaker = segment.spokenLanguage.toLowerCase().includes("mixed") || segment.spokenLanguage.toLowerCase().includes("bilingual");
                
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveSegmentIndex(isActive ? null : idx)}
                    className={`group rounded-2xl p-4 transition-all duration-200 border cursor-pointer ${
                      isActive
                        ? "bg-slate-950/80 border-emerald-500/20 shadow-md"
                        : "bg-slate-950/20 border-slate-800/40 hover:bg-slate-950/40 hover:border-slate-800"
                    }`}
                  >
                    {/* Segment Meta */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-semibold text-xs text-slate-300 group-hover:text-emerald-400 transition-colors">
                          {segment.speaker}
                        </span>
                        <span className="text-[9px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md">
                          {segment.timestamp}
                        </span>
                      </div>

                      {/* Language indicator tag */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-mono ${
                            segment.spokenLanguage === "Hausa"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : segment.spokenLanguage === "English"
                              ? "bg-slate-800 text-slate-400 border border-slate-700/60"
                              : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                          }`}
                        >
                          {segment.spokenLanguage}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopySegment(segment, idx);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition"
                          title="Copy statement"
                        >
                          {copiedIndex === idx ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Dialogue Contents */}
                    <div className="space-y-2">
                      {(activeSegmentTab === "both" || activeSegmentTab === "original") && (
                        <div className="text-xs text-slate-100 leading-relaxed font-sans">
                          {segment.originalText}
                        </div>
                      )}

                      {activeSegmentTab === "both" && (
                        <div className="border-t border-slate-900 pt-1.5 mt-1.5 flex gap-1.5 items-start">
                          <span className="text-[10px] text-slate-500 shrink-0 font-mono italic mt-0.5">TR:</span>
                          <p className="text-xs text-slate-400 font-sans italic leading-relaxed">
                            {segment.translationText}
                          </p>
                        </div>
                      )}

                      {activeSegmentTab === "translated" && (
                        <div className="text-xs text-slate-350 italic leading-relaxed font-sans">
                          {segment.translationText}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Vocabulary & Cultural Glossary cards */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-sm" id="glossary-shelf-card">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h3 className="font-display font-semibold text-sm text-slate-200">
              Bilingual Cultural Glossary
            </h3>
          </div>

          <p className="text-xs text-slate-400 leading-normal">
            Selected interesting idioms, slang patterns, and essential Hausa expressions used during this recording:
          </p>

          <div className="space-y-4">
            {result.vocabulary.length === 0 ? (
              <div className="text-center py-8 text-slate-600 bg-slate-950/20 rounded-2xl border border-slate-800/40">
                <Bookmark className="w-6 h-6 mx-auto opacity-30 mb-2" />
                <p className="text-xs">No vocabulary patterns highlighted.</p>
              </div>
            ) : (
              result.vocabulary.map((vocab, index) => (
                <div
                  key={index}
                  className="bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/60 p-4 rounded-2xl space-y-2.5 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 font-display">
                      {vocab.phrase}
                    </span>
                    <span className="text-[9px] bg-slate-900 text-slate-450 text-slate-400 border border-slate-800/80 font-mono px-2 py-0.5 rounded uppercase">
                      {vocab.originalLanguage}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 font-mono">LITERAL TRANSLATION</p>
                    <p className="text-xs text-slate-200 font-medium">
                      "{vocab.literalMeaning}"
                    </p>
                  </div>

                  <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-900 text-[11px] text-slate-400 font-sans leading-relaxed">
                    <span className="font-semibold text-slate-300 block mb-0.5 uppercase tracking-wide text-[9px]">Cultural / Idiomatic Context</span>
                    {vocab.culturalContext}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-[11px] text-slate-400 leading-loose flex gap-2">
            <Volume2 className="w-4 h-4 text-emerald-405 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Tip:</strong> In Kaduna & Kano code-mixing, English nouns and verbs are blended into Hausa grammar structures (e.g., "Muna deployment") for rapid professional expression.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
