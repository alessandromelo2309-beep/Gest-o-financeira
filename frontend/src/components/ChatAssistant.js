import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, Trash2, Bot, User } from 'lucide-react';
import { apiCall } from '../api';
import { useTheme } from '../contexts/ThemeContext';

export default function ChatAssistant() {
  const { theme: t } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEnd = useRef(null);
  const inputRef = useRef(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (isOpen && !initialized) {
      setMessages([{
        role: 'bot',
        text: `Olá! 👋\n\nSou a **NEXA**, sua assistente inteligente do **GESTÃO FINANCEIRA**.\n\nPosso te ajudar com:\n• 💰 Suas finanças (saldo, gastos, receitas)\n• 📚 Dúvidas gerais e estudos\n• ✍️ Escrita e redação\n• 🧮 Cálculos matemáticos\n• 💡 Ideias e planejamento\n• 😄 Conversa e humor\n\nComo posso ajudar?`,
        ts: Date.now()
      }]);
      setInitialized(true);
    }
  }, [isOpen, initialized]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    const userMsg = { role: 'user', text: msg, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const data = await apiCall('/assistant', { method: 'POST', body: JSON.stringify({ message: msg }) });
      setMessages(prev => [...prev, { role: 'bot', text: data.response, ts: Date.now() }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Desculpe, ocorreu um erro. Pode tentar novamente?', ts: Date.now() }]);
    }
    setLoading(false);
  };

  const clearChat = async () => {
    try { await apiCall('/assistant/history', { method: 'DELETE' }); } catch(e) {}
    setMessages([{
      role: 'bot',
      text: `Conversa reiniciada! 😊\n\nOi, sou a **NEXA**. Como posso ajudar?`,
      ts: Date.now()
    }]);
  };

  const quickActions = [
    { label: '💰 Saldo', msg: 'Quanto tenho?' },
    { label: '📉 Gastos', msg: 'Quanto gastei?' },
    { label: '📈 Receitas', msg: 'Quanto ganhei?' },
    { label: '💎 Economia', msg: 'Minha economia' },
    { label: '📋 Resumo', msg: 'Resumo financeiro' },
    { label: '📊 Comparar', msg: 'Comparar meses' },
    { label: '🧮 Calcular', msg: '250 * 12' },
    { label: '💡 Ideias', msg: 'Me dê ideias de negócio' },
  ];

  const renderText = (text) => {
    return text.split('\n').map((line, i) => {
      let html = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code style="background:rgba(59,130,246,0.1);padding:1px 4px;border-radius:3px;font-size:12px">$1</code>');
      if (html.startsWith('|')) {
        return <div key={i} style={{ fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre', overflowX: 'auto' }} dangerouslySetInnerHTML={{ __html: html }} />;
      }
      return <div key={i} dangerouslySetInnerHTML={{ __html: html || '&nbsp;' }} />;
    });
  };

  return (
    <>
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} style={{
          position: 'fixed', bottom: '24px', right: '24px', width: '60px', height: '60px',
          borderRadius: '50%', background: 'linear-gradient(135deg, #6366F1, #8B5CF6, #A855F7)',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', boxShadow: '0 4px 24px rgba(99,102,241,0.5)',
          zIndex: 9999, transition: 'all 0.3s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 30px rgba(99,102,241,0.6)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(99,102,241,0.5)'; }}>
          <MessageCircle size={26} color="white" />
        </button>
      )}

      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', width: '400px', height: '600px',
          maxHeight: 'calc(100vh - 48px)', backgroundColor: t.bgCard, borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', zIndex: 9999, border: `1px solid ${t.border}`, transition: 'all 0.3s',
        }}>
          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6, #A855F7)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={20} color="white" />
              </div>
              <div>
                <div style={{ color: 'white', fontSize: '16px', fontWeight: '800', letterSpacing: '0.5px' }}>NEXA</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ADE80', boxShadow: '0 0 6px #4ADE80' }} />
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px', fontWeight: '500' }}>Sua assistente inteligente</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={clearChat} title="Limpar conversa" style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px',
                cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Trash2 size={16} />
              </button>
              <button onClick={() => setIsOpen(false)} style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px',
                cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div style={{
            flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px',
            background: `linear-gradient(180deg, ${t.bg} 0%, ${t.bgCard} 100%)`,
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: '10px', animation: 'fadeIn 0.3s ease',
              }}>
                {msg.role === 'bot' && (
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                  }}>
                    <Bot size={16} color="white" />
                  </div>
                )}
                <div style={{
                  maxWidth: '82%', padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  backgroundColor: msg.role === 'user' ? t.primary : t.bgHover,
                  color: msg.role === 'user' ? 'white' : t.text,
                  fontSize: '13.5px', lineHeight: '1.6', whiteSpace: 'pre-wrap',
                  boxShadow: msg.role === 'user' ? `0 2px 8px ${t.primary}33` : t.shadow,
                }}>
                  {msg.role === 'bot' ? renderText(msg.text) : msg.text}
                </div>
                {msg.role === 'user' && (
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '10px',
                    backgroundColor: t.bgHover, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                  }}>
                    <User size={16} color={t.textMuted} />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bot size={16} color="white" />
                </div>
                <div style={{
                  padding: '12px 18px', borderRadius: '16px', backgroundColor: t.bgHover,
                  display: 'flex', gap: '5px', alignItems: 'center',
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                      animation: `bounce 1.4s infinite ${i * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          {messages.length <= 1 && (
            <div style={{ padding: '0 16px 10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {quickActions.map((a, i) => (
                <button key={i} onClick={() => { setInput(a.msg); setTimeout(send, 50); }}
                  style={{
                    padding: '6px 12px', borderRadius: '20px', border: `1px solid ${t.border}`,
                    backgroundColor: t.bgCard, color: t.textSecondary, fontSize: '12px',
                    cursor: 'pointer', transition: 'all 0.15s', fontWeight: '500',
                  }}
                  onMouseEnter={e => { e.target.style.backgroundColor = t.primary; e.target.style.color = 'white'; e.target.style.borderColor = t.primary; }}
                  onMouseLeave={e => { e.target.style.backgroundColor = t.bgCard; e.target.style.color = t.textSecondary; e.target.style.borderColor = t.border; }}>
                  {a.label}
                </button>
              ))}
            </div>
          )}

          <div style={{
            padding: '12px 16px', borderTop: `1px solid ${t.border}`,
            backgroundColor: t.bgCard,
          }}>
            <div style={{
              display: 'flex', gap: '8px', alignItems: 'center',
              padding: '4px 4px 4px 16px', borderRadius: '14px',
              border: `1.5px solid ${t.borderInput}`, backgroundColor: t.bgInput,
              transition: 'border-color 0.2s',
            }}>
              <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Digite sua mensagem..."
                style={{
                  flex: 1, border: 'none', background: 'none', outline: 'none',
                  fontSize: '14px', color: t.text, padding: '8px 0',
                }} />
              <button onClick={send} disabled={!input.trim() || loading}
                style={{
                  width: '40px', height: '40px', borderRadius: '12px', border: 'none',
                  background: input.trim() && !loading ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : t.bgHover,
                  cursor: input.trim() && !loading ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', flexShrink: 0,
                  boxShadow: input.trim() && !loading ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                }}>
                <Send size={18} color={input.trim() && !loading ? 'white' : t.textLight} />
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
      `}</style>
    </>
  );
}
