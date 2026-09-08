import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Star, Target, TrendingUp, Award, Zap } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../api';

export default function GamificationPage() {
  const { theme: t } = useTheme();
  const [stats, setStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/gamification/stats'), api.get('/gamification/achievements'), api.post('/gamification/check-achievements', {})])
      .then(([s, a]) => { setStats(s.data); setAchievements(a.data); })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>Carregando...</div>;
  if (!stats) return <div style={{ padding: '40px', textAlign: 'center', color: t.textMuted }}>Erro ao carregar</div>;

  const level = Math.floor(stats.achievementCount / 3) + 1;
  const nextLevelProgress = (stats.achievementCount % 3) / 3 * 100;

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: t.text, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <Trophy size={24} /> Gamificação
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', padding: '20px', textAlign: 'center', border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🏅</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: t.primary }}>Nível {level}</div>
          <div style={{ width: '100%', height: '8px', backgroundColor: t.bgHover, borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${nextLevelProgress}%`, height: '100%', backgroundColor: t.primary, borderRadius: '4px', transition: 'width 0.5s' }} />
          </div>
          <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>{stats.achievementCount} conquistas</div>
        </div>

        <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', padding: '20px', textAlign: 'center', border: `1px solid ${t.border}` }}>
          <Flame size={32} color="#F97316" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#F97316' }}>{stats.streak} dias</div>
          <div style={{ fontSize: '13px', color: t.textMuted }}>Sequência atual</div>
          <div style={{ fontSize: '12px', color: t.textLight, marginTop: '4px' }}>Recorde: {stats.bestStreak} dias</div>
        </div>

        <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', padding: '20px', textAlign: 'center', border: `1px solid ${t.border}` }}>
          <TrendingUp size={32} color={t.success} style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '24px', fontWeight: '700', color: stats.netSavings >= 0 ? t.success : t.danger }}>
            R$ {stats.netSavings.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
          </div>
          <div style={{ fontSize: '13px', color: t.textMuted }}>Economia total</div>
        </div>

        <div style={{ backgroundColor: t.bgCard, borderRadius: '16px', padding: '20px', textAlign: 'center', border: `1px solid ${t.border}` }}>
          <Target size={32} color="#8B5CF6" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '24px', fontWeight: '700', color: t.text }}>{stats.totalTransactions}</div>
          <div style={{ fontSize: '13px', color: t.textMuted }}>Transações registradas</div>
        </div>
      </div>

      {stats.monthResult !== 0 && (
        <div style={{ backgroundColor: stats.monthResult >= 0 ? t.bgSuccess : t.bgDanger, borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', border: `1px solid ${stats.monthResult >= 0 ? t.success : t.danger}` }}>
          {stats.monthResult >= 0 ? <Star size={20} color={t.success} /> : <Zap size={20} color={t.danger} />}
          <span style={{ color: stats.monthResult >= 0 ? t.success : t.danger, fontWeight: '600' }}>
            {stats.monthResult >= 0 ? `🎉 Resultado positivo este mês: R$ ${stats.monthResult.toFixed(2).replace('.', ',')}` : `⚠️ Resultado negativo este mês: R$ ${Math.abs(stats.monthResult).toFixed(2).replace('.', ',')}`}
          </span>
        </div>
      )}

      <h2 style={{ fontSize: '18px', fontWeight: '600', color: t.text, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Award size={20} /> Conquistas
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
        {achievements.map(a => (
          <div key={a.key} style={{
            backgroundColor: a.unlocked ? t.bgCard : t.bgHover, borderRadius: '12px', padding: '16px',
            border: `1px solid ${a.unlocked ? t.primary : t.border}`, opacity: a.unlocked ? 1 : 0.5,
            transition: 'all 0.3s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '28px' }}>{a.icon}</span>
              <div>
                <div style={{ fontWeight: '600', color: a.unlocked ? t.text : t.textMuted, fontSize: '14px' }}>{a.name}</div>
                <div style={{ fontSize: '12px', color: t.textLight, marginTop: '2px' }}>{a.description}</div>
                {a.unlocked && <div style={{ fontSize: '11px', color: t.success, marginTop: '4px' }}>Desbloqueada!</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
