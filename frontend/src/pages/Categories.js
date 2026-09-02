import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { apiCall } from '../api';
import { useTheme } from '../contexts/ThemeContext';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';

const EMOJIS = ['🍽️','🛒','🏠','🚌','🎮','📚','💊','💰','🎉','👔','📱','💡','🔧','🎵','✈️','🏋️','🎬','💻','☕','🎁','💄','🐾','🚗','⚡','🛒','📦','🎵','👶','🎓','🏥','🏠','🍕','☕','🎬','✈️','🎮','💻','📚','🎵','💪','💼','🎯'];

export default function CategoriesPage() {
  const { theme: t } = useTheme();
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState('expense');
  const [form, setForm] = useState({ name: '', type: 'expense', color: '#EF4444', icon: '🍽️' });

  useEffect(() => { loadCategories(); }, []);
  const loadCategories = async () => { try { setCategories(await apiCall('/categories')); } catch (err) { console.error(err); } };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try { if (editing) await apiCall(`/categories/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) }); else await apiCall('/categories', { method: 'POST', body: JSON.stringify(form) }); setShowModal(false); setEditing(null); setForm({ name: '', type: tab, color: '#EF4444', icon: '🍽️' }); loadCategories(); } catch (err) { alert(err.message); }
  };
  const handleDelete = async (id) => { if (!window.confirm('Excluir esta categoria?')) return; try { await apiCall(`/categories/${id}`, { method: 'DELETE' }); loadCategories(); } catch (err) { alert(err.message); } };
  const filtered = categories.filter(c => c.type === tab);
  const inputS = { width: '100%', padding: '10px 14px', border: `1px solid ${t.borderInput}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: t.bgInput, color: t.text };
  const labelS = { fontSize: '13px', fontWeight: '600', color: t.textSecondary, display: 'block', marginBottom: '6px' };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: t.text, margin: 0 }}>Categorias</h1>
        <button onClick={() => { setForm({ name: '', type: tab, color: tab === 'expense' ? '#EF4444' : '#10B981', icon: '🍽️' }); setEditing(null); setShowModal(true); }} style={{ padding: '10px 20px', backgroundColor: t.primary, color: t.textOnPrimary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={18} /> Nova Categoria</button>
      </div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', backgroundColor: t.bgCard, borderRadius: '10px', padding: '4px', boxShadow: t.shadow, transition: 'all 0.3s' }}>
        {[['expense','Despesas'],['income','Receitas']].map(([tp, lb]) => (
          <button key={tp} onClick={() => setTab(tp)} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: tab === tp ? t.primary : 'transparent', color: tab === tp ? t.textOnPrimary : t.textMuted }}>{lb}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={<Tag size={40} />} title="Nenhuma categoria" message={`Adicione categorias de ${tab === 'expense' ? 'despesas' : 'receitas'}`} actionLabel="Nova Categoria" onAction={() => { setForm({ name: '', type: tab, color: tab === 'expense' ? '#EF4444' : '#10B981', icon: '🍽️' }); setEditing(null); setShowModal(true); }} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {filtered.map(cat => (
            <div key={cat.id} style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '16px', boxShadow: t.shadow, borderLeft: `4px solid ${cat.color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.3s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>{cat.icon}</span>
                <span style={{ fontSize: '14px', fontWeight: '500', color: t.text }}>{cat.name}</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={() => { setEditing(cat); setForm({ name: cat.name, type: cat.type, color: cat.color, icon: cat.icon }); setShowModal(true); }} style={{ background: 'none', border: `1px solid ${t.border}`, cursor: 'pointer', padding: '4px', borderRadius: '4px', color: t.textMuted, display: 'flex' }}><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(cat.id)} style={{ background: 'none', border: `1px solid ${t.border}`, cursor: 'pointer', padding: '4px', borderRadius: '4px', color: t.textDanger, display: 'flex' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null); }} title={editing ? 'Editar Categoria' : 'Nova Categoria'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div><label style={labelS}>Nome</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputS} required /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelS}>Tipo</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, color: e.target.value === 'expense' ? '#EF4444' : '#10B981' })} style={{ ...inputS, cursor: 'pointer' }}><option value="expense">Despesa</option><option value="income">Receita</option></select></div>
            <div><label style={labelS}>Cor</label><input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ width: '100%', height: '44px', border: `1px solid ${t.borderInput}`, borderRadius: '8px', cursor: 'pointer', padding: '4px', backgroundColor: t.bgInput }} /></div>
          </div>
          <div><label style={labelS}>Ícone</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '4px', maxHeight: '100px', overflow: 'auto', padding: '8px', backgroundColor: t.bgHover, borderRadius: '8px' }}>
              {EMOJIS.map(e => <button key={e} type="button" onClick={() => setForm({ ...form, icon: e })} style={{ width: '32px', height: '32px', borderRadius: '6px', border: form.icon === e ? `2px solid ${t.primary}` : `1px solid ${t.border}`, backgroundColor: form.icon === e ? t.bgInfo : t.bgCard, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>{e}</button>)}
            </div>
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
