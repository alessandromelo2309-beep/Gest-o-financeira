import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { apiCall } from '../api';
import { formatCurrency, getCurrentMonth } from '../utils';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

const BRANDS = { visa: 'Visa', mastercard: 'Mastercard', elo: 'Elo', amex: 'Amex', outro: 'Outro' };
const BRAND_COLORS = { visa: '#1A1F71', mastercard: '#EB001B', elo: '#FF5F00', amex: '#006FCF', outro: '#6B7280' };

export default function CreditCardsPage() {
  const { theme: t } = useTheme();
  const [cards, setCards] = useState([]);
  const [summary, setSummary] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', brand: 'visa', last_four: '', limit_amount: '', closing_day: 1, due_day: 10, color: '#3B82F6' });

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try { const [c, s] = await Promise.all([apiCall('/cards'), apiCall('/cards/summary')]); setCards(c); setSummary(s); } catch (err) { console.error(err); }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const body = { ...form, limit_amount: parseFloat(form.limit_amount), closing_day: parseInt(form.closing_day), due_day: parseInt(form.due_day) };
      if (editing) await apiCall(`/cards/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await apiCall('/cards', { method: 'POST', body: JSON.stringify(body) });
      setShowModal(false); setEditing(null); loadData();
    } catch (err) { alert(err.message); }
  };
  const handleDelete = async (id) => { if (!window.confirm('Excluir este cartão?')) return; try { await apiCall(`/cards/${id}`, { method: 'DELETE' }); loadData(); } catch (err) { alert(err.message); } };
  const inputS = { width: '100%', padding: '10px 14px', border: `1px solid ${t.borderInput}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: t.bgInput, color: t.text };
  const labelS = { fontSize: '13px', fontWeight: '600', color: t.textSecondary, display: 'block', marginBottom: '6px' };

  const totalLimit = summary.reduce((s, c) => s + (c.limit_amount || 0), 0);
  const totalSpent = summary.reduce((s, c) => s + (c.spent || 0), 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: t.text, margin: 0 }}>Cartões de Crédito</h1>
        <button onClick={() => { setForm({ name: '', brand: 'visa', last_four: '', limit_amount: '', closing_day: 1, due_day: 10, color: '#3B82F6' }); setEditing(null); setShowModal(true); }}
          style={{ padding: '10px 20px', backgroundColor: t.primary, color: t.textOnPrimary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={18} /> Novo Cartão
        </button>
      </div>

      {cards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', boxShadow: t.shadow, display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.3s' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: t.bgInfo, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CreditCard size={20} color={t.primary} /></div>
            <div><p style={{ fontSize: '13px', color: t.textMuted, margin: 0 }}>Total Limite</p><p style={{ fontSize: '20px', fontWeight: '700', color: t.text, margin: '4px 0 0' }}>{formatCurrency(totalLimit)}</p></div>
          </div>
          <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', boxShadow: t.shadow, display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.3s' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: t.bgDanger, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertCircle size={20} color={t.danger} /></div>
            <div><p style={{ fontSize: '13px', color: t.textMuted, margin: 0 }}>Utilizado</p><p style={{ fontSize: '20px', fontWeight: '700', color: t.danger, margin: '4px 0 0' }}>{formatCurrency(totalSpent)}</p></div>
          </div>
          <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', boxShadow: t.shadow, display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.3s' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: t.bgSuccess, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={20} color={t.success} /></div>
            <div><p style={{ fontSize: '13px', color: t.textMuted, margin: 0 }}>Disponível</p><p style={{ fontSize: '20px', fontWeight: '700', color: t.success, margin: '4px 0 0' }}>{formatCurrency(totalLimit - totalSpent)}</p></div>
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <EmptyState icon={<CreditCard size={40} />} title="Nenhum cartão cadastrado" message="Adicione seus cartões de crédito" actionLabel="Novo Cartão" onAction={() => { setForm({ name: '', brand: 'visa', last_four: '', limit_amount: '', closing_day: 1, due_day: 10, color: '#3B82F6' }); setEditing(null); setShowModal(true); }} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {summary.map(card => {
            const pct = card.limit_amount > 0 ? Math.min((card.spent / card.limit_amount) * 100, 100) : 0;
            const barColor = pct >= 80 ? t.danger : pct >= 50 ? t.warning : t.success;
            return (
              <div key={card.id} style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', boxShadow: t.shadow, borderLeft: `4px solid ${card.color}`, transition: 'all 0.3s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '28px', borderRadius: '4px', backgroundColor: BRAND_COLORS[card.brand] || BRAND_COLORS.outro, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: '700', letterSpacing: '0.5px' }}>{BRANDS[card.brand]?.substring(0, 4).toUpperCase()}</div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', color: t.text, margin: 0 }}>{card.name}</h3>
                      <p style={{ fontSize: '12px', color: t.textLight, margin: '2px 0 0' }}>{card.last_four ? `•••• ${card.last_four}` : ''}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => { setEditing(card); setForm({ name: card.name, brand: card.brand, last_four: card.last_four || '', limit_amount: card.limit_amount.toString(), closing_day: card.closing_day, due_day: card.due_day, color: card.color }); setShowModal(true); }} style={{ background: 'none', border: `1px solid ${t.border}`, cursor: 'pointer', padding: '4px', borderRadius: '4px', color: t.textMuted, display: 'flex' }}><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(card.id)} style={{ background: 'none', border: `1px solid ${t.border}`, cursor: 'pointer', padding: '4px', borderRadius: '4px', color: t.textDanger, display: 'flex' }}><Trash2 size={14} /></button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: t.textMuted }}>Fatura atual</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: barColor }}>{formatCurrency(card.spent)} / {formatCurrency(card.limit_amount)}</span>
                </div>
                <div style={{ height: '8px', backgroundColor: t.bgHover, borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: '4px', transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: t.textLight }}>
                  <span>Fechamento: dia {card.closing_day}</span>
                  <span>Vencimento: dia {card.due_day}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null); }} title={editing ? 'Editar Cartão' : 'Novo Cartão'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div><label style={labelS}>Nome</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputS} placeholder="Ex: Nubank, Itaú..." required /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelS}>Bandeira</label><select value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} style={{ ...inputS, cursor: 'pointer' }}>{Object.entries(BRANDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label style={labelS}>Últimos 4 dígitos</label><input type="text" maxLength={4} value={form.last_four} onChange={e => setForm({ ...form, last_four: e.target.value })} style={inputS} placeholder="1234" /></div>
          </div>
          <div><label style={labelS}>Limite (R$)</label><input type="number" step="0.01" min="0.01" value={form.limit_amount} onChange={e => setForm({ ...form, limit_amount: e.target.value })} style={inputS} required /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelS}>Dia fechamento</label><input type="number" min="1" max="31" value={form.closing_day} onChange={e => setForm({ ...form, closing_day: e.target.value })} style={inputS} required /></div>
            <div><label style={labelS}>Dia vencimento</label><input type="number" min="1" max="31" value={form.due_day} onChange={e => setForm({ ...form, due_day: e.target.value })} style={inputS} required /></div>
          </div>
          <div><label style={labelS}>Cor</label><input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ width: '100%', height: '44px', border: `1px solid ${t.borderInput}`, borderRadius: '8px', cursor: 'pointer', padding: '4px', backgroundColor: t.bgInput }} /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={() => { setShowModal(false); setEditing(null); }} style={{ padding: '10px 20px', backgroundColor: t.bgHover, color: t.textSecondary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: t.primary, color: t.textOnPrimary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>{editing ? 'Salvar' : 'Adicionar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
