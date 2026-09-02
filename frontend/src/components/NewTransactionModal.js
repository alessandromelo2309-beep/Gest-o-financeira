import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import Modal from './Modal';
import { apiCall } from '../api';
import { useTheme } from '../contexts/ThemeContext';
import { formatCurrency } from '../utils';

export default function NewTransactionModal({ isOpen, onClose, onCreated }) {
  const { theme: t } = useTheme();
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ type: 'expense', account_id: '', to_account_id: '', category_id: '', description: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setForm({ type: 'expense', account_id: '', to_account_id: '', category_id: '', description: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
      setSuccess(false);
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [a, c] = await Promise.all([apiCall('/accounts'), apiCall('/categories')]);
      setAccounts(a); setCategories(c);
      if (a.length > 0) setForm(f => ({ ...f, account_id: a[0].id.toString() }));
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await apiCall('/transactions', { method: 'POST', body: JSON.stringify({ ...form, amount: parseFloat(form.amount), account_id: parseInt(form.account_id), to_account_id: form.to_account_id ? parseInt(form.to_account_id) : null, category_id: form.category_id ? parseInt(form.category_id) : null }) });
      setSuccess(true);
      setTimeout(() => { onCreated && onCreated(); onClose(); }, 1200);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const filteredCategories = categories.filter(c => c.type === form.type);
  const inputStyle = { width: '100%', padding: '10px 14px', border: `1px solid ${t.borderInput}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: t.bgInput, color: t.text, transition: 'all 0.3s' };
  const selectStyle = { ...inputStyle, cursor: 'pointer' };
  const labelStyle = { fontSize: '13px', fontWeight: '600', color: t.textSecondary, display: 'block', marginBottom: '6px' };

  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Novo Lançamento">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: t.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Check size={32} color={t.success} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: t.text, margin: '0 0 8px' }}>Lançamento salvo!</h3>
          <p style={{ fontSize: '14px', color: t.textMuted }}>Transação registrada com sucesso.</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Lançamento">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['expense', 'income', 'transfer'].map(tipo => (
            <button key={tipo} type="button" onClick={() => setForm({ ...form, type: tipo, category_id: '' })}
              style={{
                flex: 1, padding: '10px', border: '2px solid', borderRadius: '8px', cursor: 'pointer',
                fontWeight: '600', fontSize: '13px', transition: 'all 0.2s',
                borderColor: form.type === tipo ? (tipo === 'expense' ? t.danger : tipo === 'income' ? t.success : t.primary) : t.border,
                backgroundColor: form.type === tipo ? (tipo === 'expense' ? t.bgDanger : tipo === 'income' ? t.bgSuccess : t.bgInfo) : t.bgCard,
                color: form.type === tipo ? (tipo === 'expense' ? t.textDanger : tipo === 'income' ? t.textSuccess : t.textInfo) : t.textMuted,
              }}>
              {tipo === 'expense' ? 'Despesa' : tipo === 'income' ? 'Receita' : 'Transferência'}
            </button>
          ))}
        </div>
        <div>
          <label style={labelStyle}>Descrição</label>
          <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            style={inputStyle} placeholder={form.type === 'transfer' ? 'Ex: Transferência entre contas...' : 'Ex: Supermercado, Aluguel...'} required />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Valor (R$)</label>
            <input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
              style={inputStyle} placeholder="0,00" required />
          </div>
          <div>
            <label style={labelStyle}>Data</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} required />
          </div>
        </div>
        {form.type === 'transfer' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'end' }}>
            <div>
              <label style={labelStyle}>Conta Origem</label>
              <select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })} style={selectStyle} required>
                <option value="">Selecione...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
              </select>
            </div>
            <div style={{ paddingBottom: '4px', fontSize: '20px', color: t.textMuted }}>→</div>
            <div>
              <label style={labelStyle}>Conta Destino</label>
              <select value={form.to_account_id} onChange={e => setForm({ ...form, to_account_id: e.target.value })} style={selectStyle} required>
                <option value="">Selecione...</option>
                {accounts.filter(a => a.id.toString() !== form.account_id).map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
              </select>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Conta</label>
              <select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })} style={selectStyle} required>
                <option value="">Selecione...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Categoria</label>
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} style={selectStyle}>
                <option value="">Selecione...</option>
                {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
          </div>
        )}
        <div>
          <label style={labelStyle}>Observação</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="Opcional..." />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
          <button type="button" onClick={onClose} style={{
            padding: '10px 20px', backgroundColor: t.bgHover, color: t.textSecondary,
            border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
          }}>Cancelar</button>
          <button type="submit" disabled={loading} style={{
            padding: '10px 24px', backgroundColor: t.primary, color: t.textOnPrimary,
            border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600',
            cursor: 'pointer', opacity: loading ? 0.7 : 1,
          }}>{loading ? 'Salvando...' : 'Salvar Lançamento'}</button>
        </div>
      </form>
    </Modal>
  );
}
