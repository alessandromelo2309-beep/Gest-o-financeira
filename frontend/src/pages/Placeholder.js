import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function PlaceholderPage({ icon, title, message }) {
  const { theme: t } = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', textAlign: 'center' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '20px', backgroundColor: t.bgInfo, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
        {React.cloneElement(icon, { size: 40, color: t.primary })}
      </div>
      <h2 style={{ fontSize: '22px', fontWeight: '700', color: t.text, margin: '0 0 8px' }}>{title}</h2>
      <p style={{ fontSize: '14px', color: t.textLight, maxWidth: '400px', lineHeight: '1.6' }}>{message}</p>
    </div>
  );
}
