import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react';
import { apiCall } from '../api';
import { formatCurrency, formatDate, getCurrentMonth, getMonthNames, getYears } from '../utils';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

export default function TransactionsPage({ onNewTransaction }) {
  const { theme: t } = useTheme();
  const [searchParams] = useSearchParams();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState({ month: getCurrentMonth().month, year: getCurrentMonth().year, type: searchParams.get('type') || '', search: searchParams.get('search') || '' });
  const [form, setForm] = useState({ account_id: '', to_account_id: '', category_id: '', type: 'expense', description: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });

  useEffect(() => { loadData(); }, [filter]);
  useEffect(() => {
    const tp = searchParams.get('type'); const sq = searchParams.get('search');
    if (tp || sq) setFilter(f => ({ ...f, type: tp || f.type, search: sq || f.search }));
  }, [searchParams]);

  const loadData = async () => {
    try {
      const params = new URLSearchParams({ month: filter.month, year: filter.year });
      if (filter.type) params.append('type', filter.type);
      const [tx, a, c] = await Promise.all([apiCall(`/transactions?${params}`), apiCall('/accounts'), apiCall('/categories')]);
      let filtered = tx;
      if (filter.search) { const q = filter.search.toLowerCase(); filtered = tx.filter(x => x.description.toLowerCase().includes(q) || (x.category_name && x.category_name.toLowerCase().includes(q)) || (x.notes && x.notes.toLowerCase().includes(q))); }
      setTransactions(filtered); setAccounts(a); setCategories(c);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const body = { ...form, amount: parseFloat(form.amount), account_id: parseInt(form.account_id), to_account_id: form.to_account_id ? parseInt(form.to_account_id) : null, category_id: form.category_id ? parseInt(form.category_id) : null };
      if (editing) await apiCall(`/transactions/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await apiCall('/transactions', { method: 'POST', body: JSON.stringify(body) });
      setShowModal(false); setEditing(null); resetForm(); loadData();
    } catch (err) { alert(err.message); }
  };

  const handleEdit = (tx) => { setEditing(tx); setForm({ account_id: tx.account_id.toString(), to_account_id: tx.to_account_id?.toString() || '', category_id: tx.category_id?.toString() || '', type: tx.type, description: tx.description, amount: tx.amount.toString(), date: tx.date, notes: tx.notes || '' }); setShowModal(true); };
  const handleDelete = async (id) => { if (!window.confirm('Excluir esta transação?')) return; try { await apiCall(`/transactions/${id}`, { method: 'DELETE' }); loadData(); } catch (err) { alert(err.message); } };
  const resetForm = () => setForm({ account_id: accounts[0]?.id?.toString() || '', to_account_id: '', category_id: '', type: 'expense', description: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const filteredCategories = categories.filter(c => c.type === form.type);
  const typeLabel = (type) => type === 'income' ? 'Receita' : type === 'expense' ? 'Despesa' : 'Transferência';
  const iconForType = (type) => type === 'income' ? <ArrowUpRight size={12} /> : type === 'expense' ? <ArrowDownRight size={12} /> : <ArrowLeftRight size={12} />;

  const inputS = { width: '100%', padding: '10px 14px', border: `1px solid ${t.borderInput}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: t.bgInput, color: t.text };
  const selectS = { ...inputS, cursor: 'pointer', backgroundColor: t.bgInput };
  const labelS = { fontSize: '13px', fontWeight: '600', color: t.textSecondary, display: 'block', marginBottom: '6px' };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: t.text, margin: 0 }}>Lançamentos</h1>
        <button onClick={() => { resetForm(); setEditing(null); setShowModal(true); }} style={{ padding: '10px 20px', backgroundColor: t.primary, color: t.textOnPrimary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={18} /> Novo Lançamento</button>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', backgroundColor: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', flex: '1 1 200px' }}>
          <Search size={16} color={t.textLight} />
          <input type="text" placeholder="Buscar..." value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} style={{ border: 'none', outline: 'none', fontSize: '14px', width: '100%', color: t.text, backgroundColor: 'transparent' }} />
        </div>
        <select value={filter.month} onChange={e => setFilter({ ...filter, month: e.target.value })} style={{ padding: '9px 12px', border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: t.bgCard, cursor: 'pointer', color: t.textSecondary }}>{getMonthNames().map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
        <select value={filter.year} onChange={e => setFilter({ ...filter, year: e.target.value })} style={{ padding: '9px 12px', border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: t.bgCard, cursor: 'pointer', color: t.textSecondary }}>{getYears().map(y => <option key={y} value={y}>{y}</option>)}</select>
        <select value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })} style={{ padding: '9px 12px', border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: t.bgCard, cursor: 'pointer', color: t.textSecondary }}>
          <option value="">Todos os tipos</option><option value="income">Receitas</option><option value="expense">Despesas</option><option value="transfer">Transferências</option>
        </select>
      </div>
      {transactions.length === 0 ? (
        <EmptyState icon={<ArrowUpRight size={40} />} title="Nenhum lançamento encontrado" message="Adicione seu primeiro lançamento financeiro" actionLabel="Novo Lançamento" onAction={() => { resetForm(); setEditing(null); setShowModal(true); }} />
      ) : (
        <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', overflow: 'hidden', boxShadow: t.shadow, transition: 'all 0.3s' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              {[['Data'],['Descrição'],['Tipo'],['Categoria'],['Conta'],['Valor'],['Ações']].map(([h], i) => (
                <th key={i} style={{ padding: '12px 16px', textAlign: 'left', backgroundColor: t.bgTableHead, borderBottom: `1px solid ${t.border}`, fontSize: '12px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{transactions.map(tx => (
              <tr key={tx.id} style={{ borderBottom: `1px solid ${t.borderLight}` }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: t.textSecondary }}>{formatDate(tx.date)}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: t.text }}>{tx.description}</div>
                  {tx.type === 'transfer' && tx.to_account_name && <div style={{ fontSize: '12px', color: t.textLight, marginTop: '2px' }}>→ {tx.to_account_name}</div>}
                  {tx.notes && <div style={{ fontSize: '12px', color: t.textLight }}>{tx.notes}</div>}
                </td>
                <td style={{ padding: '12px 16px' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', backgroundColor: tx.type === 'income' ? t.bgSuccess : tx.type === 'expense' ? t.bgDanger : t.bgInfo, color: tx.type === 'income' ? t.textSuccess : tx.type === 'expense' ? t.textDanger : t.textInfo }}>{iconForType(tx.type)} {typeLabel(tx.type)}</span></td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: t.textSecondary }}>{tx.category_icon} {tx.category_name || '-'}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', color: t.textSecondary }}>{tx.account_name}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: tx.type === 'income' ? t.success : tx.type === 'transfer' ? t.textInfo : t.danger }}>{tx.type === 'income' ? '+' : tx.type === 'transfer' ? '↔' : '-'} {formatCurrency(tx.amount)}</td>
                <td style={{ padding: '12px 16px' }}><div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => handleEdit(tx)} style={{ background: 'none', border: `1px solid ${t.border}`, cursor: 'pointer', padding: '6px', borderRadius: '6px', color: t.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit2 size={15} /></button>
                  <button onClick={() => handleDelete(tx.id)} style={{ background: 'none', border: `1px solid ${t.border}`, cursor: 'pointer', padding: '6px', borderRadius: '6px', color: t.textDanger, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={15} /></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null); }} title={editing ? 'Editar Lançamento' : 'Novo Lançamento'} wide>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>{['expense', 'income', 'transfer'].map(tipo => (
            <button key={tipo} type="button" onClick={() => setForm({ ...form, type: tipo, category_id: '' })} style={{ flex: 1, padding: '10px', border: '2px solid', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', borderColor: form.type === tipo ? (tipo === 'expense' ? t.danger : tipo === 'income' ? t.success : t.primary) : t.border, backgroundColor: form.type === tipo ? (tipo === 'expense' ? t.bgDanger : tipo === 'income' ? t.bgSuccess : t.bgInfo) : t.bgCard, color: form.type === tipo ? (tipo === 'expense' ? t.textDanger : tipo === 'income' ? t.textSuccess : t.textInfo) : t.textMuted }}>
              {tipo === 'expense' ? 'Despesa' : tipo === 'income' ? 'Receita' : 'Transferência'}
            </button>
          ))}</div>
          <div><label style={labelS}>Descrição</label><input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={inputS} required /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelS}>Valor (R$)</label><input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={inputS} required /></div>
            <div><label style={labelS}>Data</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputS} required /></div>
          </div>
          {form.type === 'transfer' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'end' }}>
              <div><label style={labelS}>Conta Origem</label><select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })} style={selectS} required><option value="">Selecione...</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}</select></div>
              <div style={{ paddingBottom: '4px', fontSize: '20px', color: t.textMuted }}>→</div>
              <div><label style={labelS}>Conta Destino</label><select value={form.to_account_id} onChange={e => setForm({ ...form, to_account_id: e.target.value })} style={selectS} required><option value="">Selecione...</option>{accounts.filter(a => a.id.toString() !== form.account_id).map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}</select></div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={labelS}>Conta</label><select value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })} style={selectS} required><option value="">Selecione...</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
              <div><label style={labelS}>Categoria</label><select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} style={selectS}><option value="">Selecione...</option>{filteredCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div>
            </div>
          )}
          <div><label style={labelS}>Observação</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...inputS, minHeight: '60px', resize: 'vertical' }} /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={() => { setShowModal(false); setEditing(null); }} style={{ padding: '10px 20px', backgroundColor: t.bgHover, color: t.textSecondary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: t.primary, color: t.textOnPrimary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={18} /> {editing ? 'Salvar' : 'Adicionar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
