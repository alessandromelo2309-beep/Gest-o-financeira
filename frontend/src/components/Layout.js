import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, ArrowUpDown, TrendingUp, TrendingDown, CreditCard, Layers, Tag,
  Target, BarChart3, Brain, Bell, Settings, LogOut, Plus, Menu, X, Search,
  Wallet, ChevronDown, Sun, Moon, Repeat, Upload, Download, Trophy, Calculator, Compass
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../api';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/lancamentos', icon: ArrowUpDown, label: 'Lançamentos' },
  { path: '/receitas', icon: TrendingUp, label: 'Receitas' },
  { path: '/despesas', icon: TrendingDown, label: 'Despesas' },
  { path: '/contas', icon: CreditCard, label: 'Contas' },
  { path: '/cartoes', icon: Layers, label: 'Cartões' },
  { path: '/categorias', icon: Tag, label: 'Categorias' },
  { path: '/orcamentos', icon: Target, label: 'Orçamentos' },
  { path: '/metas', icon: Target, label: 'Metas' },
  { path: '/recorrentes', icon: Repeat, label: 'Recorrentes' },
  { path: '/importar', icon: Upload, label: 'Importar' },
  { path: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  { path: '/analises', icon: Brain, label: 'Análises' },
  { path: '/planejamento', icon: Compass, label: 'Planejamento' },
  { path: '/calculadoras', icon: Calculator, label: 'Calculadoras' },
  { path: '/gamificacao', icon: Trophy, label: 'Gamificação' },
  { path: '/configuracoes', icon: Settings, label: 'Configurações' },
];

const MOBILE_NAV = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/lancamentos', icon: ArrowUpDown, label: 'Lançamentos' },
  { path: '__new__', icon: Plus, label: 'Novo', isFAB: true },
  { path: '/metas', icon: Target, label: 'Metas' },
  { path: '__menu__', icon: Menu, label: 'Menu' },
];

export default function Layout({ children, onNewTransaction }) {
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => { loadNotifications(); }, [location.pathname]);

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const loadNotifications = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count || 0);
      const notifRes = await api.get('/notifications');
      const items = (notifRes.data || []).slice(0, 5);
      setNotifications(items);
    } catch (err) { console.error(err); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/lancamentos?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false); setSearchQuery('');
    }
  };

  const getPageTitle = () => {
    const item = NAV_ITEMS.find(i => i.path === location.pathname);
    return item ? item.label : 'GESTÃO FINANCEIRA';
  };

  const handleMobileNav = (path) => {
    if (path === '__new__') {
      onNewTransaction && onNewTransaction();
    } else if (path === '__menu__') {
      setSidebarOpen(true);
    } else {
      navigate(path);
    }
  };

  const isActive = (path) => {
    if (path === '__new__' || path === '__menu__') return false;
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  };

  const t = theme;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: t.bg, transition: 'background-color 0.3s' }}>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }} />}

      <aside className={`app-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}
        style={{
          position: 'fixed', top: 0, left: 0, width: '250px', height: '100vh',
          background: t.bgSidebar, display: 'flex', flexDirection: 'column', zIndex: 1000,
          transition: 'transform 0.3s ease',
        }}>
        <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={20} color="white" />
            </div>
            <span style={{ color: 'white', fontSize: '16px', fontWeight: '700', letterSpacing: '-0.5px' }}>GESTÃO FINANCEIRA</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link key={item.path} to={item.path}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                  borderRadius: '8px', textDecoration: 'none',
                  color: active ? '#60A5FA' : '#94A3B8',
                  backgroundColor: active ? 'rgba(59,130,246,0.15)' : 'transparent',
                  fontSize: '14px', fontWeight: '500', transition: 'all 0.15s',
                }}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => { logout(); navigate('/login'); setSidebarOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
              background: 'none', border: 'none', width: '100%', cursor: 'pointer',
              color: '#F87171', fontSize: '14px', fontWeight: '500', borderRadius: '8px',
            }}>
            <LogOut size={18} />
            <span>Sair do sistema</span>
          </button>
        </div>
      </aside>

      <div className="app-main" style={{ flex: 1, marginLeft: '250px', display: 'flex', flexDirection: 'column' }}>
        <header className="app-header" style={{
          position: 'sticky', top: 0, backgroundColor: t.bgHeader, backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${t.border}`, padding: '0 24px', height: '64px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100,
          transition: 'background-color 0.3s, border-color 0.3s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={() => setSidebarOpen(true)} className="app-menu-btn"
              style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: t.textSecondary, padding: '8px', borderRadius: '8px', minHeight: '44px', minWidth: '44px', alignItems: 'center', justifyContent: 'center' }}>
              <Menu size={22} />
            </button>
            <h1 style={{ fontSize: '18px', fontWeight: '700', color: t.text, margin: 0, transition: 'color 0.3s' }}>
              {getPageTitle()}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setSearchOpen(!searchOpen)}
              style={{
                position: 'relative', background: 'none', border: `1px solid ${t.border}`, borderRadius: '8px',
                cursor: 'pointer', color: t.textMuted, padding: '8px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                minHeight: '40px', minWidth: '40px',
              }}>
              <Search size={18} />
            </button>

            <div ref={notifRef} style={{ position: 'relative' }}>
              <button onClick={() => setNotifOpen(!notifOpen)}
                style={{
                  position: 'relative', background: 'none', border: `1px solid ${t.border}`, borderRadius: '8px',
                  cursor: 'pointer', color: t.textMuted, padding: '8px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                  minHeight: '40px', minWidth: '40px',
                }}>
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-4px', right: '-4px', backgroundColor: t.bgBadge,
                    color: 'white', fontSize: '10px', fontWeight: '700', borderRadius: '10px',
                    minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', padding: '0 4px',
                  }}>{unreadCount}</span>
                )}
              </button>
              {notifOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  backgroundColor: t.bgDropdown, borderRadius: '12px',
                  boxShadow: t.shadowLg, border: `1px solid ${t.border}`,
                  minWidth: '280px', maxWidth: '90vw', overflow: 'hidden', zIndex: 1000,
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${t.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: t.textMuted, fontWeight: '600' }}>Notificações</span>
                    <button onClick={() => { navigate('/notificacoes'); setNotifOpen(false); }}
                      style={{ background: 'none', border: 'none', color: t.primary, cursor: 'pointer', fontSize: '12px' }}>Ver todas</button>
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '20px 16px', textAlign: 'center', color: t.textLight, fontSize: '13px' }}>Nenhuma notificação</div>
                  ) : notifications.map((n) => (
                    <div key={n.id} style={{
                      padding: '12px 16px', borderBottom: `1px solid ${t.borderLight}`,
                      backgroundColor: n.read ? 'transparent' : t.bgHover,
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: n.read ? '400' : '600', color: t.text }}>{n.title}</div>
                      <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '2px' }}>{n.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={onNewTransaction} className="app-new-btn"
              style={{
                padding: '8px 16px', backgroundColor: t.primary, color: t.textOnPrimary,
                border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'background-color 0.15s', minHeight: '40px',
              }}>
              <Plus size={18} />
              <span>Lançamento</span>
            </button>

            <button onClick={() => navigate('/calculadoras')}
              style={{
                background: 'none', border: `1px solid ${t.border}`, borderRadius: '8px',
                cursor: 'pointer', color: t.textMuted, padding: '8px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                minHeight: '40px', minWidth: '40px',
              }}
              title="Calculadoras">
              <Calculator size={18} />
            </button>

            <button onClick={toggleTheme}
              className="app-theme-btn"
              style={{
                background: 'none', border: `1px solid ${t.border}`, borderRadius: '8px',
                cursor: 'pointer', color: t.textMuted, padding: '8px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                minHeight: '40px', minWidth: '40px',
              }}
              title={t.name === 'light' ? 'Alternar para tema escuro' : 'Alternar para tema claro'}>
              {t.name === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="app-user-menu"
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', background: 'none',
                  border: `1px solid ${t.border}`, borderRadius: '8px', padding: '6px 10px',
                  cursor: 'pointer', color: t.textSecondary,
                }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: '700',
                }}>{user?.name?.[0]?.toUpperCase()}</div>
                <span className="app-user-name" style={{ fontSize: '14px', fontWeight: '500', color: t.text }}>{user?.name}</span>
                <ChevronDown size={14} />
              </button>
              {userMenuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  backgroundColor: t.bgDropdown, borderRadius: '12px',
                  boxShadow: t.shadowLg, border: `1px solid ${t.border}`,
                  minWidth: '200px', overflow: 'hidden', zIndex: 1000,
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${t.borderLight}`, fontSize: '12px', color: t.textMuted, fontWeight: '600' }}>
                    {user?.email}
                  </div>
                  <button onClick={() => { navigate('/configuracoes'); setUserMenuOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                      padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '14px', color: t.textSecondary, textAlign: 'left',
                    }}>
                    <Settings size={16} /> Configurações
                  </button>
                  <button onClick={() => { logout(); navigate('/login'); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                      padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '14px', color: t.textDanger, textAlign: 'left',
                    }}>
                    <LogOut size={16} /> Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {searchOpen && (
          <div style={{ backgroundColor: t.bgCard, borderBottom: `1px solid ${t.border}`, padding: '12px 24px', transition: 'background-color 0.3s' }}>
            <form onSubmit={handleSearch} style={{
              display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '600px',
              backgroundColor: t.bgInput, borderRadius: '10px', padding: '8px 14px',
              border: `1px solid ${t.border}`,
            }}>
              <Search size={18} color={t.textLight} />
              <input ref={searchRef} type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar lançamentos, categorias..." autoFocus
                style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '14px', color: t.text, minWidth: 0 }} />
              <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: '4px' }}>
                <X size={18} />
              </button>
            </form>
          </div>
        )}

        <main className="app-content" style={{ flex: 1, padding: '24px', transition: 'padding 0.3s' }}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-nav">
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              className={item.isFAB ? 'mobile-nav-fab' : 'mobile-nav-item'}
              onClick={() => handleMobileNav(item.path)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                background: item.isFAB ? t.primary : 'none',
                border: 'none',
                cursor: 'pointer',
                color: item.isFAB ? 'white' : active ? t.primary : t.textMuted,
                fontSize: '10px',
                fontWeight: active ? '600' : '500',
                padding: '6px 0',
                minWidth: 0,
                flex: item.isFAB ? '0 0 auto' : '1',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={item.isFAB ? 24 : 20} />
              {!item.isFAB && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
