import React, { useState } from 'react';
import { Calculator, TrendingUp, DollarSign, Target, Percent } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../api';

export default function CalculatorsPage() {
  const { theme: t } = useTheme();
  const [activeCalc, setActiveCalc] = useState('compound');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const fmt = (v) => `R$ ${(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

  const [compound, setCompound] = useState({ principal: '', monthly: '', rate: '', years: '' });
  const [loan, setLoan] = useState({ amount: '', rate: '', months: '' });
  const [savings, setSavings] = useState({ target: '', current: '', monthly: '', rate: '' });

  const calcCompound = async () => {
    setLoading(true); setResult(null);
    try {
      const r = await api.post('/calculators/compound', { ...compound, principal: parseFloat(compound.principal) || 0, monthly: parseFloat(compound.monthly) || 0, rate: parseFloat(compound.rate) || 0, years: parseInt(compound.years) || 1 });
      setResult(r.data);
    } catch (e) { alert('Erro'); }
    setLoading(false);
  };

  const calcLoan = async () => {
    setLoading(true); setResult(null);
    try {
      const r = await api.post('/calculators/loan', { amount: parseFloat(loan.amount), rate: parseFloat(loan.rate), months: parseInt(loan.months) });
      setResult(r.data);
    } catch (e) { alert('Erro'); }
    setLoading(false);
  };

  const calcSavings = async () => {
    setLoading(true); setResult(null);
    try {
      const r = await api.post('/calculators/savings-goal', { target: parseFloat(savings.target), current: parseFloat(savings.current) || 0, monthly: parseFloat(savings.monthly) || 0, rate: parseFloat(savings.rate) || 0 });
      setResult(r.data);
    } catch (e) { alert('Erro'); }
    setLoading(false);
  };

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${t.borderInput}`, backgroundColor: t.bgInput, color: t.text, fontSize: '14px' };
  const labelStyle = { fontSize: '12px', color: t.textSecondary, display: 'block', marginBottom: '4px', fontWeight: '500' };

  const calcs = [
    { key: 'compound', label: 'Juros Compostos', icon: <TrendingUp size={18} /> },
    { key: 'loan', label: 'Financiamento', icon: <DollarSign size={18} /> },
    { key: 'savings', label: 'Meta de Economia', icon: <Target size={18} /> },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: t.text, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <Calculator size={24} /> Calculadoras Financeiras
      </h1>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {calcs.map(c => (
          <button key={c.key} onClick={() => { setActiveCalc(c.key); setResult(null); }}
            style={{ padding: '10px 16px', borderRadius: '10px', border: `1px solid ${activeCalc === c.key ? t.primary : t.border}`, backgroundColor: activeCalc === c.key ? t.primary : t.bgCard, color: activeCalc === c.key ? 'white' : t.text, cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', padding: '24px', border: `1px solid ${t.border}` }}>
        {activeCalc === 'compound' && (
          <div>
            <h3 style={{ color: t.text, marginBottom: '16px' }}>Juros Compostos</h3>
            <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '16px' }}>Veja como seu dinheiro cresce com juros compostos</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={labelStyle}>Valor inicial</label><input type="number" value={compound.principal} onChange={e => setCompound({ ...compound, principal: e.target.value })} placeholder="10000" style={inputStyle} /></div>
              <div><label style={labelStyle}>Aporte mensal</label><input type="number" value={compound.monthly} onChange={e => setCompound({ ...compound, monthly: e.target.value })} placeholder="500" style={inputStyle} /></div>
              <div><label style={labelStyle}>Taxa ao ano (%)</label><input type="number" value={compound.rate} onChange={e => setCompound({ ...compound, rate: e.target.value })} placeholder="10" style={inputStyle} /></div>
              <div><label style={labelStyle}>Anos</label><input type="number" value={compound.years} onChange={e => setCompound({ ...compound, years: e.target.value })} placeholder="10" style={inputStyle} /></div>
            </div>
            <button onClick={calcCompound} disabled={loading} style={{ marginTop: '16px', padding: '10px 24px', background: t.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>{loading ? 'Calculando...' : 'Calcular'}</button>
          </div>
        )}

        {activeCalc === 'loan' && (
          <div>
            <h3 style={{ color: t.text, marginBottom: '16px' }}>Simulador de Financiamento</h3>
            <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '16px' }}>Calcule parcelas de financiamento</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div><label style={labelStyle}>Valor do financiamento</label><input type="number" value={loan.amount} onChange={e => setLoan({ ...loan, amount: e.target.value })} placeholder="50000" style={inputStyle} /></div>
              <div><label style={labelStyle}>Taxa ao mês (%)</label><input type="number" value={loan.rate} onChange={e => setLoan({ ...loan, rate: e.target.value })} placeholder="1.5" style={inputStyle} /></div>
              <div><label style={labelStyle}>Prazo (meses)</label><input type="number" value={loan.months} onChange={e => setLoan({ ...loan, months: e.target.value })} placeholder="60" style={inputStyle} /></div>
            </div>
            <button onClick={calcLoan} disabled={loading} style={{ marginTop: '16px', padding: '10px 24px', background: t.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>{loading ? 'Calculando...' : 'Calcular'}</button>
          </div>
        )}

        {activeCalc === 'savings' && (
          <div>
            <h3 style={{ color: t.text, marginBottom: '16px' }}>Meta de Economia</h3>
            <p style={{ fontSize: '13px', color: t.textMuted, marginBottom: '16px' }}>Descubra quanto tempo leva para atingir seu objetivo</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={labelStyle}>Valor da meta</label><input type="number" value={savings.target} onChange={e => setSavings({ ...savings, target: e.target.value })} placeholder="50000" style={inputStyle} /></div>
              <div><label style={labelStyle}>Valor atual</label><input type="number" value={savings.current} onChange={e => setSavings({ ...savings, current: e.target.value })} placeholder="10000" style={inputStyle} /></div>
              <div><label style={labelStyle}>Aporte mensal</label><input type="number" value={savings.monthly} onChange={e => setSavings({ ...savings, monthly: e.target.value })} placeholder="1000" style={inputStyle} /></div>
              <div><label style={labelStyle}>Taxa ao mês (%)</label><input type="number" value={savings.rate} onChange={e => setSavings({ ...savings, rate: e.target.value })} placeholder="0.8" style={inputStyle} /></div>
            </div>
            <button onClick={calcSavings} disabled={loading} style={{ marginTop: '16px', padding: '10px 24px', background: t.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>{loading ? 'Calculando...' : 'Calcular'}</button>
          </div>
        )}
      </div>

      {result && (
        <div style={{ marginTop: '24px', backgroundColor: t.bgCard, borderRadius: '16px', padding: '24px', border: `1px solid ${t.border}` }}>
          <h3 style={{ color: t.text, marginBottom: '16px' }}>Resultado</h3>

          {activeCalc === 'compound' && result.finalBalance && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: t.bgHover, borderRadius: '10px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: t.success }}>{fmt(result.finalBalance)}</div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>Saldo final</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: t.bgHover, borderRadius: '10px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: t.text }}>{fmt(result.totalContributed)}</div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>Total investido</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: t.bgHover, borderRadius: '10px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: t.primary }}>{fmt(result.totalInterest)}</div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>Juros ganhos</div>
                </div>
              </div>
              {result.timeline && result.timeline.length > 0 && (
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {result.timeline.map(r => (
                    <div key={r.year} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${t.border}`, fontSize: '13px' }}>
                      <span style={{ color: t.textSecondary }}>Ano {r.year}</span>
                      <span style={{ color: t.success, fontWeight: '600' }}>{fmt(r.balance)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeCalc === 'loan' && result.monthlyPayment && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: t.bgHover, borderRadius: '10px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: t.primary }}>{fmt(result.monthlyPayment)}</div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>Parcela mensal</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: t.bgHover, borderRadius: '10px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: t.text }}>{fmt(result.totalPayment)}</div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>Total pago</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: t.bgHover, borderRadius: '10px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: t.danger }}>{fmt(result.totalInterest)}</div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>Juros pagos</div>
                </div>
              </div>
              {result.schedule && (
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {result.schedule.filter((_, i) => i % 12 === 0 || i === result.schedule.length - 1).map(s => (
                    <div key={s.month} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${t.border}`, fontSize: '13px' }}>
                      <span style={{ color: t.textSecondary }}>Mês {s.month}</span>
                      <span style={{ color: t.text }}>Juros: {fmt(s.interest)}</span>
                      <span style={{ color: t.textMuted }}>Saldo: {fmt(s.balance)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeCalc === 'savings' && result.months !== undefined && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: t.bgHover, borderRadius: '10px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: t.primary }}>{result.years} anos</div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>{result.months} meses</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: t.bgHover, borderRadius: '10px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: t.success }}>{fmt(result.finalBalance)}</div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>Saldo final</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: t.bgHover, borderRadius: '10px' }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: t.text }}>{fmt(result.totalContributed)}</div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>Total investido</div>
                </div>
              </div>
              {result.monthlyNeeded && (
                <p style={{ color: t.textSecondary, fontSize: '14px' }}>
                  <Percent size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  Para atingir a meta, você precisa aportar <strong>{fmt(result.monthlyNeeded)}</strong> por mês.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
