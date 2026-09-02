import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Wallet, Download, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { apiCall } from '../api';
import { formatCurrency, getCurrentMonth, getMonthName, getMonthNames, getYears, formatDate } from '../utils';
import { useTheme } from '../contexts/ThemeContext';
import EmptyState from '../components/EmptyState';

export default function ReportsPage() {
  const { theme: t } = useTheme();
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [recentTx, setRecentTx] = useState([]);
  const [period, setPeriod] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [period]);
  const loadData = async () => {
    setLoading(true);
    try {
      const [s, c, d, m, tx] = await Promise.all([
        apiCall(`/reports/summary?month=${period.month}&year=${period.year}`),
        apiCall(`/reports/by-category?month=${period.month}&year=${period.year}`),
        apiCall(`/reports/daily?month=${period.month}&year=${period.year}`),
        apiCall('/reports/monthly?months=12'),
        apiCall(`/transactions?month=${period.month}&year=${period.year}`),
      ]);
      setSummary(s); setCategoryData(c); setDailyData(d); setMonthlyData(m); setRecentTx(tx);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    const headers = 'Data,Descrição,Tipo,Categoria,Conta,Valor\n';
    const rows = recentTx.map(tx =>
      `${tx.date},"${tx.description}",${tx.type === 'income' ? 'Receita' : tx.type === 'expense' ? 'Despesa' : 'Transferência'},"${tx.category_name || ''}","${tx.account_name}",${tx.amount}`
    ).join('\n');
    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `lancamentos_${period.month}_${period.year}.csv`; link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', color: t.textMuted }}>Carregando...</div>;
  if (!summary) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', color: t.textMuted }}>Erro ao carregar</div>;

  const selectS = { padding: '8px 12px', border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: t.bgCard, cursor: 'pointer', color: t.textSecondary };
  const result = summary.income - summary.expenses;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: t.text, margin: 0 }}>Relatórios</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={period.month} onChange={e => setPeriod({ ...period, month: e.target.value })} style={selectS}>{getMonthNames().map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
          <select value={period.year} onChange={e => setPeriod({ ...period, year: e.target.value })} style={selectS}>{getYears().map(y => <option key={y} value={y}>{y}</option>)}</select>
          <button onClick={exportCSV} style={{ padding: '8px 14px', backgroundColor: t.success, color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Download size={16} /> CSV</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Receitas', value: formatCurrency(summary.income), color: t.success, bg: t.bgSuccess, icon: <TrendingUp size={20} color={t.success} /> },
          { label: 'Despesas', value: formatCurrency(summary.expenses), color: t.danger, bg: t.bgDanger, icon: <TrendingDown size={20} color={t.danger} /> },
          { label: 'Resultado', value: formatCurrency(result), color: result >= 0 ? t.success : t.danger, bg: result >= 0 ? t.bgSuccess : t.bgDanger, icon: result >= 0 ? <ArrowUpRight size={20} color={t.success} /> : <ArrowDownRight size={20} color={t.danger} /> },
          { label: 'Saldo', value: formatCurrency(summary.totalBalance), color: t.text, bg: t.bgInfo, icon: <Wallet size={20} color={t.primary} /> },
        ].map((card, i) => (
          <div key={i} style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '16px', boxShadow: t.shadow, display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.3s' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{card.icon}</div>
            <div><p style={{ fontSize: '12px', color: t.textMuted, margin: 0 }}>{card.label}</p><p style={{ fontSize: '18px', fontWeight: '700', color: card.color, margin: '2px 0 0' }}>{card.value}</p></div>
          </div>
        ))}
      </div>

      {categoryData.length > 0 && (
        <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', boxShadow: t.shadow, marginBottom: '24px', transition: 'all 0.3s' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: t.text, margin: '0 0 16px' }}>Ranking de Categorias</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {categoryData.sort((a, b) => b.total - a.total).slice(0, 8).map((cat, i) => {
              const pct = categoryData[0]?.total > 0 ? (cat.total / categoryData[0].total) * 100 : 0;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{cat.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: t.text }}>{cat.name}</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: t.text }}>{formatCurrency(cat.total)}</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: t.bgHover, borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: cat.color, borderRadius: '3px' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', boxShadow: t.shadow, transition: 'all 0.3s' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: t.text, margin: '0 0 16px' }}>Receitas vs Despesas (12 meses)</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData.slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: t.chartText }} stroke={t.chartGrid} />
                <YAxis tick={{ fontSize: 11, fill: t.chartText }} stroke={t.chartGrid} />
                <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: `1px solid ${t.chartTooltipBorder}`, backgroundColor: t.chartTooltipBg, color: t.chartTooltipText }} />
                <Legend wrapperStyle={{ color: t.chartText }} />
                <Bar dataKey="income" name="Receitas" fill={t.success} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Despesas" fill={t.danger} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="Sem dados" message="Adicione lançamentos" />}
        </div>
        <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', boxShadow: t.shadow, transition: 'all 0.3s' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: t.text, margin: '0 0 16px' }}>Evolução Mensal</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData.slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: t.chartText }} stroke={t.chartGrid} />
                <YAxis tick={{ fontSize: 11, fill: t.chartText }} stroke={t.chartGrid} />
                <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: `1px solid ${t.chartTooltipBorder}`, backgroundColor: t.chartTooltipBg, color: t.chartTooltipText }} />
                <Line type="monotone" dataKey="income" stroke={t.success} strokeWidth={2} dot={{ r: 4 }} name="Receitas" />
                <Line type="monotone" dataKey="expenses" stroke={t.danger} strokeWidth={2} dot={{ r: 4 }} name="Despesas" />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState title="Sem dados" message="Adicione lançamentos" />}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', boxShadow: t.shadow, transition: 'all 0.3s' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: t.text, margin: '0 0 16px' }}>Por Categoria</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categoryData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: `1px solid ${t.chartTooltipBorder}`, backgroundColor: t.chartTooltipBg, color: t.chartTooltipText }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState title="Sem categorias" message="Registre despesas para ver" />}
        </div>
        <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', boxShadow: t.shadow, transition: 'all 0.3s' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: t.text, margin: '0 0 16px' }}>Fluxo Diário</h3>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: t.chartText }} stroke={t.chartGrid} />
                <YAxis tick={{ fontSize: 11, fill: t.chartText }} stroke={t.chartGrid} />
                <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: `1px solid ${t.chartTooltipBorder}`, backgroundColor: t.chartTooltipBg, color: t.chartTooltipText }} />
                <Legend wrapperStyle={{ color: t.chartText }} />
                <Bar dataKey="income" name="Receitas" fill={t.success} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Despesas" fill={t.danger} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="Sem dados" message="Registre lançamentos" />}
        </div>
      </div>
    </div>
  );
}
