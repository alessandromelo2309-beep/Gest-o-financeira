import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info, ArrowUpRight, ArrowDownRight, Minus, Brain } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { apiCall } from '../api';
import { formatCurrency, getCurrentMonth, getMonthName, getMonthNames, getYears } from '../utils';
import { useTheme } from '../contexts/ThemeContext';

export default function AnalyticsPage() {
  const { theme: t } = useTheme();
  const [insights, setInsights] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [period, setPeriod] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [period]);
  const loadData = async () => {
    setLoading(true);
    try {
      const [i, m, s] = await Promise.all([
        apiCall('/reports/insights'),
        apiCall('/reports/monthly?months=6'),
        apiCall(`/reports/summary?month=${period.month}&year=${period.year}`),
      ]);
      setInsights(i); setMonthlyData(m.map(d => ({ ...d, result: d.income - d.expenses }))); setSummary(s);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', color: t.textMuted }}>Carregando...</div>;

  const selectS = { padding: '8px 12px', border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: t.bgCard, cursor: 'pointer', color: t.textSecondary };
  const avgIncome = monthlyData.length > 0 ? monthlyData.reduce((s, m) => s + m.income, 0) / monthlyData.length : 0;
  const avgExpenses = monthlyData.length > 0 ? monthlyData.reduce((s, m) => s + m.expenses, 0) / monthlyData.length : 0;
  const avgResult = avgIncome - avgExpenses;
  const savingsRate = avgIncome > 0 ? ((avgResult / avgIncome) * 100).toFixed(1) : 0;
  const trend = monthlyData.length >= 2 ? (monthlyData[0].income - monthlyData[0].expenses) - (monthlyData[1].income - monthlyData[1].expenses) : 0;

  const smartInsights = [
    {
      icon: <TrendingUp size={20} color={t.success} />,
      title: 'Taxa de Economia',
      value: `${savingsRate}%`,
      desc: savingsRate >= 20 ? 'Excelente! Você economiza mais de 20% da renda.' : savingsRate >= 10 ? 'Bom, mas tente chegar a 20%.' : 'Atenção: tente economizar pelo menos 10% da renda.',
      color: savingsRate >= 20 ? t.success : savingsRate >= 10 ? t.warning : t.danger,
      bg: savingsRate >= 20 ? t.bgSuccess : savingsRate >= 10 ? t.bgWarning : t.bgDanger,
    },
    {
      icon: trend >= 0 ? <ArrowUpRight size={20} color={t.success} /> : <ArrowDownRight size={20} color={t.danger} />,
      title: 'Tendência do Mês',
      value: formatCurrency(trend),
      desc: trend >= 0 ? 'Seu resultado melhorou em relação ao mês anterior.' : 'Seu resultado piorou em relação ao mês anterior.',
      color: trend >= 0 ? t.success : t.danger,
      bg: trend >= 0 ? t.bgSuccess : t.bgDanger,
    },
    {
      icon: <Minus size={20} color={t.primary} />,
      title: 'Gasto Médio Mensal',
      value: formatCurrency(avgExpenses),
      desc: `Média dos últimos ${monthlyData.length} meses.`,
      color: t.primary,
      bg: t.bgInfo,
    },
    {
      icon: <CheckCircle size={20} color={t.success} />,
      title: 'Renda Média',
      value: formatCurrency(avgIncome),
      desc: `Média de receitas dos últimos ${monthlyData.length} meses.`,
      color: t.success,
      bg: t.bgSuccess,
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Brain size={22} color="white" /></div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: t.text, margin: 0 }}>Análises Inteligentes</h1>
            <p style={{ fontSize: '13px', color: t.textMuted, margin: '2px 0 0' }}>Insights sobre seus hábitos financeiros</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select value={period.month} onChange={e => setPeriod({ ...period, month: e.target.value })} style={selectS}>{getMonthNames().map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
          <select value={period.year} onChange={e => setPeriod({ ...period, year: e.target.value })} style={selectS}>{getYears().map(y => <option key={y} value={y}>{y}</option>)}</select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {smartInsights.map((item, i) => (
          <div key={i} style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', boxShadow: t.shadow, borderLeft: `4px solid ${item.color}`, transition: 'all 0.3s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
              <div>
                <p style={{ fontSize: '12px', color: t.textMuted, margin: 0 }}>{item.title}</p>
                <p style={{ fontSize: '20px', fontWeight: '700', color: item.color, margin: '2px 0 0' }}>{item.value}</p>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: t.textSecondary, margin: 0, lineHeight: '1.5' }}>{item.desc}</p>
          </div>
        ))}
      </div>

      {insights && insights.insights && insights.insights.length > 0 && (
        <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', boxShadow: t.shadow, marginBottom: '24px', transition: 'all 0.3s' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: t.text, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Info size={18} /> Recomendações</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {insights.insights.map((insight, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', borderRadius: '10px',
                borderLeft: `4px solid ${insight.type === 'success' ? t.success : insight.type === 'warning' ? t.warning : insight.type === 'danger' ? t.danger : t.primary}`,
                backgroundColor: insight.type === 'success' ? t.bgSuccess : insight.type === 'warning' ? t.bgWarning : insight.type === 'danger' ? t.bgDanger : t.bgInfo,
              }}>
                <div style={{ marginTop: '2px' }}>
                  {insight.type === 'success' && <CheckCircle size={16} color={t.success} />}
                  {insight.type === 'warning' && <AlertTriangle size={16} color={t.warning} />}
                  {insight.type === 'danger' && <AlertTriangle size={16} color={t.danger} />}
                  {insight.type === 'info' && <Info size={16} color={t.primary} />}
                </div>
                <span style={{ fontSize: '14px', color: t.text, lineHeight: '1.5' }}>{insight.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {monthlyData.length > 0 && (
        <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', boxShadow: t.shadow, marginBottom: '24px', transition: 'all 0.3s' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: t.text, margin: '0 0 16px' }}>Evolução - Últimos 6 Meses</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData.slice().reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: t.chartText }} stroke={t.chartGrid} />
              <YAxis tick={{ fontSize: 11, fill: t.chartText }} stroke={t.chartGrid} />
              <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: `1px solid ${t.chartTooltipBorder}`, backgroundColor: t.chartTooltipBg, color: t.chartTooltipText }} />
              <Legend wrapperStyle={{ color: t.chartText }} />
              <Line type="monotone" dataKey="income" stroke={t.success} strokeWidth={2} dot={{ r: 4 }} name="Receitas" />
              <Line type="monotone" dataKey="expenses" stroke={t.danger} strokeWidth={2} dot={{ r: 4 }} name="Despesas" />
              <Line type="monotone" dataKey="result" stroke={t.primary} strokeWidth={2} dot={{ r: 4 }} name="Resultado" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {[
            { label: 'Saldo Total', value: formatCurrency(summary.totalBalance), color: summary.totalBalance >= 0 ? t.success : t.danger },
            { label: 'Receitas', value: formatCurrency(summary.income), color: t.success },
            { label: 'Despesas', value: formatCurrency(summary.expenses), color: t.danger },
            { label: 'Resultado', value: formatCurrency(summary.income - summary.expenses), color: (summary.income - summary.expenses) >= 0 ? t.success : t.danger },
          ].map((card, i) => (
            <div key={i} style={{ backgroundColor: t.bgCard, borderRadius: '12px', padding: '20px', boxShadow: t.shadow, textAlign: 'center', transition: 'all 0.3s' }}>
              <p style={{ fontSize: '12px', color: t.textMuted, margin: '0 0 8px' }}>{card.label}</p>
              <p style={{ fontSize: '22px', fontWeight: '700', color: card.color, margin: 0 }}>{card.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
