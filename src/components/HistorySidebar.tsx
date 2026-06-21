import { SavedSession } from "../types";
import { Clock, Trash2, Calendar, FileAudio, ChevronRight, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";

interface HistorySidebarProps {
  sessions: SavedSession[];
  currentSessionId: string | null;
  onSelectSession: (session: SavedSession) => void;
  onDeleteSession: (id: string) => void;
  onNewSession: () => void;
}

export default function HistorySidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onNewSession,
}: HistorySidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSessions = sessions.filter((s) => {
    const textSearch = `${s.audioName} ${s.result.title} ${s.result.summary}`.toLowerCase();
    return textSearch.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 border-r border-slate-800" id="history-sidebar">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <span className="font-display font-semibold text-lg tracking-tight">Audio History</span>
          </div>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full font-mono">
            {sessions.length} sessions
          </span>
        </div>

        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-medium py-2 px-3 rounded-xl transition duration-150 text-sm shadow-md cursor-pointer"
          id="btn-new-session"
        >
          <Sparkles className="w-4 h-4" />
          <span>New Transcription</span>
        </button>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search saved transcriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 border border-slate-800 focus:outline-none focus:border-emerald-500/50"
            id="history-search"
          />
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-8 px-4 text-slate-500">
            <Clock className="w-8 h-8 mx-auto stroke-1 mb-2 opacity-50" />
            <p className="text-xs">
              {searchTerm ? "No matching sessions found" : "No transcriptions saved yet"}
            </p>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isSelected = session.id === currentSessionId;
            const dateStr = new Date(session.timestamp).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group relative flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-slate-800/80 border-emerald-500/40 text-white"
                    : "bg-slate-950/40 border-slate-900 hover:bg-slate-800/40 hover:border-slate-800 text-slate-300"
                }`}
                onClick={() => onSelectSession(session)}
                id={`session-card-${session.id}`}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      isSelected ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    <FileAudio className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 pr-4">
                    <h4 className="font-medium text-xs truncate max-w-[170px]" title={session.result.title}>
                      {session.result.title || session.audioName}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>{dateStr}</span>
                    </p>
                    <span className="inline-block mt-1 text-[9px] bg-slate-800 text-emerald-400 font-mono px-1.5 py-0.5 rounded uppercase">
                      {session.promptMode === "bilingual" ? "Bilingual" : session.promptMode}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 hover:text-red-400 text-slate-500 transition-all duration-150"
                    title="Delete saved transcript"
                    id={`delete-btn-${session.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? "text-emerald-400" : "text-slate-600"}`} />
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950 text-[11px] text-slate-500 font-mono text-center">
        <span>Hausa-English Transcriber</span>
      </div>
    </div>
  );
}
