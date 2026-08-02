'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, User, Bot, Loader2, ArrowRight } from 'lucide-react';
import { aiApi } from '../../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I am your Enterprise AI Assistant. How can I help you with your operations today? You can ask me about sales insights, HR metrics, or inventory alerts.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    setMounted(true);
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    try {
      const apiMessages = newMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const res = await aiApi.chat(apiMessages);
      const aiContent = res.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error(err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Error communicating with AI service. Please check API key.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (text: string) => {
    setInput(text);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={24} style={{ color: '#fbbf24' }} />
            AI Operations Assistant
          </h1>
          <p>Interact with your enterprise data using natural language.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', flex: 1, minHeight: 0 }}>
        
        {/* Chat Interface */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          
          {/* Chat Messages Container — Using CSS Variables for Dark Mode Compatibility */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--color-background)' }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', gap: '16px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: msg.role === 'user' ? '#2563eb' : '#f59e0b',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div style={{
                  background: msg.role === 'user' ? '#2563eb' : 'var(--color-surface)',
                  color: msg.role === 'user' ? 'white' : 'var(--color-text-primary)',
                  padding: '16px',
                  borderRadius: '12px',
                  borderTopRightRadius: msg.role === 'user' ? '4px' : '12px',
                  borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  maxWidth: '75%',
                  fontSize: '14.5px',
                  lineHeight: 1.5,
                  border: msg.role === 'assistant' ? '1px solid var(--color-border)' : 'none'
                }}>
                  {msg.content}
                  <div style={{ fontSize: '11px', color: msg.role === 'user' ? '#bfdbfe' : 'var(--color-text-muted)', marginTop: '8px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                    {mounted ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={18} />
                </div>
                <div style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: '12px', borderTopLeftRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
                  <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Analyzing enterprise data...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar — Theme-Aware */}
          <div style={{ padding: '20px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about revenue, inventory, or HR metrics..."
                style={{
                  flex: 1,
                  padding: '16px 20px',
                  paddingRight: '60px',
                  borderRadius: '24px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  fontSize: '15px',
                  outline: 'none',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                }}
              />
              <button 
                type="submit"
                disabled={!input.trim() || isTyping}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '6px',
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: !input.trim() || isTyping ? 'var(--color-border)' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: !input.trim() || isTyping ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>

        {/* Right Panel - Suggestions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: 'white', border: 'none' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
              <Sparkles size={16} style={{ color: '#fbbf24' }} />
              Suggested Prompts
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                "What is our projected revenue for Q4?",
                "Show me critical inventory stock alerts.",
                "Who has pending leave requests?",
                "Summarize overall enterprise health."
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickAction(prompt)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '13px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                >
                  <span style={{ lineHeight: 1.4 }}>{prompt}</span>
                  <ArrowRight size={14} style={{ opacity: 0.8, flexShrink: 0, marginLeft: '8px' }} />
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>AI Integration Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Model</span>
                <span className="badge" style={{ background: '#dbeafe', color: '#1e40af' }}>llama-3.3-70b-versatile</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>API Status</span>
                <span className="badge badge-active">CONNECTED</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px', lineHeight: 1.5, padding: '12px', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                Groq AI integration is active. The assistant generates real-time responses.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
