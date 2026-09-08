import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Modal({ isOpen, onClose, title, children, wide }) {
  const { theme: t } = useTheme();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div onClick={onClose} className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: t.bgModalOverlay, display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 2000, padding: '16px',
    }}>
      <div onClick={e => e.stopPropagation()} className="modal-container" style={{
        backgroundColor: t.bgCard, borderRadius: '16px', width: '100%',
        maxWidth: wide ? '700px' : '500px', maxHeight: '90vh', overflow: 'auto',
        boxShadow: t.shadowLg, transition: 'background-color 0.3s',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${t.border}`,
          position: 'sticky', top: 0, backgroundColor: t.bgCard, zIndex: 1,
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: t.text, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted,
            padding: '8px', borderRadius: '8px', minHeight: '44px', minWidth: '44px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: '20px' }}>{children}</div>
      </div>
    </div>
  );
}
