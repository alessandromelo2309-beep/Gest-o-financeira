import React, { useState, useEffect } from 'react';
import { Repeat, Plus, Trash2, Edit3, Pause, Play } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../api';

const frequencies = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
];

export default function RecurringPage() {
  const { theme: t } = useTheme();
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ account_id: '', category_id: '', type: 'expense', description: '', amount: '', frequency: 'monthly', next_date: '' });

  const load = async () => {
    try {
      const [r, a, c] = await Promise.all([api.get('/recurring'), api.get('/accounts'), api.get('/categories')]);
      setItems(r.data); setAccounts(a.data); setCategories(c.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, amount: parseFloat(form.amount), account_id: parseInt(form.account_id), category_id: form.category_id ? parseInt(form.category_id) : null };
      if (editing) await api.put(`/recurring/${editing.id}`, payload);
      else await api.post('/recurring', payload);
      setShowForm(false); setEditing(null); setForm({ account_id: '', category_id: '', type: 'expense', description: '', amount: '', frequency: 'monthly', next_date: '' });
      load();
    } catch (e) { alert(e.response?.data?.error || 'Erro'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remover esta transação recorrente?')) return;
    try { await api.delete(`/recurring/${id}`); load(); } catch (e) { alert('Erro'); }
  };

  const handleToggle = async (item) => {
    try { await api.put(`/recurring/${item.id}`, { active: item.active ? 0 : 1 }); load(); } catch (e) { alert('Erro'); }
  };

  const handleEdit = (item) => {
    setForm({ account_id: item.account_id, category_id: item.category_id || '', type: item.type, description: item.description, amount: item.amount, frequency: item.frequency, next_date: item.next_date });
    setEditing(item); setShowForm(true);
  };

  const fmt = (v) => `R$ ${(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: t.text, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Repeat size={24} /> Transações Recorrentes
          </h1>
          <p style={{ color: t.textMuted, fontSize: '14px', marginTop: '4px' }}>Aluguel, assinaturas, salário fixo</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ account_id: '', category_id: '', type: 'expense', description: '', amount: '', frequency: 'monthly', next_date: new Date().toISOString().split('T')[0] }); }}
          style={{ padding: '10px 16px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> Nova
        </button>
      </div>

      {showForm && (
        <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px', border: `1px solid ${t.border}` }}>
          <h3 style={{ color: t.text, marginBottom: '16px' }}>{editing ? 'Editar' : 'Nova'} Transação Recorrente</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: t.textSecondary, display: 'block', marginBottom: '4px' }}>Tipo</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${t.borderInput}`, backgroundColor: t.bgInput, color: t.text }}>
                <option value="expense">Despesa</option><option value="income">Receita</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: t.textSecondary, display: 'block', marginBottom: '4px' }}>Descrição</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${t.borderInput}`, backgroundColor: t.bgInput, color: t.text }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: t.textSecondary, display: 'block', marginBottom: '4px' }}>Valor</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${t.borderInput}`, backgroundColor: t.bgInput, color: t.text }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: t.textSecondary, display: 'block', marginBottom: '4px' }}>Frequência</label>
              <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${t.borderInput}`, backgroundColor: t.bgInput, color: t.text }}>
                {frequencies.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: t.textSecondary, display: 'block', marginBottom: '4px' }}>Conta</label>
              <select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${t.borderInput}`, backgroundColor: t.bgInput, color: t.text }}>
                <option value="">Selecione</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: t.textSecondary, display: 'block', marginBottom: '4px' }}>Categoria</label>
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${t.borderInput}`, backgroundColor: t.bgInput, color: t.text }}>
                <option value="">Nenhuma</option>{categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: t.textSecondary, display: 'block', marginBottom: '4px' }}>Próxima data</label>
              <input type="date" value={form.next_date} onChange={e => setForm({ ...form, next_date: e.target.value })} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${t.borderInput}`, backgroundColor: t.bgInput, color: t.text }} />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'end', gridColumn: 'span 2' }}>
              <button type="submit" style={{ padding: '10px 20px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>{editing ? 'Atualizar' : 'Criar'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} style={{ padding: '10px 20px', background: t.bgHover, color: t.text, border: `1px solid ${t.border}`, borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.length === 0 && <p style={{ color: t.textMuted, textAlign: 'center', padding: '40px' }}>Nenhuma transação recorrente</p>}
        {items.map(item => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: t.bgCard, padding: '16px', borderRadius: '12px', border: `1px solid ${t.border}`, opacity: item.active ? 1 : 0.5 }}>
            <div>
              <div style={{ fontWeight: '600', color: t.text }}>{item.description}</div>
              <div style={{ fontSize: '13px', color: t.textMuted }}>
                {frequencies.find(f => f.value === item.frequency)?.label} • {item.account_name} • Próxima: {item.next_date}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: '700', color: item.type === 'income' ? '#10B981' : '#EF4444' }}>
                {item.type === 'income' ? '+' : '-'}{fmt(item.amount)}
              </span>
              <button onClick={() => handleToggle(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: item.active ? '#F59E0B' : '#10B981' }}>
                {item.active ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button onClick={() => handleEdit(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted }}><Edit3 size={16} /></button>
              <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
