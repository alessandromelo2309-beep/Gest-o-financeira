import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, Trash2, AlertTriangle, Target, CreditCard, DollarSign } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../api';

const typeIcons = {
  goal_deadline: <Target size={16} color="#F59E0B" />,
  card_due: <CreditCard size={16} color="#EF4444" />,
  budget_alert: <AlertTriangle size={16} color="#F97316" />,
  system: <DollarSign size={16} color="#3B82F6" />,
};

export default function NotificationsPage() {
  const { theme: t } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = async () => {
    try {
      const [n, u] = await Promise.all([api.get('/notifications'), api.get('/notifications/unread')]);
      setNotifications(n.data); setUnreadCount(u.data.count);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    try { await api.put(`/notifications/${id}/read`); load(); } catch (e) {}
  };

  const markAllRead = async () => {
    try { await api.put('/notifications/read-all'); load(); } catch (e) {}
  };

  const remove = async (id) => {
    try { await api.delete(`/notifications/${id}`); load(); } catch (e) {}
  };

  const checkNow = async () => {
    try { await api.post('/notifications/check'); load(); } catch (e) { alert('Erro ao verificar'); }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Agora';
    if (mins < 60) return `${mins}min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    return `${Math.floor(hours / 24)}d atrás`;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: t.text, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={24} /> Notificações
            {unreadCount > 0 && <span style={{ background: '#EF4444', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>{unreadCount}</span>}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={checkNow} style={{ padding: '8px 14px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Verificar agora</button>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ padding: '8px 14px', background: t.bgHover, color: t.text, border: `1px solid ${t.border}`, borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <Check size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Marcar todas como lidas
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: t.textMuted }}>
          <BellOff size={48} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p>Nenhuma notificação</p>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>Clique em "Verificar agora" para checar metas e faturas</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {notifications.map(n => (
            <div key={n.id} onClick={() => !n.read && markRead(n.id)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: n.read ? t.bgCard : t.bgHover, padding: '14px 16px', borderRadius: '12px', border: `1px solid ${n.read ? t.border : t.primary}30`, cursor: n.read ? 'default' : 'pointer', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: t.bgHover, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {typeIcons[n.type] || <Bell size={16} />}
                </div>
                <div>
                  <div style={{ fontWeight: n.read ? '400' : '600', color: t.text, fontSize: '14px' }}>{n.title}</div>
                  <div style={{ fontSize: '13px', color: t.textMuted, marginTop: '2px' }}>{n.message}</div>
                  <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '4px' }}>{timeAgo(n.created_at)}</div>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: '4px' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
