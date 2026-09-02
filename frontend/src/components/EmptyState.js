import React from 'react';
import { Plus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function EmptyState({ icon, title, message, actionLabel, onAction }) {
  const { theme: t } = useTheme();
  return (
    <div style={{
      textAlign: 'center', padding: '60px 20px', backgroundColor: t.bgCard,
      borderRadius: '12px', boxShadow: t.shadow, transition: 'background-color 0.3s',
    }}>
      {icon && <div style={{ marginBottom: '16px', color: t.textLight }}>{icon}</div>}
      <h3 style={{ fontSize: '16px', fontWeight: '600', color: t.textSecondary, margin: '0 0 8px' }}>{title}</h3>
      <p style={{ fontSize: '14px', color: t.textMuted, margin: '0 0 20px' }}>{message}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} style={{
          padding: '10px 20px', backgroundColor: t.primary, color: t.textOnPrimary,
          border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600',
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px',
        }}>
          <Plus size={18} /> {actionLabel}
        </button>
      )}
    </div>
  );
}
