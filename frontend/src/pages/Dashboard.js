import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight,
  AlertTriangle, CheckCircle, Info, Clock, BarChart3, ChevronRight, Download, FileText
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { apiCall } from '../api';
import { formatCurrency, formatDate, getCurrentMonth, getMonthName, getMonthNames, getYears } from '../utils';
import { useTheme } from '../contexts/ThemeContext';
import EmptyState from '../components/EmptyState';

export default function DashboardPage({ onNewTransaction }) {
  const { theme: t } = useTheme();
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [recent, setRecent] = useState([]);
  const [upcoming, setUpcoming] = useState({ upcoming: [], overdue: [] });
  const [categoryData, setCategoryData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [period, setPeriod] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [period]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, i, r, u, c, m] = await Promise.all([
        apiCall(`/reports/summary?month=${period.month}&year=${period.year}`),
        apiCall('/reports/insights'),
        apiCall('/reports/recent?limit=5'),
        apiCall('/reports/upcoming?days=7'),
        apiCall(`/reports/by-category?month=${period.month}&year=${period.year}&type=expense`),
        apiCall('/reports/monthly?months=6'),
      ]);
      setSummary(s); setInsights(i); setRecent(r); setUpcoming(u);
      setCategoryData(c.filter(d => d.total > 0)); setMonthlyData(m);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleExportPDF = () => {
    window.open(`/api/export/pdf?month=${period.month}&year=${period.year}`, '_blank');
  };

  const handleExportCSV = () => {
    window.open(`/api/export/csv?month=${period.month}&year=${period.year}`, '_blank');
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: t.textMuted }}>Carregando...</div>;
  if (!summary) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: t.textMuted }}>Erro ao carregar</div>;

  const result = summary.income - summary.expenses;
  const selectStyle = { padding: '8px 12px', border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: t.bgCard, cursor: 'pointer', color: t.textSecondary, transition: 'all 0.3s' };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: t.text, margin: 0, transition: 'color 0.3s' }}>Visão Geral</h1>
          <p style={{ fontSize: '14px', color: t.textMuted, margin: '4px 0 0' }}>{getMonthName(period.month)} de {period.year}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select value={period.month} onChange={e => setPeriod({ ...period, month: e.target.value })} style={selectStyle}>
            {getMonthNames().map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select value={period.year} onChange={e => setPeriod({ ...period, year: e.target.value })} style={selectStyle}>
            {getYears().map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={handleExportPDF} style={{ padding: '8px 12px', background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', cursor: 'pointer', color: t.textSecondary, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
            <FileText size={14} /> PDF
          </button>
          <button onClick={handleExportCSV} style={{ padding: '8px 12px', background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', cursor: 'pointer', color: t.textSecondary, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Saldo Total', value: formatCurrency(summary.totalBalance), color: summary.totalBalance >= 0 ? t.success : t.danger, bg: summary.totalBalance >= 0 ? t.bgSuccess : t.bgDanger, icon: <Wallet size={22} color={summary.totalBalance >= 0 ? t.success : t.danger} />, border: summary.totalBalance >= 0 ? t.success : t.danger },
          { label: 'Receitas do Mês', value: formatCurrency(summary.income), color: t.success, bg: t.bgSuccess, icon: <TrendingUp size={22} color={t.success} />, border: t.success },
          { label: 'Despesas do Mês', value: formatCurrency(summary.expenses), color: t.danger, bg: t.bgDanger, icon: <TrendingDown size={22} color={t.danger} />, border: t.danger },
          { label: 'Resultado do Mês', value: formatCurrency(result), color: result >= 0 ? t.success : t.danger, bg: result >= 0 ? t.bgSuccess : t.bgDanger, icon: result >= 0 ? <ArrowUpRight size={22} color={t.success} /> : <ArrowDownRight size={22} color={t.danger} />, border: result >= 0 ? t.success : t.danger },
        ].map((card, i) => (
          <div key={i} style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: t.shadow, borderLeft: `4px solid ${card.border}`, transition: 'all 0.3s' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{card.icon}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', color: t.textMuted, fontWeight: '500' }}>{card.label}</span>
              <span style={{ fontSize: '20px', fontWeight: '700', color: card.color }}>{card.value}</span>
            </div>
          </div>
        ))}
      </div>

      {insights && insights.insights && insights.insights.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: t.text, margin: '0 0 12px' }}>Insights Financeiros</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {insights.insights.map((insight, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '10px',
                borderLeft: `4px solid ${insight.type === 'success' ? t.success : insight.type === 'warning' ? t.warning : insight.type === 'danger' ? t.danger : t.primary}`,
                backgroundColor: insight.type === 'success' ? t.bgSuccess : insight.type === 'warning' ? t.bgWarning : insight.type === 'danger' ? t.bgDanger : t.bgInfo,
                transition: 'all 0.3s',
              }}>
                {insight.type === 'success' && <CheckCircle size={18} color={t.success} />}
                {insight.type === 'warning' && <AlertTriangle size={18} color={t.warning} />}
                {insight.type === 'danger' && <AlertTriangle size={18} color={t.danger} />}
                {insight.type === 'info' && <Info size={18} color={t.primary} />}
                <span style={{ fontSize: '14px', color: t.text }}>{insight.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {monthlyData.length >= 2 && (
        <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', boxShadow: t.shadow, marginBottom: '24px', transition: 'all 0.3s' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: t.text, margin: '0 0 16px' }}>Evolução - Comparativo Mensal</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: t.chartText }} stroke={t.chartGrid} />
              <YAxis tick={{ fontSize: 12, fill: t.chartText }} stroke={t.chartGrid} />
              <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: `1px solid ${t.chartTooltipBorder}`, backgroundColor: t.chartTooltipBg, color: t.chartTooltipText }} />
              <Legend wrapperStyle={{ color: t.chartText }} />
              <Line type="monotone" dataKey="income" name="Receitas" stroke={t.success} strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="expenses" name="Despesas" stroke={t.danger} strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', boxShadow: t.shadow, transition: 'all 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: t.text, margin: 0 }}>Receitas vs Despesas</h3>
            <Link to="/relatorios" style={{ fontSize: '13px', color: t.primary, textDecoration: 'none', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>Ver todos <ChevronRight size={14} /></Link>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData.slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: t.chartText }} stroke={t.chartGrid} />
                <YAxis tick={{ fontSize: 12, fill: t.chartText }} stroke={t.chartGrid} />
                <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: `1px solid ${t.chartTooltipBorder}`, backgroundColor: t.chartTooltipBg, color: t.chartTooltipText }} />
                <Legend wrapperStyle={{ color: t.chartText }} />
                <Bar dataKey="income" name="Receitas" fill={t.success} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Despesas" fill={t.danger} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="Sem dados" message="Adicione lançamentos para ver gráficos" />}
        </div>

        <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', boxShadow: t.shadow, transition: 'all 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: t.text, margin: 0 }}>Despesas por Categoria</h3>
            <Link to="/categorias" style={{ fontSize: '13px', color: t.primary, textDecoration: 'none', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>Ver todas <ChevronRight size={14} /></Link>
          </div>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categoryData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: `1px solid ${t.chartTooltipBorder}`, backgroundColor: t.chartTooltipBg, color: t.chartTooltipText }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState title="Sem categorias" message="Registre despesas para ver a distribuição" />}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', overflow: 'hidden', boxShadow: t.shadow, transition: 'all 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${t.borderLight}` }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: t.text, margin: 0 }}>Últimas Movimentações</h3>
            <Link to="/lancamentos" style={{ fontSize: '13px', color: t.primary, textDecoration: 'none', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>Ver todas <ChevronRight size={14} /></Link>
          </div>
          {recent.length > 0 ? (
            <div style={{ padding: '8px 0' }}>
              {recent.map(tx => (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: tx.type === 'income' ? t.bgSuccess : t.bgDanger, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {tx.type === 'income' ? <TrendingUp size={16} color={t.success} /> : <TrendingDown size={16} color={t.danger} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: t.text }}>{tx.description}</div>
                      <div style={{ fontSize: '12px', color: t.textLight, marginTop: '2px' }}>{tx.category_icon} {tx.category_name || 'Sem categoria'} · {formatDate(tx.date)}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: tx.type === 'income' ? t.success : t.danger, whiteSpace: 'nowrap' }}>
                    {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <BarChart3 size={40} color={t.textLight} />
              <p style={{ fontSize: '14px', color: t.textMuted, margin: '12px 0 16px' }}>Nenhum lançamento</p>
              <button onClick={onNewTransaction} style={{ padding: '8px 16px', backgroundColor: t.primary, color: t.textOnPrimary, border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>+ Novo Lançamento</button>
            </div>
          )}
        </div>

        <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', overflow: 'hidden', boxShadow: t.shadow, transition: 'all 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${t.borderLight}` }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: t.text, margin: 0 }}>Próximas Contas</h3>
            <Link to="/lancamentos?type=expense" style={{ fontSize: '13px', color: t.primary, textDecoration: 'none', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>Ver todas <ChevronRight size={14} /></Link>
          </div>
          {upcoming.overdue.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: t.bgDanger, borderBottom: `1px solid ${t.dangerLight}` }}>
              <AlertTriangle size={16} color={t.danger} />
              <span style={{ color: t.textDanger, fontSize: '13px', fontWeight: '600' }}>{upcoming.overdue.length} conta(s) atrasada(s)</span>
            </div>
          )}
          {(upcoming.upcoming.length > 0 || upcoming.overdue.length > 0) ? (
            <div style={{ padding: '8px 0' }}>
              {[...upcoming.overdue, ...upcoming.upcoming].slice(0, 5).map(tx => (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: t.bgDanger, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Clock size={16} color={t.danger} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: t.text }}>{tx.description}</div>
                      <div style={{ fontSize: '12px', color: t.textLight, marginTop: '2px' }}>{formatDate(tx.date)} · {tx.account_name}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: t.danger }}>-{formatCurrency(tx.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <CheckCircle size={40} color={t.success} />
              <p style={{ fontSize: '14px', color: t.textMuted, margin: '12px 0 0' }}>Nenhuma conta pendente</p>
              <p style={{ fontSize: '13px', color: t.textLight, margin: '4px 0 0' }}>Todas as contas estão em dia!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
