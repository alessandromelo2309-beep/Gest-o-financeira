import React, { createContext, useContext, useState, useEffect } from 'react';

const themes = {
  light: {
    name: 'light',
    bg: '#F8FAFC',
    bgCard: '#FFFFFF',
    bgSidebar: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
    bgHeader: 'rgba(255,255,255,0.95)',
    bgInput: '#F8FAFC',
    bgHover: '#F1F5F9',
    bgActive: '#EFF6FF',
    bgDropdown: '#FFFFFF',
    bgModalOverlay: 'rgba(0,0,0,0.5)',
    bgBadge: '#EF4444',
    bgSuccess: '#ECFDF5',
    bgWarning: '#FFFBEB',
    bgDanger: '#FEF2F2',
    bgInfo: '#EFF6FF',
    bgChart: '#FFFFFF',
    bgTable: '#FFFFFF',
    bgTableHead: '#F8FAFC',
    bgInputFocus: '#FFFFFF',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    borderInput: '#D1D5DB',
    borderFocus: '#3B82F6',
    text: '#1E293B',
    textSecondary: '#475569',
    textMuted: '#64748B',
    textLight: '#94A3B8',
    textOnDark: '#FFFFFF',
    textOnPrimary: '#FFFFFF',
    textSuccess: '#059669',
    textDanger: '#DC2626',
    textWarning: '#D97706',
    textInfo: '#2563EB',
    primary: '#3B82F6',
    primaryHover: '#2563EB',
    primaryLight: '#DBEAFE',
    success: '#10B981',
    successLight: '#D1FAE5',
    danger: '#EF4444',
    dangerLight: '#FEE2E2',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
    purple: '#8B5CF6',
    purpleLight: '#EDE9FE',
    chartGrid: '#F1F5F9',
    chartText: '#64748B',
    chartTooltipBg: '#FFFFFF',
    chartTooltipBorder: '#E2E8F0',
    chartTooltipText: '#1E293B',
    scrollbar: '#CBD5E1',
    scrollbarHover: '#94A3B8',
    shadow: '0 1px 3px rgba(0,0,0,0.06)',
    shadowMd: '0 4px 12px rgba(0,0,0,0.08)',
    shadowLg: '0 10px 40px rgba(0,0,0,0.12)',
    shadowXl: '0 25px 80px rgba(0,0,0,0.15)',
    loginGradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
    loginCard: '#FFFFFF',
    loginTitle: '#1E293B',
    loginSubtitle: '#94A3B8',
    loginLabel: '#475569',
    loginInput: '#F8FAFC',
    loginInputBorder: '#E2E8F0',
    loginToggle: '#94A3B8',
  },
  dark: {
    name: 'dark',
    bg: '#0B0F19',
    bgCard: '#111827',
    bgSidebar: 'linear-gradient(180deg, #111827 0%, #0B0F19 100%)',
    bgHeader: 'rgba(11,15,25,0.95)',
    bgInput: '#1F2937',
    bgHover: '#1F2937',
    bgActive: 'rgba(59,130,246,0.15)',
    bgDropdown: '#1F2937',
    bgModalOverlay: 'rgba(0,0,0,0.7)',
    bgBadge: '#EF4444',
    bgSuccess: 'rgba(16,185,129,0.1)',
    bgWarning: 'rgba(245,158,11,0.1)',
    bgDanger: 'rgba(239,68,68,0.1)',
    bgInfo: 'rgba(59,130,246,0.1)',
    bgChart: '#111827',
    bgTable: '#111827',
    bgTableHead: '#1F2937',
    bgInputFocus: '#1F2937',
    border: '#1F2937',
    borderLight: '#1F2937',
    borderInput: '#374151',
    borderFocus: '#3B82F6',
    text: '#F1F5F9',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    textLight: '#64748B',
    textOnDark: '#F1F5F9',
    textOnPrimary: '#FFFFFF',
    textSuccess: '#34D399',
    textDanger: '#F87171',
    textWarning: '#FBBF24',
    textInfo: '#60A5FA',
    primary: '#3B82F6',
    primaryHover: '#60A5FA',
    primaryLight: 'rgba(59,130,246,0.15)',
    success: '#10B981',
    successLight: 'rgba(16,185,129,0.15)',
    danger: '#EF4444',
    dangerLight: 'rgba(239,68,68,0.15)',
    warning: '#F59E0B',
    warningLight: 'rgba(245,158,11,0.15)',
    info: '#3B82F6',
    infoLight: 'rgba(59,130,246,0.15)',
    purple: '#8B5CF6',
    purpleLight: 'rgba(139,92,246,0.15)',
    chartGrid: '#1F2937',
    chartText: '#94A3B8',
    chartTooltipBg: '#1F2937',
    chartTooltipBorder: '#374151',
    chartTooltipText: '#F1F5F9',
    scrollbar: '#374151',
    scrollbarHover: '#4B5563',
    shadow: '0 1px 3px rgba(0,0,0,0.3)',
    shadowMd: '0 4px 12px rgba(0,0,0,0.4)',
    shadowLg: '0 10px 40px rgba(0,0,0,0.5)',
    shadowXl: '0 25px 80px rgba(0,0,0,0.6)',
    loginGradient: 'linear-gradient(135deg, #0B0F19 0%, #111827 50%, #1F2937 100%)',
    loginCard: '#111827',
    loginTitle: '#F1F5F9',
    loginSubtitle: '#94A3B8',
    loginLabel: '#CBD5E1',
    loginInput: '#1F2937',
    loginInputBorder: '#374151',
    loginToggle: '#94A3B8',
  },
};

const ThemeContext = createContext(null);

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'auto') {
      const hour = new Date().getHours();
      return (hour >= 18 || hour < 6) ? 'dark' : 'light';
    }
    return saved || 'light';
  });
  const [autoMode, setAutoMode] = useState(() => localStorage.getItem('themeAuto') === 'true');

  const theme = themes[themeName] || themes.light;

  useEffect(() => {
    if (autoMode) {
      const checkTime = () => {
        const hour = new Date().getHours();
        setThemeName((hour >= 18 || hour < 6) ? 'dark' : 'light');
      };
      checkTime();
      const interval = setInterval(checkTime, 60000);
      return () => clearInterval(interval);
    }
  }, [autoMode]);

  useEffect(() => {
    localStorage.setItem('theme', autoMode ? 'auto' : themeName);
    document.documentElement.setAttribute('data-theme', themeName);
    const t = themes[themeName] || themes.light;
    document.body.style.backgroundColor = t.bg;
    document.body.style.color = t.text;
    document.body.style.transition = 'background-color 0.3s, color 0.3s';
  }, [themeName, autoMode]);

  const toggleTheme = React.useCallback(() => {
    setAutoMode(false);
    setThemeName(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const toggleAutoMode = React.useCallback(() => {
    setAutoMode(prev => {
      const newVal = !prev;
      localStorage.setItem('themeAuto', newVal);
      if (newVal) {
        const hour = new Date().getHours();
        setThemeName((hour >= 18 || hour < 6) ? 'dark' : 'light');
      }
      return newVal;
    });
  }, []);

  const setTheme = React.useCallback((name) => {
    setAutoMode(false);
    localStorage.setItem('themeAuto', 'false');
    if (themes[name]) setThemeName(name);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themeName, toggleTheme, setTheme, autoMode, toggleAutoMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeContext;
