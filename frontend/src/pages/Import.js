import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../api';

export default function ImportPage() {
  const { theme: t } = useTheme();
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/accounts').then(r => setAccounts(r.data)).catch(() => {});
    api.get('/categories').then(r => setCategories(r.data)).catch(() => {});
  }, []);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target.result);
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvText || !accountId) { alert('Selecione uma conta e o arquivo CSV'); return; }
    setLoading(true); setResult(null);
    try {
      const r = await api.post('/import/csv', { csv_data: csvText, account_id: parseInt(accountId), default_category_id: categoryId ? parseInt(categoryId) : null });
      setResult(r.data);
    } catch (e) { setResult({ error: e.response?.data?.error || 'Erro ao importar' }); }
    finally { setLoading(false); }
  };

  const exampleCsv = `Data,Descrição,Valor,Tipo
2026-09-01,Salário,5000.00,receita
2026-09-02,Supermercado,-250.50,despesa
2026-09-03,Combível,-180.00,despesa
2026-09-05,Freelance,800.00,receita`;

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: t.text, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <Upload size={24} /> Importar Extrato
      </h1>

      <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', padding: '24px', border: `1px solid ${t.border}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '12px', color: t.textSecondary, display: 'block', marginBottom: '4px' }}>Conta de destino</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${t.borderInput}`, backgroundColor: t.bgInput, color: t.text }}>
              <option value="">Selecione a conta</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: t.textSecondary, display: 'block', marginBottom: '4px' }}>Categoria padrão (opcional)</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${t.borderInput}`, backgroundColor: t.bgInput, color: t.text }}>
              <option value="">Sem categoria</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', color: t.textSecondary, display: 'block', marginBottom: '4px' }}>Arquivo CSV</label>
          <input type="file" accept=".csv,.txt" onChange={handleFile} style={{ marginBottom: '8px', color: t.text }} />
          <textarea value={csvText} onChange={e => setCsvText(e.target.value)} rows={10} placeholder="Cole o conteúdo do CSV aqui..." style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${t.borderInput}`, backgroundColor: t.bgInput, color: t.text, fontFamily: 'monospace', fontSize: '13px', resize: 'vertical' }} />
        </div>

        <div style={{ backgroundColor: t.bgHover, borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', color: t.textSecondary, marginBottom: '6px' }}>Formato esperado (com cabeçalho):</p>
          <pre style={{ fontSize: '11px', color: t.textMuted, fontFamily: 'monospace', margin: 0, whiteSpace: 'pre-wrap' }}>{exampleCsv}</pre>
        </div>

        <button onClick={handleImport} disabled={loading || !csvText || !accountId} style={{ padding: '12px 24px', background: (!loading && csvText && accountId) ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : t.bgHover, color: (!loading && csvText && accountId) ? 'white' : t.textMuted, border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {loading ? 'Importando...' : <><Upload size={16} /> Importar</>}
        </button>

        {result && (
          <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', backgroundColor: result.error ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${result.error ? '#EF4444' : '#10B981'}` }}>
            {result.error ? (
              <p style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertCircle size={16} /> {result.error}</p>
            ) : (
              <p style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={16} /> {result.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
