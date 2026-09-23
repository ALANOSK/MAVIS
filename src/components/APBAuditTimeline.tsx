import React from 'react';
import { DigitalAPB, APBNote } from '../types';
import { Calendar, User, Shield, Radio, CheckCircle, Clock } from 'lucide-react';

interface APBAuditTimelineProps {
  apb: DigitalAPB;
  onAddNote?: (text: string) => Promise<void> | void;
  showAddInput?: boolean;
  theme?: 'light' | 'dark';
}

export default function APBAuditTimeline({ apb, onAddNote, showAddInput = false, theme = 'dark' }: APBAuditTimelineProps) {
  const isLight = theme === 'light';
  const [newNoteText, setNewNoteText] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const notes = apb.notes || [];

  // Sort notes by newest first (descending by utcTimestamp)
  const sortedNotes = [...notes].sort((a, b) => {
    return new Date(b.utcTimestamp).getTime() - new Date(a.utcTimestamp).getTime();
  });

  const handleAdd = async () => {
    if (!newNoteText.trim() || !onAddNote || isSaving) return;
    try {
      setIsSaving(true);
      await onAddNote(newNoteText.trim());
      setNewNoteText('');
    } catch (err) {
      console.error("Error saving note:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`rounded-xl border p-5 space-y-4 h-auto min-h-0 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'}`}>
      <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
        <div>
          <h3 className={`text-xs font-black tracking-widest uppercase flex items-center gap-2 ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>
            <Radio className={`w-4 h-4 animate-pulse ${isLight ? 'text-sky-700' : 'text-sky-400'}`} />
            Operational Audit Timeline & Log
          </h3>
          <p className={`text-[10px] uppercase font-mono mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
            APB: {apb.apbUniqueNumber} | Version: v{apb.previousActualCounts.length + 1}
          </p>
        </div>
        <span className={`rounded px-2 py-0.5 text-[9px] font-bold font-mono border ${isLight ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'}`}>
          {notes.length} EVENT{notes.length !== 1 ? 'S' : ''}
        </span>
      </div>

      {showAddInput && onAddNote && (
        <div className={`space-y-2 p-3 rounded-lg border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'}`}>
          <label className={`text-[10px] uppercase font-bold tracking-wider block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Add Operations Note to Timeline
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Type audit comment or discrepancy notes here..."
              className={`flex-1 rounded border py-1.5 px-3 text-xs outline-none focus:border-sky-500 ${isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-[#161920] border-white/10 text-white placeholder-slate-500 focus:border-sky-500/50'}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
              disabled={isSaving}
            />
            <button
              onClick={handleAdd}
              disabled={isSaving || !newNoteText.trim()}
              className="rounded bg-sky-600 hover:bg-sky-700 disabled:bg-sky-800 disabled:opacity-50 text-white font-bold text-xs px-4 py-1.5 uppercase transition flex items-center gap-1"
            >
              {isSaving ? 'Saving...' : 'Add Note'}
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <div className={`py-8 text-center text-xs italic ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
          No audit log notes or operational timeline events recorded for this APB.
        </div>
      ) : (
        <div className={`relative border-l pl-5 ml-2.5 space-y-5 py-2 max-h-[400px] overflow-y-auto h-auto min-h-0 ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
          {sortedNotes.map((note, index) => {
            return (
              <div key={index} className="relative group">
                {/* Marker point */}
                <span className={`absolute -left-[26px] top-1.5 flex h-3 w-3 items-center justify-center rounded-full border border-sky-500 transition-transform group-hover:scale-125 ${isLight ? 'bg-white ring-4 ring-slate-100' : 'bg-[#1A1D23] ring-4 ring-[#0F1117]'}`} />

                <div className={`rounded-lg border p-3.5 space-y-2 transition duration-150 ${isLight ? 'border-slate-200 bg-slate-50 hover:bg-slate-100/80' : 'border-white/5 bg-[#161920]/60 hover:bg-[#161920]'}`}>
                  <div className={`flex flex-wrap items-center justify-between gap-2 text-[10px] border-b pb-1.5 ${isLight ? 'text-slate-600 border-slate-200' : 'text-slate-400 border-white/5'}`}>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Shield className={`w-3 h-3 ${isLight ? 'text-sky-700' : 'text-sky-400'}`} />
                      <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{note.role}</span>
                      <span className="text-slate-400">•</span>
                      <span className={`font-mono ${isLight ? 'text-sky-700' : 'text-sky-300'}`}>v{note.apbVersion}</span>
                      <span className="text-slate-400">•</span>
                      <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] uppercase tracking-wider ${isLight ? 'bg-slate-200 text-slate-800' : 'bg-white/5 text-slate-300'}`}>
                        {note.eventType.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className={`flex items-center gap-1.5 font-mono ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
                      <Clock className="w-3 h-3" />
                      <span>{new Date(note.utcTimestamp).toUTCString()}</span>
                      <span>(STN: {note.station})</span>
                    </div>
                  </div>

                  <p className={`text-xs leading-relaxed whitespace-pre-wrap font-medium ${isLight ? 'text-slate-800' : 'text-white'}`}>
                    {note.noteText}
                  </p>

                  <div className={`flex flex-wrap justify-between items-center text-[9px] uppercase font-bold pt-1 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>Author: {note.authorName} ({note.authorEmployeeId})</span>
                    </div>
                    <div className={`flex items-center gap-1 font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                      <CheckCircle className="w-3 h-3" />
                      <span>{note.syncStatus}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
