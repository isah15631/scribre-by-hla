import { useState, useRef, useEffect } from "react";
import { TranscriptionResult } from "../types";
import { apiUrl } from "../utils/api";
import { Send, Sparkles, BrainCircuit, X, MessageSquareCode, ArrowDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

interface AudioQAProps {
  result: TranscriptionResult;
  onClose?: () => void;
}

const SUGGESTED_QUESTIONS = [
  "Summarize this conversation in brief bullet points.",
  "Which specific amounts, locations, or names were discussed?",
  "Analyze the tone, code-mixing strategy, and cultural nuances of the speakers.",
  "Draft a professional reply to this dialogue in polite bilingual Hausa/English.",
];

export default function AudioQA({ result, onClose }: AudioQAProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmitQuestion = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: "user", text: queryText };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl("/api/ask"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result: result,
          question: queryText,
          history: messages, // Send history for continuous chat context
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to receive answer from server.");
      }

      const data = await response.json();
      const modelMsg: ChatMessage = { role: "model", text: data.answer };
      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error("QA error:", err);
      setError(err.message || "An error occurred fetching response from Gemini.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl h-[560px] flex flex-col overflow-hidden shadow-2xl relative" id="audio-qa-widget">
      
      {/* QA Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-405 text-emerald-450 text-emerald-400 rounded-lg shrink-0">
            <BrainCircuit className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="font-display font-semibold text-xs text-slate-100 flex items-center gap-1.5">
              <span>Bicultural Transcript Co-pilot</span>
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            </h4>
            <p className="text-[10px] text-slate-500 font-mono">
              Ask questions about what took place in this audio
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-200 transition cursor-pointer"
            title="Close chatbot drawer"
            id="close-qa-btn"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={listRef} id="qa-messages-scroll-well">
        {messages.length === 0 ? (
          <div className="text-center py-8 space-y-4 self-center justify-center my-auto">
            <MessageSquareCode className="w-10 h-10 mx-auto text-slate-700 stroke-1" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-350 text-slate-300">
                Type or click a suggestion below to analyze this audio:
              </p>
              <p className="text-[10px] text-slate-500">
                Gemini understands the full dialogue, timestamps, and vocabulary contexts.
              </p>
            </div>

            {/* Suggested Questions Bubble */}
            <div className="flex flex-col gap-2 max-w-sm mx-auto pt-2">
              {SUGGESTED_QUESTIONS.map((question, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmitQuestion(question)}
                  className="px-3.5 py-2 hover:bg-slate-800 text-slate-300 hover:text-emerald-450 border border-slate-800 hover:border-slate-700 text-left text-[11px] rounded-xl transition duration-150 cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={index}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    isUser
                      ? "bg-emerald-500 text-slate-950 font-medium rounded-tr-none shadow-md"
                      : "bg-slate-950 text-slate-200 rounded-tl-none border border-slate-800/80 shadow"
                  }`}
                >
                  <p className="font-semibold text-[9px] uppercase tracking-wider mb-1 text-slate-500">
                    {isUser ? "You" : "Gemini Co-pilot"}
                  </p>
                  
                  {/* Clean paragraphs for messaging */}
                  <div className="whitespace-pre-line overflow-x-auto space-y-1 select-text">
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Loading indicators */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-950 border border-slate-800 text-slate-300 rounded-2xl rounded-tl-none p-3.5 space-y-2 max-w-[80%] shadow">
              <span className="font-semibold text-[9px] uppercase tracking-wider text-slate-500 block">
                Gemini Co-pilot
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                <span className="text-[10px] text-slate-500 ml-1.5 font-mono">Formulating response...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-left">
            {error}
          </div>
        )}
      </div>

      {/* Suggested Follow-up tray (visible when there is chat conversation) */}
      {messages.length > 0 && !isLoading && (
        <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950/60 flex gap-2 overflow-x-auto select-none no-scrollbar shrink-0">
          {SUGGESTED_QUESTIONS.slice(0, 2).map((q, i) => (
            <button
              key={i}
              onClick={() => handleSubmitQuestion(q)}
              className="px-2.5 py-1 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-[10px] text-slate-400 hover:text-slate-200 rounded-lg shrink-0 transition cursor-pointer"
            >
              {q.length > 40 ? q.slice(0, 38) + "..." : q}
            </button>
          ))}
        </div>
      )}

      {/* Text Form Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmitQuestion(inputValue);
        }}
        className="p-4 border-t border-slate-805 border-slate-800 bg-slate-950 flex gap-2 shrink-0"
        id="qa-form-holder"
      >
        <input
          type="text"
          placeholder="Ask something (e.g., 'Translate the final segment to French' or 'What is Alhaji selling?')"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-slate-900 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 border border-slate-800 focus:outline-none focus:border-emerald-500/50"
          id="qa-text-input"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className={`p-2.5 rounded-xl transition duration-150 flex items-center justify-center cursor-pointer ${
            inputValue.trim() && !isLoading
              ? "bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950"
              : "bg-slate-900 text-slate-600 cursor-not-allowed"
          }`}
          id="qa-send-btn"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
