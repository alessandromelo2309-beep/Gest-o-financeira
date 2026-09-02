import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { apiCall } from '../api';
import { formatCurrency, getCurrentMonth, getMonthName, getMonthNames, getYears } from '../utils';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

export default function BudgetsPage() {
  const { theme: t } = useTheme();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [period, setPeriod] = useState(getCurrentMonth());
  const [form, setForm] = useState({ category_id: '', amount: '', month: getCurrentMonth().month, year: getCurrentMonth().year });

  useEffect(() => { loadBudgets(); }, [period]);
  const loadBudgets = async () => {
    try {
      const [b, c] = await Promise.all([apiCall(`/budgets?month=${period.month}&year=${period.year}`), apiCall('/categories')]);
      setBudgets(b); setCategories(c);
    } catch (err) { console.error(err); }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const body = { ...form, category_id: parseInt(form.category_id), amount: parseFloat(form.amount), month: parseInt(form.month), year: parseInt(form.year) };
      if (editing) await apiCall(`/budgets/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await apiCall('/budgets', { method: 'POST', body: JSON.stringify(body) });
      setShowModal(false); setEditing(null); loadBudgets();
    } catch (err) { alert(err.message); }
  };
  const handleDelete = async (id) => { if (!window.confirm('Excluir este orçamento?')) return; try { await apiCall(`/budgets/${id}`, { method: 'DELETE' }); loadBudgets(); } catch (err) { alert(err.message); } };
  const inputS = { width: '100%', padding: '10px 14px', border: `1px solid ${t.borderInput}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: t.bgInput, color: t.text };
  const labelS = { fontSize: '13px', fontWeight: '600', color: t.textSecondary, display: 'block', marginBottom: '6px' };
  const expCats = categories.filter(c => c.type === 'expense');
  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spent || 0), 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: t.text, margin: 0 }}>Orçamentos</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={period.month} onChange={e => setPeriod({ ...period, month: e.target.value })} style={{ padding: '8px 12px', border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: t.bgCard, cursor: 'pointer', color: t.textSecondary }}>{getMonthNames().map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
          <select value={period.year} onChange={e => setPeriod({ ...period, year: e.target.value })} style={{ padding: '8px 12px', border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: t.bgCard, cursor: 'pointer', color: t.textSecondary }}>{getYears().map(y => <option key={y} value={y}>{y}</option>)}</select>
          <button onClick={() => { setForm({ category_id: '', amount: '', month: period.month, year: period.year }); setEditing(null); setShowModal(true); }} style={{ padding: '10px 20px', backgroundColor: t.primary, color: t.textOnPrimary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={18} /> Novo Orçamento</button>
        </div>
      </div>
      <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px', boxShadow: t.shadow, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.3s' }}>
        <div><p style={{ fontSize: '13px', color: t.textMuted, margin: 0 }}>{getMonthName(parseInt(period.month))} {period.year}</p><p style={{ fontSize: '13px', color: t.textLight, margin: '4px 0 0' }}>Total orçado: {formatCurrency(totalBudgeted)}</p></div>
        <div style={{ textAlign: 'right' }}><p style={{ fontSize: '22px', fontWeight: '700', color: t.text, margin: 0 }}>{formatCurrency(totalSpent)}</p><p style={{ fontSize: '13px', color: t.textLight, margin: '4px 0 0' }}>gasto de {formatCurrency(totalBudgeted)} ({totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0}%)</p></div>
      </div>
      {budgets.length === 0 ? (
        <EmptyState icon={<AlertTriangle size={40} />} title="Nenhum orçamento" message="Defina limites para suas categorias" actionLabel="Novo Orçamento" onAction={() => { setForm({ category_id: '', amount: '', month: period.month, year: period.year }); setEditing(null); setShowModal(true); }} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {budgets.map(b => {
            const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0;
            const overBudget = b.spent > b.amount;
            const barColor = overBudget ? t.danger : pct >= 80 ? t.warning : t.success;
            return (
              <div key={b.id} style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', boxShadow: t.shadow, transition: 'all 0.3s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>{b.category_icon} {b.category_name}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: t.textLight, margin: 0 }}>Limite: {formatCurrency(b.amount)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => { setEditing(b); setForm({ category_id: b.category_id.toString(), amount: b.amount.toString(), month: b.month, year: b.year }); setShowModal(true); }} style={{ background: 'none', border: `1px solid ${t.border}`, cursor: 'pointer', padding: '4px', borderRadius: '4px', color: t.textMuted, display: 'flex' }}><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(b.id)} style={{ background: 'none', border: `1px solid ${t.border}`, cursor: 'pointer', padding: '4px', borderRadius: '4px', color: t.textDanger, display: 'flex' }}><Trash2 size={14} /></button>
                  </div>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>{formatCurrency(b.spent || 0)}</span>
                    <span style={{ fontSize: '13px', color: overBudget ? t.textDanger : pct >= 80 ? t.textWarning : t.textSuccess }}>{Math.round(pct)}%</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: t.bgHover, borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: '4px', transition: 'width 0.3s, background-color 0.3s' }} />
                  </div>
                </div>
                {overBudget ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: t.bgDanger, borderRadius: '6px', marginTop: '8px' }}>
                    <AlertTriangle size={14} color={t.danger} />
                    <span style={{ fontSize: '12px', fontWeight: '500', color: t.textDanger }}>Estourou {formatCurrency(b.spent - b.amount)}</span>
                  </div>
                ) : pct >= 80 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: t.bgWarning, borderRadius: '6px', marginTop: '8px' }}>
                    <AlertTriangle size={14} color={t.warning} />
                    <span style={{ fontSize: '12px', fontWeight: '500', color: t.textWarning }}>Próximo do limite</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: t.bgSuccess, borderRadius: '6px', marginTop: '8px' }}>
                    <CheckCircle size={14} color={t.success} />
                    <span style={{ fontSize: '12px', fontWeight: '500', color: t.textSuccess }}>Dentro do orçamento</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null); }} title={editing ? 'Editar Orçamento' : 'Novo Orçamento'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div><label style={labelS}>Categoria</label><select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} style={{ ...inputS, cursor: 'pointer' }} required><option value="">Selecione...</option>{expCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div>
          <div><label style={labelS}>Limite (R$)</label><input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={inputS} required /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelS}>Mês</label><select value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} style={{ ...inputS, cursor: 'pointer' }}>{getMonthNames().map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
            <div><label style={labelS}>Ano</label><select value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} style={{ ...inputS, cursor: 'pointer' }}>{getYears().map(y => <option key={y} value={y}>{y}</option>)}</select></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={() => { setShowModal(false); setEditing(null); }} style={{ padding: '10px 20px', backgroundColor: t.bgHover, color: t.textSecondary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: t.primary, color: t.textOnPrimary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>{editing ? 'Salvar' : 'Adicionar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
