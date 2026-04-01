import React, { useState, useEffect } from 'react';
import { BookMarked, Plus, Trash2, Calendar, Tag, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import type { JournalEntry } from '../types';

export function Journal({ user }: { user: any }) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({ title: '', content: '', tags: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'journal'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as JournalEntry[];
      setEntries(records);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddEntry = async () => {
    if (!user || !newEntry.title || !newEntry.content) return;
    try {
      await addDoc(collection(db, 'journal'), {
        userId: user.uid,
        title: newEntry.title,
        content: newEntry.content,
        tags: newEntry.tags.split(',').map(t => t.trim()).filter(t => t !== ''),
        timestamp: serverTimestamp()
      });
      setNewEntry({ title: '', content: '', tags: '' });
      setIsAdding(false);
      toast.success("Journal entry saved!");
    } catch (err) {
      console.error("Failed to save entry:", err);
      toast.error("Failed to save entry.");
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'journal', id));
      toast.success("Entry deleted.");
    } catch (err) {
      console.error("Failed to delete entry:", err);
    }
  };

  const filteredEntries = entries.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black mb-2 flex items-center gap-3">
            <BookMarked className="w-10 h-10 text-orange-500" />
            Trading Journal
          </h1>
          <p className="text-gray-500">Document your thoughts, emotions, and market reflections.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/20"
        >
          {isAdding ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {isAdding ? 'Cancel' : 'New Entry'}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white/5 rounded-3xl border border-white/10 p-8 space-y-6"
          >
            <input 
              type="text"
              placeholder="Entry Title"
              value={newEntry.title}
              onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-lg font-bold outline-none focus:border-orange-500 transition-all"
            />
            <textarea 
              placeholder="What's on your mind today? Market conditions, emotions, lessons learned..."
              value={newEntry.content}
              onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
              rows={6}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm outline-none focus:border-orange-500 transition-all resize-none"
            />
            <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-2xl px-6 py-4">
              <Tag className="w-5 h-5 text-gray-500" />
              <input 
                type="text"
                placeholder="Tags (comma separated: e.g. FOMO, Discipline, Gold)"
                value={newEntry.tags}
                onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })}
                className="bg-transparent border-none focus:outline-none text-sm w-full"
              />
            </div>
            <button 
              onClick={handleAddEntry}
              className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-orange-500/20"
            >
              Save Entry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input 
          type="text"
          placeholder="Search your journal..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm outline-none focus:border-orange-500 transition-all"
        />
      </div>

      <div className="space-y-6">
        {filteredEntries.length === 0 ? (
          <div className="py-20 text-center bg-white/5 rounded-3xl border border-white/10 border-dashed">
            <BookMarked className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500">No journal entries found.</p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <motion.div 
              key={entry.id}
              layout
              className="bg-white/5 rounded-3xl border border-white/10 p-8 hover:border-white/20 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold mb-2">{entry.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {entry.timestamp?.toDate().toLocaleDateString()}
                    </span>
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex gap-2">
                        {entry.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-white/5 rounded text-[10px] font-bold text-gray-400">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteEntry(entry.id!)}
                  className="p-2 hover:bg-red-500/20 text-gray-600 hover:text-red-400 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
