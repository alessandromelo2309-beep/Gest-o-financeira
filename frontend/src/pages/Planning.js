import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Compass, Plus, Trash2, Edit3, TrendingUp } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../api';

export default function PlanningPage() {
  const { theme: t } = useTheme();
  const [plans, setPlans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [simResult, setSimResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ name: '', initial_amount: '', monthly_contribution: '', interest_rate: '', goal_amount: '', deadline: '' });
  const [simForm, setSimForm] = useState({ initial_amount: '', monthly_contribution: '', interest_rate: '10', years: '10', inflation_rate: '5' });

  const load = async () => {
    try { const r = await api.get('/planning'); setPlans(r.data); } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handlePlan = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/planning/${editing.id}`, form);
      else await api.post('/planning', form);
      setShowForm(false); setEditing(null);
      setForm({ name: '', initial_amount: '', monthly_contribution: '', interest_rate: '', goal_amount: '', deadline: '' });
      load();
    } catch (e) { alert(e.response?.data?.error || 'Erro'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este plano?')) return;
    try { await api.delete(`/planning/${id}`); load(); } catch (e) {}
  };

  const handleSimulate = async () => {
    try {
      const r = await api.post('/planning/simulate', {
        initial_amount: parseFloat(simForm.initial_amount) || 0,
        monthly_contribution: parseFloat(simForm.monthly_contribution) || 0,
        interest_rate: parseFloat(simForm.interest_rate) || 0,
        years: parseInt(simForm.years) || 10,
        inflation_rate: parseFloat(simForm.inflation_rate) || 0,
      });
      setSimResult(r.data);
    } catch (e) { alert('Erro na simulação'); }
  };

  const fmt = (v) => `R$ ${(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${t.borderInput}`, backgroundColor: t.bgInput, color: t.text };
  const labelStyle = { fontSize: '12px', color: t.textSecondary, display: 'block', marginBottom: '4px', fontWeight: '500' };

  const chartData = simResult ? simResult.scenarios.realistic.timeline.map((d, i) => ({
    year: d.year,
    Otimista: simResult.scenarios.optimistic.timeline[i]?.balance || 0,
    Realista: d.balance,
    Conservador: simResult.scenarios.conservative.timeline[i]?.balance || 0,
  })) : [];

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: t.text, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <Compass size={24} /> Planejamento Financeiro
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', padding: '24px', border: `1px solid ${t.border}` }}>
          <h3 style={{ color: t.text, marginBottom: '16px' }}>Simulador de Cenários</h3>
          <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '16px' }}>Veja projeções com diferentes cenários</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelStyle}>Valor inicial</label><input type="number" value={simForm.initial_amount} onChange={e => setSimForm({ ...simForm, initial_amount: e.target.value })} placeholder="10000" style={inputStyle} /></div>
            <div><label style={labelStyle}>Aporte mensal</label><input type="number" value={simForm.monthly_contribution} onChange={e => setSimForm({ ...simForm, monthly_contribution: e.target.value })} placeholder="1000" style={inputStyle} /></div>
            <div><label style={labelStyle}>Taxa anual (%)</label><input type="number" value={simForm.interest_rate} onChange={e => setSimForm({ ...simForm, interest_rate: e.target.value })} style={inputStyle} /></div>
            <div><label style={labelStyle}>Inflação anual (%)</label><input type="number" value={simForm.inflation_rate} onChange={e => setSimForm({ ...simForm, inflation_rate: e.target.value })} style={inputStyle} /></div>
            <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Anos</label><input type="number" value={simForm.years} onChange={e => setSimForm({ ...simForm, years: e.target.value })} style={inputStyle} /></div>
          </div>
          <button onClick={handleSimulate} style={{ marginTop: '16px', padding: '10px 24px', background: t.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={16} /> Simular
          </button>
        </div>

        <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', padding: '24px', border: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: t.text }}>Meus Planos</h3>
            <button onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', initial_amount: '', monthly_contribution: '', interest_rate: '', goal_amount: '', deadline: '' }); }}
              style={{ padding: '6px 12px', background: t.primary, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
              <Plus size={14} /> Novo
            </button>
          </div>
          {plans.length === 0 ? (
            <p style={{ color: t.textMuted, textAlign: 'center', padding: '20px', fontSize: '13px' }}>Nenhum plano criado</p>
          ) : plans.map(p => (
            <div key={p.id} style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '600', color: t.text, fontSize: '14px' }}>{p.name}</div>
                <div style={{ fontSize: '12px', color: t.textMuted }}>Meta: {fmt(p.goal_amount)} • Prazo: {p.projected_date || 'N/A'}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => { setForm(p); setEditing(p); setShowForm(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted }}><Edit3 size={14} /></button>
                <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px', border: `1px solid ${t.border}` }}>
          <h3 style={{ color: t.text, marginBottom: '16px' }}>{editing ? 'Editar' : 'Novo'} Plano</h3>
          <form onSubmit={handlePlan} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Nome</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={inputStyle} /></div>
            <div><label style={labelStyle}>Valor inicial</label><input type="number" value={form.initial_amount} onChange={e => setForm({ ...form, initial_amount: e.target.value })} style={inputStyle} /></div>
            <div><label style={labelStyle}>Aporte mensal</label><input type="number" value={form.monthly_contribution} onChange={e => setForm({ ...form, monthly_contribution: e.target.value })} style={inputStyle} /></div>
            <div><label style={labelStyle}>Taxa anual (%)</label><input type="number" value={form.interest_rate} onChange={e => setForm({ ...form, interest_rate: e.target.value })} style={inputStyle} /></div>
            <div><label style={labelStyle}>Valor da meta</label><input type="number" value={form.goal_amount} onChange={e => setForm({ ...form, goal_amount: e.target.value })} required style={inputStyle} /></div>
            <div><label style={labelStyle}>Prazo (data)</label><input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} style={inputStyle} /></div>
            <div style={{ display: 'flex', gap: '8px', gridColumn: 'span 2' }}>
              <button type="submit" style={{ padding: '10px 20px', background: t.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>{editing ? 'Atualizar' : 'Criar'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} style={{ padding: '10px 20px', background: t.bgHover, color: t.text, border: `1px solid ${t.border}`, borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {simResult && (
        <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', padding: '24px', border: `1px solid ${t.border}` }}>
          <h3 style={{ color: t.text, marginBottom: '16px' }}>Projeção - {simForm.years} anos</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: '10px', border: '1px solid #10B981' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#10B981' }}>{fmt(simResult.scenarios.optimistic.finalBalance)}</div>
              <div style={{ fontSize: '12px', color: t.textMuted }}>Otimista</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: '10px', border: '1px solid #3B82F6' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#3B82F6' }}>{fmt(simResult.scenarios.realistic.finalBalance)}</div>
              <div style={{ fontSize: '12px', color: t.textMuted }}>Realista</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: '10px', border: '1px solid #F59E0B' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#F59E0B' }}>{fmt(simResult.scenarios.conservative.finalBalance)}</div>
              <div style={{ fontSize: '12px', color: t.textMuted }}>Conservador</div>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '16px' }}>Total investido: {fmt(simResult.totalContributed)}</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: t.chartText }} stroke={t.chartGrid} />
              <YAxis tick={{ fontSize: 12, fill: t.chartText }} stroke={t.chartGrid} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius: '8px', border: `1px solid ${t.chartTooltipBorder}`, backgroundColor: t.chartTooltipBg, color: t.chartTooltipText }} />
              <Legend wrapperStyle={{ color: t.chartText }} />
              <Line type="monotone" dataKey="Otimista" stroke="#10B981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Realista" stroke="#3B82F6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Conservador" stroke="#F59E0B" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
