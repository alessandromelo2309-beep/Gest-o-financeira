import React from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Modal({ isOpen, onClose, title, children, wide }) {
  const { theme: t } = useTheme();
  if (!isOpen) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: t.bgModalOverlay, display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 2000, padding: '20px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        backgroundColor: t.bgCard, borderRadius: '16px', width: '100%',
        maxWidth: wide ? '700px' : '500px', maxHeight: '90vh', overflow: 'auto',
        boxShadow: t.shadowLg, transition: 'background-color 0.3s',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${t.border}`,
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: t.text, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: '4px', borderRadius: '6px' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  );
}
