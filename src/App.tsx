/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Info, ExternalLink, Sparkles, Terminal, X, AudioLines, Copy, Check, Code, Database, Plus, Trash2, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { LiveAgent } from './services/liveAgent';

interface KnowledgeItem {
  id: number;
  topic: string;
  content: string;
}

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge'>('chat');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcriptions, setTranscriptions] = useState<{ text: string; isModel: boolean }[]>([]);
  const [currentCode, setCurrentCode] = useState<string | null>(null);
  const [codeTitle, setCodeTitle] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Check if we are in embed mode (e.g., ?embed=true)
  const isEmbed = new URLSearchParams(window.location.search).get('embed') === 'true';

  // Knowledge Base State
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [newTopic, setNewTopic] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const agentRef = useRef<LiveAgent | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchKnowledge();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptions, isOpen, activeTab]);

  const fetchKnowledge = async () => {
    try {
      const res = await fetch('/api/knowledge');
      const data = await res.json();
      setKnowledge(data);
    } catch (err) {
      console.error("Failed to fetch knowledge:", err);
    }
  };

  const addKnowledge = async () => {
    if (!newTopic || !newContent) return;
    setIsAdding(true);
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: newTopic, content: newContent }),
      });
      if (res.ok) {
        setNewTopic('');
        setNewContent('');
        fetchKnowledge();
      }
    } catch (err) {
      console.error("Failed to add knowledge:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const deleteKnowledge = async (id: number) => {
    try {
      await fetch('/api/knowledge/' + id, { method: 'DELETE' });
      fetchKnowledge();
    } catch (err) {
      console.error("Failed to delete knowledge:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      window.parent.postMessage({ type: 'ATLAS_OPENED' }, '*');
    } else {
      window.parent.postMessage({ type: 'ATLAS_CLOSED' }, '*');
    }
  }, [isOpen]);

  const handleTranscription = (text: string, isModel: boolean) => {
    setTranscriptions(prev => [...prev, { text, isModel }]);
  };

  const handleCodeDisplay = (code: string, title?: string) => {
    setCurrentCode(code);
    if (title) setCodeTitle(title);
  };

  const handleToggleConnection = async () => {
    if (isConnected) {
      agentRef.current?.disconnect();
      setIsConnected(false);
      setTranscriptions([]);
      setCurrentCode(null);
      setCodeTitle(null);
    } else {
      setIsConnecting(true);
      try {
        const knowledgeText = knowledge.map(k => `Topic: ${k.topic}\nContent: ${k.content}`).join('\n\n');
        const agent = new LiveAgent(handleTranscription, handleCodeDisplay, knowledgeText);
        await agent.connect();
        agentRef.current = agent;
        setIsConnected(true);
        setActiveTab('chat');
      } catch (error) {
        console.error("Failed to connect:", error);
      } finally {
        setIsConnecting(false);
      }
    }
  };

  const copyToClipboard = () => {
    if (currentCode) {
      navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-emerald-500/30">
      {/* Main Page Content (Simulating the developer portal) - Hidden in embed mode */}
      {!isEmbed && (
        <div className="max-w-4xl mx-auto px-6 py-20">
          <header className="mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 mb-4">Web SDK Integration</h1>
            <p className="text-lg text-zinc-600">Learn how to integrate the Smartech Javascript SDK into your website for marketing automation.</p>
          </header>
          
          <div className="space-y-8">
            <section className="p-8 rounded-2xl bg-white border border-zinc-200 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Overview</h2>
              <p className="text-zinc-600 leading-relaxed">
                The Smartech Javascript SDK allows you to track user behavior, manage feature flags, and orchestrate multi-channel marketing campaigns directly from your web application.
              </p>
            </section>
            
            <section className="p-8 rounded-2xl bg-white border border-zinc-200 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Prerequisites</h2>
              <ul className="list-disc list-inside space-y-2 text-zinc-600">
                <li>Active Netcore Smartech account</li>
                <li>Website asset created in Smartech dashboard</li>
                <li>Access to your website's source code</li>
              </ul>
            </section>
          </div>
        </div>
      )}

      {/* Floating Atlas Logo */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(16,185,129,0.4)] z-40 group"
      >
        <AudioLines className="w-8 h-8 text-black group-hover:animate-pulse" />
        <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-400">
          ATLAS
        </span>
      </motion.button>

      {/* Half Interstitial Popup */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />

            {/* Popup Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 w-full md:w-[600px] h-full bg-[#0a0a0a] text-zinc-100 shadow-2xl z-50 flex flex-col border-l border-zinc-800"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-800 flex flex-col gap-4 bg-zinc-900/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      <AudioLines className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg tracking-tight">Atlas</h3>
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
                          {isConnected ? 'Live Assistant' : isConnecting ? 'Connecting...' : 'Ready to assist'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all ${
                      activeTab === 'chat' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    Voice Chat
                  </button>
                  <button
                    onClick={() => setActiveTab('knowledge')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all ${
                      activeTab === 'knowledge' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5" />
                    Knowledge Base
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'chat' ? (
                  <>
                    <div 
                      ref={scrollRef}
                      className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-zinc-900/20 to-transparent"
                    >
                      <AnimatePresence initial={false}>
                        {transcriptions.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                            <div className="w-20 h-20 rounded-full border border-dashed border-zinc-700 flex items-center justify-center">
                              <Sparkles className="w-8 h-8 text-emerald-400" />
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-zinc-300">Welcome to Atlas</p>
                              <p className="text-xs font-light max-w-[220px] leading-relaxed">
                                I'm your voice-enabled guide for Smartech SDK. Click below to start our session.
                              </p>
                            </div>
                          </div>
                        ) : (
                          transcriptions.map((t, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              className={`flex ${t.isModel ? 'justify-start' : 'justify-end'}`}
                            >
                              <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                                t.isModel 
                                  ? 'bg-zinc-800/80 text-zinc-200 border border-zinc-700/50 rounded-tl-none backdrop-blur-sm' 
                                  : 'bg-emerald-500/10 text-emerald-100 border border-emerald-500/20 rounded-tr-none'
                              }`}>
                                <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1 font-mono">
                                  {t.isModel ? 'Atlas' : 'Developer'}
                                </div>
                                <div className="markdown-body">
                                  <Markdown>{t.text}</Markdown>
                                </div>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Code Snippet Display Area */}
                    <AnimatePresence>
                      {currentCode && (
                        <motion.div
                          initial={{ y: 50, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 50, opacity: 0 }}
                          className="mx-6 mb-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl relative group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
                              <Code className="w-3 h-3 text-emerald-500" />
                              {codeTitle || 'Code Syntax'}
                            </div>
                            <button
                              onClick={copyToClipboard}
                              className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-white flex items-center gap-1.5 text-[10px] uppercase tracking-wider"
                            >
                              {copied ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  Copy Code
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="text-xs font-mono text-emerald-400/90 overflow-x-auto p-3 bg-black/50 rounded-lg border border-zinc-800/50 max-h-[200px] custom-scrollbar">
                            <code>{currentCode}</code>
                          </pre>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-950/50">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-emerald-400 mb-2">
                        <BookOpen className="w-4 h-4" />
                        <h4 className="text-sm font-semibold">Custom Training Data</h4>
                      </div>
                      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
                        <input
                          type="text"
                          placeholder="Topic (e.g. Custom Event Tracking)"
                          value={newTopic}
                          onChange={(e) => setNewTopic(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                        <textarea
                          placeholder="Content/Instructions for Atlas..."
                          value={newContent}
                          onChange={(e) => setNewContent(e.target.value)}
                          rows={4}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                        />
                        <button
                          onClick={addKnowledge}
                          disabled={isAdding || !newTopic || !newContent}
                          className="w-full bg-emerald-500 text-black font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-emerald-400 disabled:opacity-50 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add to Knowledge Base
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Stored Knowledge</h5>
                        <span className="text-[10px] text-zinc-600">{knowledge.length} items</span>
                      </div>
                      <div className="space-y-3">
                        {knowledge.map((item) => (
                          <div key={item.id} className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 group relative">
                            <button
                              onClick={() => deleteKnowledge(item.id)}
                              className="absolute top-2 right-2 p-1.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <h6 className="text-xs font-semibold text-emerald-400 mb-1">{item.topic}</h6>
                            <p className="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed">{item.content}</p>
                          </div>
                        ))}
                        {knowledge.length === 0 && (
                          <div className="text-center py-8 text-zinc-600 text-xs italic">
                            No custom knowledge added yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="p-6 border-t border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
                <div className="flex flex-col gap-4">
                  <button
                    onClick={handleToggleConnection}
                    disabled={isConnecting}
                    className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg ${
                      isConnected 
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' 
                        : 'bg-emerald-500 text-black font-bold hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    {isConnected ? (
                      <>
                        <MicOff className="w-5 h-5" />
                        End Conversation
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5" />
                        {isConnecting ? 'Connecting Atlas...' : 'Talk to Atlas'}
                      </>
                    )}
                  </button>
                  
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono uppercase tracking-tighter">
                      <Terminal className="w-3 h-3" />
                      v2.5 Live Engine
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono uppercase tracking-tighter">
                      <Volume2 className="w-3 h-3" />
                      Zephyr Voice
                    </div>
                  </div>
                </div>
              </div>

              {/* Visualization Waveform */}
              {isConnected && activeTab === 'chat' && (
                <div className="h-12 bg-emerald-500/5 flex items-center justify-center gap-1 overflow-hidden">
                  {[...Array(24)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        height: [4, Math.random() * 30 + 10, 4],
                      }}
                      transition={{ 
                        duration: 0.5 + Math.random(), 
                        repeat: Infinity, 
                        ease: "easeInOut"
                      }}
                      className="w-1 bg-emerald-500/30 rounded-full"
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
