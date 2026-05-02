import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, User, Minimize2, Maximize2, Sparkles, AlertCircle } from 'lucide-react';
import { getChatResponse } from '../services/ai';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Welcome back, Ryan. Markets are active. I'm synced with your LZS strategy and 10-Trade Rule. Need a setup review or strategy clarification?",
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistory = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));
      
      const response = await getChatResponse(
        [...chatHistory, { role: 'user', content: input }],
        new Date().toISOString()
      );

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        id="ai-assistant-toggle"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all",
          isOpen ? "hidden" : "flex items-center justify-center bg-orange-500 text-white"
        )}
      >
        <MessageSquare className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-600"></span>
        </span>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="ai-assistant-window"
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? '64px' : '600px',
              width: '400px'
            }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-orange-500/20 to-red-600/20 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    Trinity AI
                    <Sparkles className="w-3 h-3 text-orange-500 animate-pulse" />
                  </h3>
                  <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Strategy Mentor Active</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4 text-white/60" /> : <Minimize2 className="w-4 h-4 text-white/60" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
                  {messages.map((message, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex gap-3 max-w-[85%]",
                        message.role === 'user' ? "ml-auto flex-row-reverse" : ""
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1",
                        message.role === 'assistant' ? "bg-orange-500/10 text-orange-500" : "bg-white/10 text-white"
                      )}>
                        {message.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <div className="space-y-1">
                        <div className={cn(
                          "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                          message.role === 'assistant' 
                            ? "bg-white/5 text-gray-200 rounded-tl-none border border-white/5" 
                            : "bg-orange-600 text-white rounded-tr-none shadow-lg shadow-orange-600/20"
                        )}>
                          <div className="prose prose-invert prose-sm max-w-none">
                            <Markdown>{message.content}</Markdown>
                          </div>
                        </div>
                        <p className="text-[8px] font-bold uppercase text-white/20 px-1">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 max-w-[85%] animate-pulse">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="bg-white/5 px-4 py-3 rounded-2xl rounded-tl-none border border-white/5 flex gap-1">
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Strategy Reminder Overlay (only if few messages) */}
                {messages.length < 3 && (
                  <div className="px-4 py-2 border-t border-white/5">
                    <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-hide">
                      {['Check LZS Rules', '10 Trades Rule', 'Compounding Advice', 'Gold Sniper Strategy'].map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setInput(prev => prev + tag)}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full text-[10px] font-bold text-white/60 whitespace-nowrap transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Area */}
                <div className="p-4 bg-black border-t border-white/5">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Ask Trinity Mentor..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-orange-500 transition-all placeholder:text-white/20"
                    />
                    <button
                      onClick={handleSend}
                      disabled={isLoading || !input.trim()}
                      className="absolute right-2 p-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mt-3 opacity-20 group">
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Rules based Mentor • Non Financial Advice</span>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
