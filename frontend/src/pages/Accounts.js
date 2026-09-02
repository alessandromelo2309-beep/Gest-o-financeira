import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CreditCard, Eye } from 'lucide-react';
import { apiCall } from '../api';
import { formatCurrency } from '../utils';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

const ACCOUNT_TYPES = { checking: 'Conta Corrente', savings: 'Poupança', credit: 'Cartão de Crédito', investment: 'Investimento', cash: 'Dinheiro' };

export default function AccountsPage() {
  const { theme: t } = useTheme();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showMovs, setShowMovs] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'checking', balance: '', color: '#3B82F6' });

  useEffect(() => { loadAccounts(); }, []);
  const loadAccounts = async () => { try { setAccounts(await apiCall('/accounts')); } catch (err) { console.error(err); } };
  const loadMovs = async (id) => { try { setTransactions(await apiCall(`/transactions?account_id=${id}`)); setShowMovs(id); } catch (err) { console.error(err); } };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try { const body = { ...form, balance: parseFloat(form.balance) || 0 }; if (editing) await apiCall(`/accounts/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) }); else await apiCall('/accounts', { method: 'POST', body: JSON.stringify(body) }); setShowModal(false); setEditing(null); setForm({ name: '', type: 'checking', balance: '', color: '#3B82F6' }); loadAccounts(); } catch (err) { alert(err.message); }
  };
  const handleDelete = async (id) => { if (!window.confirm('Excluir esta conta?')) return; try { await apiCall(`/accounts/${id}`, { method: 'DELETE' }); loadAccounts(); } catch (err) { alert(err.message); } };
  const inputS = { width: '100%', padding: '10px 14px', border: `1px solid ${t.borderInput}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: t.bgInput, color: t.text };
  const labelS = { fontSize: '13px', fontWeight: '600', color: t.textSecondary, display: 'block', marginBottom: '6px' };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: t.text, margin: 0 }}>Contas</h1>
        <button onClick={() => { setForm({ name: '', type: 'checking', balance: '', color: '#3B82F6' }); setEditing(null); setShowModal(true); }} style={{ padding: '10px 20px', backgroundColor: t.primary, color: t.textOnPrimary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={18} /> Nova Conta</button>
      </div>
      {accounts.length === 0 ? (
        <EmptyState icon={<CreditCard size={40} />} title="Nenhuma conta cadastrada" message="Adicione suas contas bancárias" actionLabel="Nova Conta" onAction={() => { setForm({ name: '', type: 'checking', balance: '', color: '#3B82F6' }); setEditing(null); setShowModal(true); }} />
      ) : (
        <>
          <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: t.shadow, transition: 'all 0.3s' }}>
            <span style={{ fontSize: '14px', color: t.textMuted, fontWeight: '500' }}>Saldo Total</span>
            <span style={{ fontSize: '24px', fontWeight: '700', color: t.text }}>{formatCurrency(accounts.reduce((s, a) => s + a.balance, 0))}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {accounts.map(account => (
              <div key={account.id} style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', boxShadow: t.shadow, borderTop: `4px solid ${account.color}`, transition: 'all 0.3s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: account.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CreditCard size={20} color={account.color} /></div>
                  <div><h3 style={{ fontSize: '16px', fontWeight: '600', color: t.text, margin: 0 }}>{account.name}</h3><p style={{ fontSize: '13px', color: t.textLight, margin: 0 }}>{ACCOUNT_TYPES[account.type]}</p></div>
                </div>
                <p style={{ fontSize: '24px', fontWeight: '700', color: account.balance >= 0 ? t.success : t.danger, marginBottom: '12px' }}>{formatCurrency(account.balance)}</p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => loadMovs(account.id)} style={{ background: 'none', border: `1px solid ${t.border}`, cursor: 'pointer', padding: '6px', borderRadius: '6px', color: t.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Eye size={15} /></button>
                  <button onClick={() => { setEditing(account); setForm({ name: account.name, type: account.type, balance: account.balance.toString(), color: account.color }); setShowModal(true); }} style={{ background: 'none', border: `1px solid ${t.border}`, cursor: 'pointer', padding: '6px', borderRadius: '6px', color: t.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit2 size={15} /></button>
                  <button onClick={() => handleDelete(account.id)} style={{ background: 'none', border: `1px solid ${t.border}`, cursor: 'pointer', padding: '6px', borderRadius: '6px', color: t.textDanger, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null); }} title={editing ? 'Editar Conta' : 'Nova Conta'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div><label style={labelS}>Nome</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputS} required /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelS}>Tipo</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ ...inputS, cursor: 'pointer' }}>{Object.entries(ACCOUNT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label style={labelS}>Saldo Inicial</label><input type="number" step="0.01" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} style={inputS} /></div>
          </div>
          <div><label style={labelS}>Cor</label><input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ width: '100%', height: '44px', border: `1px solid ${t.borderInput}`, borderRadius: '8px', cursor: 'pointer', padding: '4px', backgroundColor: t.bgInput }} /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={() => { setShowModal(false); setEditing(null); }} style={{ padding: '10px 20px', backgroundColor: t.bgHover, color: t.textSecondary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: t.primary, color: t.textOnPrimary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>{editing ? 'Salvar' : 'Adicionar'}</button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={!!showMovs} onClose={() => { setShowMovs(null); setTransactions([]); }} title="Movimentações da Conta">
        {transactions.length === 0 ? <p style={{ textAlign: 'center', color: t.textLight, padding: '20px' }}>Nenhuma movimentação</p> : (
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            {transactions.map(tx => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${t.borderLight}` }}>
                <div><div style={{ fontWeight: '500', color: t.text }}>{tx.description}</div><div style={{ fontSize: '12px', color: t.textLight }}>{tx.date}</div></div>
                <span style={{ fontWeight: '600', color: tx.type === 'income' ? t.success : t.danger }}>{tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
