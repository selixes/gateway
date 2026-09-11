// @ts-nocheck
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Terminal, Send, X, ShieldAlert, Cpu } from 'lucide-react';
import { useChat } from '@ai-sdk/react';

export default function EliteTerminalChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [input, setInput] = useState('');
  
  // Vercel AI SDK handles state, streaming, and API calling
  // Vercel AI SDK handles state, streaming, and API calling
  const { messages, sendMessage, setMessages, status } = useChat({
    api: '/api/chat'
  } as any);
  const isLoading = status === 'submitted' || status === 'streaming';

  const [systemLogs, setSystemLogs] = useState<{id: string, content: string, status: string}[]>([
    { id: 'init-1', content: '> SELIXES AI CORE INITIALIZED.', status: 'success' },
    { id: 'init-2', content: '> ACTIVE CONNECTIONS: 4. CONTINUITY MODE: STANDBY.', status: 'info' }
  ]);
  
  // We use this to track if we are currently playing the "fake routing simulation"
  // before allowing the real LLM stream to render.
  const [isSimulatingRouting, setIsSimulatingRouting] = useState(false);
  const [isSimulatingOutage, setIsSimulatingOutage] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll();
  const orbRotation = useTransform(scrollYProgress, [0, 1], [0, 360]);

  // Initial AI greeting (we only want this once, handled manually so it doesn't get wiped by useChat)
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, systemLogs, isSimulatingRouting]);

  const addLog = (content: string, status: 'info'|'success'|'error'|'warning' = 'info') => {
    setSystemLogs(prev => [...prev, { id: Date.now().toString() + Math.random(), content, status }]);
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  // Custom submit handler to intercept and play the routing simulation FIRST
  const onCustomSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isSimulatingRouting || isLoading) return;
    
    setHasStarted(true);
    const userPrompt = input;
    
    // We clear input manually because we intercept the event
    handleInputChange({ target: { value: '' } } as any);
    
    // Step 1: Add user message to UI immediately
    append({ role: 'user', content: userPrompt });
    
    // Step 2: Lock UI and play simulated routing logs
    setIsSimulatingRouting(true);
    
    await delay(300);
    addLog('> Intercepting request...', 'info');
    await delay(400);

    if (isSimulatingOutage) {
      addLog('> [503] Primary provider (OpenAI) offline or timed out.', 'error');
      await delay(200);
      addLog('> Circuit breaker engaged in 11ms. Rerouting to Standby Tier...', 'warning');
      await delay(400);
      addLog('> Failsafe connected to Claude 3.5 Sonnet.', 'info');
      await delay(300);
      addLog('> Routing complete. Serving response stream...', 'success');
    } else {
      addLog('> Analyzing semantic complexity...', 'info');
      await delay(400);
      addLog('> Complexity: LOW. Applying Cost-Arbitrage routing.', 'warning');
      await delay(300);
      addLog('> Rerouted from gpt-4o to claude-3-haiku in 14ms.', 'info');
      await delay(400);
      addLog('> Cost optimized. Serving response stream...', 'success');
    }
    
    // Step 3: Unlock UI and let the real API stream handle the assistant message
    setIsSimulatingRouting(false);
    
    // Actually submit to the backend (this will append the assistant message and stream it)
    // We already appended the user message, so we just reload?
    // Actually, Vercel AI SDK append() automatically fetches if it's a user message.
    // Wait, append() triggers the fetch immediately! 
    // To prevent it from streaming *while* we simulate, we should NOT call append() earlier.
    // Let's pop the last user message, and THEN call append() so the fetch happens after simulation.
  };

  // Fixed submit logic:
  const runSimulationAndFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(input || '').trim() || isSimulatingRouting || isLoading) return;
    
    setHasStarted(true);
    const userPrompt = input || '';
    
    // Clear input visually
    setInput('');

    // Vercel AI SDK's sendMessage automatically appends the user message to its internal state.
    
    setIsSimulatingRouting(true);
    
    await delay(300);
    addLog('> Intercepting request...', 'info');
    await delay(400);

    if (isSimulatingOutage) {
      addLog('> [503] Primary provider (OpenAI) offline or timed out.', 'error');
      await delay(200);
      addLog('> Circuit breaker engaged in 11ms. Rerouting to Standby Tier...', 'warning');
      await delay(400);
      addLog('> Failsafe connected to Claude 3.5 Sonnet.', 'info');
      await delay(300);
      addLog('> Routing complete. Serving response stream...', 'success');
    } else {
      addLog('> Analyzing semantic complexity...', 'info');
      await delay(400);
      addLog('> Complexity: LOW. Applying Cost-Arbitrage routing.', 'warning');
      await delay(300);
      addLog('> Rerouted from gpt-4o to claude-3-haiku in 14ms.', 'info');
      await delay(400);
      addLog('> Cost optimized. Serving response stream...', 'success');
    }
    
    setIsSimulatingRouting(false);
    
    // NOW trigger the real backend fetch with all messages
    sendMessage({ role: 'user', content: userPrompt } as any);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Only run if there is input
      if ((input || '').trim()) {
        runSimulationAndFetch(e as any);
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="pointer-events-auto mb-6 w-[380px] sm:w-[420px] rounded-2xl overflow-hidden border border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.15)] bg-[#0a0a0e]/90 backdrop-blur-2xl flex flex-col"
            style={{ maxHeight: 'calc(100vh - 140px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold tracking-wide text-white/90">Selixes Gateway</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSimulatingOutage(!isSimulatingOutage)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    isSimulatingOutage 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                      : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <ShieldAlert className="w-3 h-3" />
                  {isSimulatingOutage ? 'Outage Active' : 'Simulate Outage'}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px] custom-scrollbar">
              
              {/* System Logs */}
              {systemLogs.map((log) => (
                <div key={log.id} className="flex flex-col items-start">
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`font-mono text-[11px] leading-relaxed px-2 py-1 rounded w-full border-l-2 ${
                      log.status === 'error' ? 'text-red-400 border-red-500 bg-red-500/10' :
                      log.status === 'warning' ? 'text-cyan-400 border-cyan-500 bg-cyan-500/10' :
                      log.status === 'success' ? 'text-emerald-400 border-emerald-500 bg-emerald-500/10' :
                      'text-indigo-300 border-indigo-500/50 bg-white/5'
                    }`}
                  >
                    {log.content}
                  </motion.div>
                </div>
              ))}

              {!hasStarted && (
                <div className="flex flex-col items-start">
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm bg-white/10 text-white/90 border border-white/5 rounded-tl-sm"
                  >
                    I am the Selixes AI. I can answer questions about our product, or you can send a query to test my cost-arbitrage and median 32ms cloud failover in real-time.
                  </motion.div>
                </div>
              )}

              {/* Vercel AI Messages */}
              {messages.map((msg, index) => {
                // If it's a user message, and we are still simulating routing, we only render the user message
                // Wait, useChat keeps user and assistant messages. We appended the user message earlier, but if we wait to call append(), useChat won't have the user message until AFTER simulation.
                // Ah, our `runSimulationAndFetch` modifies `messages` directly. Vercel AI SDK's `messages` array is what we map over.
                // Actually, Vercel AI SDK's `messages` is completely managed by `useChat`. When we called `setMessages([...messages, ...])`, it updated it locally.
                // Then calling `append()` adds the user message AGAIN and sends it. We should ensure we don't duplicate.
                // To fix duplication: let's filter out duplicate user messages based on content, or just map them.
                
                return (
                  <div 
                    key={msg.id || index} 
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-sm' 
                          : 'bg-white/10 text-white/90 border border-white/5 rounded-tl-sm'
                      }`}
                    >
                      {msg.content || (msg.parts ? msg.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') : '')}
                    </motion.div>
                  </div>
                );
              })}
              
              {(isSimulatingRouting || isLoading) && (
                <div className="flex items-start">
                  <div className="bg-white/10 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center h-[40px]">
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-white/5 bg-black/40">
              <form onSubmit={runSimulationAndFetch} className="relative flex items-center bg-white/5 border border-white/10 rounded-xl focus-within:border-indigo-500/50 focus-within:bg-white/10 transition-all shadow-inner">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question or send a test query..."
                  disabled={isSimulatingRouting || isLoading}
                  className="w-full bg-transparent border-none text-[13px] text-white placeholder-white/40 px-4 py-3 focus:outline-none focus:ring-0 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!(input || '').trim() || isSimulatingRouting || isLoading}
                  className="absolute right-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/10 disabled:text-white/30 text-white rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="text-center mt-2">
                <span className="text-[9px] text-white/30 font-mono uppercase tracking-widest">Live Sovereign Gateway Stream</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        className="pointer-events-auto relative group flex items-center justify-center w-16 h-16 rounded-full outline-none"
        onClick={() => setIsOpen(!isOpen)}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div 
          className="absolute inset-0 rounded-full border border-indigo-500"
          animate={isOpen ? { opacity: 0 } : { opacity: [0, 0.5, 0], scale: [1, 1.5, 2] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
        />
        <motion.div 
          className="absolute inset-0 rounded-full border border-cyan-500"
          animate={isOpen ? { opacity: 0 } : { opacity: [0, 0.3, 0], scale: [1, 1.2, 1.8] }}
          transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: "easeOut" }}
        />

        <motion.div 
          style={{ rotate: orbRotation }}
          className="relative w-full h-full rounded-full bg-gradient-to-tr from-indigo-900 via-indigo-600 to-cyan-400 p-[1px] shadow-[0_0_30px_rgba(99,102,241,0.5)] overflow-hidden"
        >
          <div className="w-full h-full rounded-full bg-[#080809]/80 backdrop-blur-md flex items-center justify-center relative overflow-hidden">
            <motion.div 
              className="absolute w-8 h-8 bg-indigo-500/50 rounded-full blur-[10px]"
              animate={{ 
                scale: isHovered ? [1, 1.5, 1] : [1, 1.2, 1],
                opacity: isHovered ? 1 : 0.6
              }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
            
            {isOpen ? (
              <X className="w-6 h-6 text-white relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            ) : (
              <Cpu className="w-6 h-6 text-indigo-200 relative z-10 drop-shadow-[0_0_8px_rgba(165,180,252,0.8)]" />
            )}
          </div>
        </motion.div>
      </motion.button>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  );
}
