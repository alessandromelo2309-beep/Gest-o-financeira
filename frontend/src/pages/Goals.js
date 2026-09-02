import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Target, CheckCircle, PlusCircle, PauseCircle, XCircle } from 'lucide-react';
import { apiCall } from '../api';
import { formatCurrency } from '../utils';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

export default function GoalsPage() {
  const { theme: t } = useTheme();
  const [goals, setGoals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [addAmount, setAddAmount] = useState('');
  const [form, setForm] = useState({ name: '', icon: '🎯', target_amount: '', monthly_contribution: '', deadline: '', color: '#3B82F6' });

  useEffect(() => { loadGoals(); }, []);
  const loadGoals = async () => { try { setGoals(await apiCall('/goals')); } catch (err) { console.error(err); } };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const body = { ...form, target_amount: parseFloat(form.target_amount), monthly_contribution: parseFloat(form.monthly_contribution) || 0, deadline: form.deadline || null };
      if (editing) await apiCall(`/goals/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await apiCall('/goals', { method: 'POST', body: JSON.stringify(body) });
      setShowModal(false); setEditing(null); loadGoals();
    } catch (err) { alert(err.message); }
  };
  const handleAdd = async () => {
    if (!addAmount || parseFloat(addAmount) <= 0) return;
    try { await apiCall(`/goals/${showAddModal}/add`, { method: 'POST', body: JSON.stringify({ amount: parseFloat(addAmount) }) }); setShowAddModal(null); setAddAmount(''); loadGoals(); } catch (err) { alert(err.message); }
  };
  const handleDelete = async (id) => { if (!window.confirm('Excluir esta meta?')) return; try { await apiCall(`/goals/${id}`, { method: 'DELETE' }); loadGoals(); } catch (err) { alert(err.message); } };
  const inputS = { width: '100%', padding: '10px 14px', border: `1px solid ${t.borderInput}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: t.bgInput, color: t.text };
  const labelS = { fontSize: '13px', fontWeight: '600', color: t.textSecondary, display: 'block', marginBottom: '6px' };
  const EMOJIS = ['🎯','🏠','🚗','✈️','🎓','💍','📱','💻','🏖️','🎮','💰','🎁','🏥','📚','👔','🐾'];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: t.text, margin: 0 }}>Metas Financeiras</h1>
        <button onClick={() => { setForm({ name: '', icon: '🎯', target_amount: '', monthly_contribution: '', deadline: '', color: '#3B82F6' }); setEditing(null); setShowModal(true); }}
          style={{ padding: '10px 20px', backgroundColor: t.primary, color: t.textOnPrimary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={18} /> Nova Meta
        </button>
      </div>

      {goals.length === 0 ? (
        <EmptyState icon={<Target size={40} />} title="Nenhuma meta criada" message="Defina objetivos financeiros e acompanhe seu progresso" actionLabel="Nova Meta" onAction={() => { setForm({ name: '', icon: '🎯', target_amount: '', monthly_contribution: '', deadline: '', color: '#3B82F6' }); setEditing(null); setShowModal(true); }} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {goals.map(goal => {
            const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
            const remaining = Math.max(goal.target_amount - goal.current_amount, 0);
            const statusColor = goal.status === 'completed' ? t.success : goal.status === 'cancelled' ? t.textLight : goal.color;
            return (
              <div key={goal.id} style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', boxShadow: t.shadow, borderTop: `4px solid ${statusColor}`, transition: 'all 0.3s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '32px' }}>{goal.icon}</div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: t.text, margin: 0 }}>{goal.name}</h3>
                      {goal.deadline && <p style={{ fontSize: '12px', color: t.textLight, margin: '4px 0 0' }}>Prazo: {new Date(goal.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {goal.status === 'active' && <button onClick={() => { setShowAddModal(goal.id); setAddAmount(''); }} title="Adicionar valor" style={{ background: 'none', border: `1px solid ${t.success}`, cursor: 'pointer', padding: '4px', borderRadius: '4px', color: t.success, display: 'flex' }}><PlusCircle size={14} /></button>}
                    <button onClick={() => { setEditing(goal); setForm({ name: goal.name, icon: goal.icon, target_amount: goal.target_amount.toString(), monthly_contribution: goal.monthly_contribution?.toString() || '', deadline: goal.deadline || '', color: goal.color }); setShowModal(true); }} style={{ background: 'none', border: `1px solid ${t.border}`, cursor: 'pointer', padding: '4px', borderRadius: '4px', color: t.textMuted, display: 'flex' }}><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(goal.id)} style={{ background: 'none', border: `1px solid ${t.border}`, cursor: 'pointer', padding: '4px', borderRadius: '4px', color: t.textDanger, display: 'flex' }}><Trash2 size={14} /></button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: t.textMuted }}>{formatCurrency(goal.current_amount)} de {formatCurrency(goal.target_amount)}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: statusColor }}>{Math.round(pct)}%</span>
                </div>
                <div style={{ height: '10px', backgroundColor: t.bgHover, borderRadius: '5px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{ height: '100%', width: `${pct}%`, backgroundColor: statusColor, borderRadius: '5px', transition: 'width 0.5s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: t.textMuted }}>{remaining > 0 ? `Faltam ${formatCurrency(remaining)}` : 'Meta atingida!'}</span>
                  {goal.status === 'active' && goal.monthly_contribution > 0 && <span style={{ fontSize: '12px', color: t.textLight }}>{formatCurrency(goal.monthly_contribution)}/mês</span>}
                  {goal.status === 'completed' && <span style={{ fontSize: '12px', color: t.success, fontWeight: '600' }}>✓ Concluída</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null); }} title={editing ? 'Editar Meta' : 'Nova Meta'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div><label style={labelS}>Nome</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputS} placeholder="Ex: Reserva de emergência" required /></div>
          <div>
            <label style={labelS}>Ícone</label>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>{EMOJIS.map(e => <button key={e} type="button" onClick={() => setForm({ ...form, icon: e })} style={{ width: '36px', height: '36px', borderRadius: '8px', border: form.icon === e ? `2px solid ${t.primary}` : `1px solid ${t.border}`, backgroundColor: form.icon === e ? t.bgInfo : t.bgCard, cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{e}</button>)}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelS}>Valor alvo (R$)</label><input type="number" step="0.01" min="0.01" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} style={inputS} required /></div>
            <div><label style={labelS}>Contribuição mensal (R$)</label><input type="number" step="0.01" min="0" value={form.monthly_contribution} onChange={e => setForm({ ...form, monthly_contribution: e.target.value })} style={inputS} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelS}>Prazo</label><input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} style={inputS} /></div>
            <div><label style={labelS}>Cor</label><input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ width: '100%', height: '44px', border: `1px solid ${t.borderInput}`, borderRadius: '8px', cursor: 'pointer', padding: '4px', backgroundColor: t.bgInput }} /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={() => { setShowModal(false); setEditing(null); }} style={{ padding: '10px 20px', backgroundColor: t.bgHover, color: t.textSecondary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: t.primary, color: t.textOnPrimary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>{editing ? 'Salvar' : 'Criar Meta'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!showAddModal} onClose={() => { setShowAddModal(null); setAddAmount(''); }} title="Adicionar à Meta">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div><label style={labelS}>Valor (R$)</label><input type="number" step="0.01" min="0.01" value={addAmount} onChange={e => setAddAmount(e.target.value)} style={inputS} placeholder="0,00" autoFocus onKeyDown={e => e.key === 'Enter' && handleAdd()} /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => { setShowAddModal(null); setAddAmount(''); }} style={{ padding: '10px 20px', backgroundColor: t.bgHover, color: t.textSecondary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleAdd} style={{ padding: '10px 20px', backgroundColor: t.success, color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Adicionar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
