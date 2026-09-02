import React, { useState, useEffect } from 'react';
import { User, Lock, Save, CheckCircle } from 'lucide-react';
import { apiCall } from '../api';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsPage() {
  const { theme: t } = useTheme();
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  useEffect(() => {
    if (authUser) setProfile({ name: authUser.name || '', email: authUser.email || '' });
  }, [authUser]);

  const handleProfile = async (e) => {
    e.preventDefault(); setLoading(true); setMsg('');
    try {
      await apiCall('/auth/profile', { method: 'PUT', body: JSON.stringify(profile) });
      setMsg('Perfil atualizado com sucesso!');
    } catch (err) { setMsg(err.message); }
    finally { setLoading(false); }
  };

  const handlePassword = async (e) => {
    e.preventDefault(); setPwMsg('');
    if (passwords.newPassword !== passwords.confirmPassword) { setPwMsg('As senhas não conferem'); return; }
    setLoading(true);
    try {
      await apiCall('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }) });
      setPwMsg('Senha alterada com sucesso!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { setPwMsg(err.message); }
    finally { setLoading(false); }
  };

  const inputS = { width: '100%', padding: '10px 14px', border: `1px solid ${t.borderInput}`, borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: t.bgInput, color: t.text };
  const labelS = { fontSize: '13px', fontWeight: '600', color: t.textSecondary, display: 'block', marginBottom: '6px' };
  const cardS = { backgroundColor: t.bgCard, borderRadius: '12px', padding: '24px', boxShadow: t.shadow, marginBottom: '20px', transition: 'all 0.3s' };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: t.text, margin: '0 0 24px' }}>Configurações</h1>

      <div style={cardS}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: t.bgInfo, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} color={t.primary} /></div>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: t.text, margin: 0 }}>Perfil</h2>
        </div>
        <form onSubmit={handleProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div><label style={labelS}>Nome</label><input type="text" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} style={inputS} required /></div>
          <div><label style={labelS}>Email</label><input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} style={inputS} required /></div>
          {msg && <p style={{ fontSize: '13px', color: msg.includes('sucesso') ? t.success : t.danger, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>{msg.includes('sucesso') && <CheckCircle size={14} />} {msg}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading} style={{ padding: '10px 20px', backgroundColor: t.primary, color: t.textOnPrimary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: loading ? 0.7 : 1 }}><Save size={16} /> Salvar</button>
          </div>
        </form>
      </div>

      <div style={cardS}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: t.bgWarning, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={20} color={t.warning} /></div>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: t.text, margin: 0 }}>Alterar Senha</h2>
        </div>
        <form onSubmit={handlePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div><label style={labelS}>Senha atual</label><input type="password" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} style={inputS} required /></div>
          <div><label style={labelS}>Nova senha</label><input type="password" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} style={inputS} required minLength={6} /></div>
          <div><label style={labelS}>Confirmar nova senha</label><input type="password" value={passwords.confirmPassword} onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })} style={inputS} required minLength={6} /></div>
          {pwMsg && <p style={{ fontSize: '13px', color: pwMsg.includes('sucesso') ? t.success : t.danger, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>{pwMsg.includes('sucesso') && <CheckCircle size={14} />} {pwMsg}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading} style={{ padding: '10px 20px', backgroundColor: t.warning, color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: loading ? 0.7 : 1 }}><Lock size={16} /> Alterar Senha</button>
          </div>
        </form>
      </div>
    </div>
  );
}
