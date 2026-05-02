import React, { useState } from 'react';
import { History as HistoryIcon, Trash2, Calendar, TrendingUp, Target, Sparkles, MessageSquare, Send, CheckCircle2, XCircle, PencilLine, Notebook, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import type { AnalysisRecord } from '../types';

export function History({ user, history, onUpdateOutcome, onDeleteRecord }: { user: any; history: AnalysisRecord[]; onUpdateOutcome: (id: string, outcome: 'WIN' | 'LOSS') => Promise<void>; onDeleteRecord: (id: string) => Promise<void> }) {
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  const handleSendFeedback = async (id: string) => {
    if (!feedbackText.trim()) return;
    try {
      const recordRef = doc(db, 'analyses', id);
      await updateDoc(recordRef, { aiFeedback: feedbackText });
      setFeedbackId(null);
      setFeedbackText('');
      toast.success("Feedback sent to AI! Trinity will learn from this trade.");
    } catch (err) {
      console.error("Failed to send feedback:", err);
      toast.error("Failed to send feedback.");
    }
  };

  const handleUpdateNotes = async (id: string) => {
    try {
      const recordRef = doc(db, 'analyses', id);
      await updateDoc(recordRef, { notes: notesText });
      setEditingNotesId(null);
      toast.success("Trading notes updated.");
    } catch (err) {
      console.error("Failed to update notes:", err);
      toast.error("Failed to update notes.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black mb-2 flex items-center gap-3">
            <HistoryIcon className="w-10 h-10 text-orange-500" />
            Trade History
          </h1>
          <p className="text-gray-500">Review your past analyses and provide feedback to improve Trinity AI.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {history.length === 0 ? (
          <div className="py-20 text-center bg-white/5 rounded-3xl border border-white/10 border-dashed">
            <HistoryIcon className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500">No trade history found.</p>
          </div>
        ) : (
          history.map((record) => {
            const result = JSON.parse(record.result);
            return (
              <motion.div 
                key={record.id}
                layout
                className="bg-white/5 rounded-3xl border border-white/10 p-6 sm:p-8 hover:border-white/20 transition-all group relative overflow-hidden"
              >
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="w-full lg:w-64 h-48 rounded-2xl overflow-hidden bg-black flex-shrink-0 border border-white/10">
                    <img src={record.imageUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="Analysis" />
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-2xl font-black">{record.pair}</h3>
                            <span className="px-3 py-1 bg-white/5 rounded-lg text-xs font-bold text-gray-400 border border-white/10">{record.timeframe}</span>
                            {record.outcome && (
                              <span className={cn(
                                "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                                record.outcome === 'WIN' 
                                  ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                                  : "bg-red-500/20 text-red-400 border border-red-500/30"
                              )}>
                                {record.outcome === 'WIN' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {record.outcome}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {record.timestamp?.toDate().toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1 text-orange-500 font-bold">
                            <Sparkles className="w-3 h-3" />
                            AI Confidence: {result.aiConfirmationScore}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                        <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Trade Outcome</span>
                        <div className="flex items-center gap-3">
                          <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 backdrop-blur-md">
                            <button 
                              onClick={() => onUpdateOutcome(record.id!, 'WIN')}
                              className={cn(
                                "px-5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2",
                                record.outcome === 'WIN' 
                                  ? "bg-green-500 text-white shadow-lg shadow-green-500/40 scale-105" 
                                  : "text-gray-500 hover:text-green-400 hover:bg-green-500/10"
                              )}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              WIN
                            </button>
                            <button 
                              onClick={() => onUpdateOutcome(record.id!, 'LOSS')}
                              className={cn(
                                "px-5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2",
                                record.outcome === 'LOSS' 
                                  ? "bg-red-500 text-white shadow-lg shadow-red-500/40 scale-105" 
                                  : "text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                              )}
                            >
                              <XCircle className="w-4 h-4" />
                              LOSS
                            </button>
                          </div>
                          <button 
                            onClick={() => onDeleteRecord(record.id!)}
                            className="p-3 hover:bg-red-500/20 text-gray-600 hover:text-red-400 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Entry Zone</p>
                        <p className="text-lg font-black">{result.sniperEntry.entry}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Stop Loss</p>
                        <p className="text-lg font-black text-red-400">{result.sniperEntry.stopLoss}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Target (TP1)</p>
                        <p className="text-lg font-black text-green-400">{result.sniperEntry.takeProfits[0]?.price}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-sm text-gray-400 leading-relaxed italic">"{result.sniperEntry.reasoning}"</p>
                    </div>

                    {/* Trading Notes Section */}
                    <div className="pt-4 border-t border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Notebook className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-widest">Trading Notes</span>
                        </div>
                        {editingNotesId !== record.id && (
                          <button 
                            onClick={() => {
                              setEditingNotesId(record.id!);
                              setNotesText(record.notes || '');
                            }}
                            className="text-[10px] font-black uppercase tracking-widest text-orange-500 hover:text-orange-400 flex items-center gap-1 transition-colors"
                          >
                            <PencilLine className="w-3 h-3" />
                            {record.notes ? 'Edit Notes' : 'Add Notes'}
                          </button>
                        )}
                      </div>

                      {editingNotesId === record.id ? (
                        <div className="space-y-3">
                          <textarea 
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            placeholder="Add your own observations, execution details, or lessons learned..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-500/50 transition-all resize-none min-h-[80px]"
                          />
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setEditingNotesId(null)}
                              className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleUpdateNotes(record.id!)}
                              className="px-4 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-orange-500/20 transition-all flex items-center gap-1.5"
                            >
                              <Save className="w-3 h-3" />
                              Save Notes
                            </button>
                          </div>
                        </div>
                      ) : (
                        record.notes && (
                          <div className="p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                            <p className="text-sm text-gray-300 leading-relaxed">{record.notes}</p>
                          </div>
                        )
                      )}
                    </div>

                    {/* AI Feedback Section */}
                    <div className="pt-4 border-t border-white/5">
                      {record.aiFeedback ? (
                        <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                          <div className="flex items-center gap-2 mb-2 text-blue-500">
                            <MessageSquare className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">Feedback Sent to AI</span>
                          </div>
                          <p className="text-sm text-blue-200 italic">"{record.aiFeedback}"</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {feedbackId === record.id ? (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="space-y-4"
                            >
                              <textarea 
                                placeholder="Tell Trinity why this trade worked or failed. Be specific about price action, news, or indicators..."
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                rows={3}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm outline-none focus:border-blue-500 transition-all resize-none"
                              />
                              <div className="flex justify-end gap-3">
                                <button 
                                  onClick={() => {
                                    setFeedbackId(null);
                                    setFeedbackText('');
                                  }}
                                  className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-white transition-colors"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => handleSendFeedback(record.id!)}
                                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                                >
                                  <Send className="w-4 h-4" />
                                  Update AI Model
                                </button>
                              </div>
                            </motion.div>
                          ) : (
                            <button 
                              onClick={() => setFeedbackId(record.id!)}
                              className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-500 transition-colors"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Provide Feedback to AI
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
