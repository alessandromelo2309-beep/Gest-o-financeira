import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import Layout from './components/Layout';
import ChatAssistant from './components/ChatAssistant';
import NewTransactionModal from './components/NewTransactionModal';
import DashboardPage from './pages/Dashboard';
import TransactionsPage from './pages/Transactions';
import AccountsPage from './pages/Accounts';
import CategoriesPage from './pages/Categories';
import ReportsPage from './pages/Reports';
import BudgetsPage from './pages/Budgets';
import CreditCardsPage from './pages/CreditCards';
import GoalsPage from './pages/Goals';
import SettingsPage from './pages/Settings';
import AnalyticsPage from './pages/Analytics';
import { CreditCard, Target } from 'lucide-react';

function LoginPage() {
  const { theme: t } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { if (isLogin) await login(email, password); else await register(name, email, password); navigate('/'); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)', padding: '20px' }}>
      <div style={{ backgroundColor: t.bgCard, borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '420px', boxShadow: t.shadowXl, transition: 'all 0.3s' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Wallet size={28} color="white" /></div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: t.text, margin: '0 0 4px' }}>GESTÃO FINANCEIRA</h1>
          <p style={{ fontSize: '14px', color: t.textMuted, margin: 0 }}>Gestão financeira pessoal</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isLogin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: t.textSecondary }}>Nome</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ padding: '11px 14px', border: `1px solid ${t.borderInput}`, borderRadius: '10px', fontSize: '14px', outline: 'none', backgroundColor: t.bgInput, color: t.text, transition: 'all 0.3s' }} required />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: t.textSecondary }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '11px 14px', border: `1px solid ${t.borderInput}`, borderRadius: '10px', fontSize: '14px', outline: 'none', backgroundColor: t.bgInput, color: t.text, transition: 'all 0.3s' }} required />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: t.textSecondary }}>Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '11px 14px', border: `1px solid ${t.borderInput}`, borderRadius: '10px', fontSize: '14px', outline: 'none', backgroundColor: t.bgInput, color: t.text, transition: 'all 0.3s' }} required minLength={6} />
          </div>
          {error && <p style={{ color: t.danger, fontSize: '13px', textAlign: 'center', margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ padding: '12px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '8px', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: t.textMuted }}>
          {isLogin ? 'Não tem conta?' : 'Já tem conta?'}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} style={{ background: 'none', border: 'none', color: t.primary, cursor: 'pointer', fontWeight: '600', marginLeft: '6px', fontSize: '14px' }}>
            {isLogin ? 'Cadastre-se' : 'Faça login'}
          </button>
        </p>
      </div>
    </div>
  );
}

function AppContent() {
  const [showNewTx, setShowNewTx] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { token } = useAuth();

  const handleCreated = () => setRefreshKey(k => k + 1);

  if (!token) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Layout onNewTransaction={() => setShowNewTx(true)}>
        <Routes>
          <Route path="/" element={<DashboardPage key={refreshKey} onNewTransaction={() => setShowNewTx(true)} />} />
          <Route path="/lancamentos" element={<TransactionsPage key={refreshKey} onNewTransaction={() => setShowNewTx(true)} />} />
          <Route path="/receitas" element={<TransactionsPage key={refreshKey} onNewTransaction={() => setShowNewTx(true)} />} />
          <Route path="/despesas" element={<TransactionsPage key={refreshKey} onNewTransaction={() => setShowNewTx(true)} />} />
          <Route path="/contas" element={<AccountsPage key={refreshKey} />} />
          <Route path="/cartoes" element={<CreditCardsPage key={refreshKey} />} />
          <Route path="/categorias" element={<CategoriesPage key={refreshKey} />} />
          <Route path="/orcamentos" element={<BudgetsPage key={refreshKey} />} />
          <Route path="/metas" element={<GoalsPage key={refreshKey} />} />
          <Route path="/relatorios" element={<ReportsPage key={refreshKey} />} />
          <Route path="/analises" element={<AnalyticsPage key={refreshKey} />} />
          <Route path="/configuracoes" element={<SettingsPage key={refreshKey} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
      <NewTransactionModal isOpen={showNewTx} onClose={() => setShowNewTx(false)} onCreated={handleCreated} />
      <ChatAssistant />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
          @media (max-width: 768px) { .main-layout { margin-left: 0 !important; } }
        `}</style>
      </ThemeProvider>
    </AuthProvider>
  );
}
