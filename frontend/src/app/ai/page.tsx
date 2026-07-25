'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, User, Bot, Loader2, ArrowRight } from 'lucide-react';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Mock AI response
    setTimeout(() => {
      let aiContent = "I'm sorry, I don't have access to that information right now. (This is a mock UI, pending real AI integration!)";
      
      const lowerInput = userMessage.content.toLowerCase();
      if (lowerInput.includes('sales') || lowerInput.includes('revenue')) {
        aiContent = "Based on current pipeline acceleration, projected Q4 revenue is 12% above target. Would you like me to generate a full breakdown?";
      } else if (lowerInput.includes('inventory') || lowerInput.includes('stock')) {
        aiContent = "Fiber Optic stock depletion rate has doubled. I recommend initiating a PO immediately. Should I draft the Purchase Order for you?";
      } else if (lowerInput.includes('hr') || lowerInput.includes('employee')) {
        aiContent = "Employee retention is up 2.1% from Q2, currently sitting at 94.2%. Sarah Jenkins and 7 others have pending leave requests awaiting approval.";
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
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
          
          {/* Chat Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#f9fafb' }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', gap: '16px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: msg.role === 'user' ? '#2563eb' : '#fbbf24',
                  color: msg.role === 'user' ? 'white' : '#78350f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div style={{
                  background: msg.role === 'user' ? '#2563eb' : 'white',
                  color: msg.role === 'user' ? 'white' : '#111827',
                  padding: '16px',
                  borderRadius: '12px',
                  borderTopRightRadius: msg.role === 'user' ? '4px' : '12px',
                  borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  maxWidth: '75%',
                  fontSize: '14.5px',
                  lineHeight: 1.5,
                  border: msg.role === 'assistant' ? '1px solid #e5e7eb' : 'none'
                }}>
                  {msg.content}
                  <div style={{ fontSize: '11px', color: msg.role === 'user' ? '#bfdbfe' : '#9ca3af', marginTop: '8px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#fbbf24', color: '#78350f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={18} />
                </div>
                <div style={{ background: 'white', padding: '16px', borderRadius: '12px', borderTopLeftRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Loader2 size={16} className="animate-spin" style={{ color: '#9ca3af' }} />
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Analyzing enterprise data...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', background: 'white' }}>
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
                  border: '1px solid #d1d5db',
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
                  background: !input.trim() || isTyping ? '#e5e7eb' : '#2563eb',
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
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '13px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                  <span style={{ lineHeight: 1.4 }}>{prompt}</span>
                  <ArrowRight size={14} style={{ opacity: 0.7, flexShrink: 0, marginLeft: '8px' }} />
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>AI Integration Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#4b5563', fontWeight: 600 }}>Model</span>
                <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>MOCKED (UI ONLY)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#4b5563', fontWeight: 600 }}>Database Context</span>
                <span className="badge badge-inactive">DISCONNECTED</span>
              </div>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', lineHeight: 1.5, padding: '12px', background: '#f3f4f6', borderRadius: '6px' }}>
                Currently running in demonstration mode. Connect a valid API key in the backend settings to enable real-time generative responses based on live database metrics.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
