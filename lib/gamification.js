const { sql, ensureInit } = require('./db');
const { authMiddleware } = require('./auth-middleware');

const ACHIEVEMENTS = {
  first_transaction: { name: 'Primeira Transação', icon: '🎉', description: 'Registrou sua primeira transação' },
  save_100: { name: 'Poupador Iniciante', icon: '💰', description: 'Economizou R$ 100' },
  save_1000: { name: 'Poupador Dedicado', icon: '💎', description: 'Economizou R$ 1.000' },
  save_5000: { name: 'Poupador Expert', icon: '🏆', description: 'Economizou R$ 5.000' },
  save_10000: { name: 'Poupador Mestre', icon: '👑', description: 'Economizou R$ 10.000' },
  streak_7: { name: 'Sequência de 7 Dias', icon: '🔥', description: 'Registrou transações por 7 dias seguidos' },
  streak_30: { name: 'Sequência de 30 Dias', icon: '⭐', description: 'Registrou transações por 30 dias seguidos' },
  no_expense_day: { name: 'Dia Sem Gastos', icon: '🎯', description: 'Passou um dia sem registrar despesas' },
  budget_under: { name: 'Dentro do Orçamento', icon: '✅', description: 'Manteve gastos abaixo do orçamento' },
  first_goal: { name: 'Primeira Meta', icon: '🏁', description: 'Criou sua primeira meta financeira' },
  goal_completed: { name: 'Meta Alcançada', icon: '🏅', description: 'Completou uma meta financeira' },
  import_data: { name: 'Importador de Dados', icon: '📥', description: 'Importou dados financeiros' },
  use_nexa: { name: 'Amigo da NEXA', icon: '🤖', description: 'Usou a assistente NEXA' },
  negative_balance: { name: 'Alerta Vermelho', icon: '⚠️ teve saldo negativo' },
  positive_month: { name: 'Mês Positivo', icon: '📈', description: 'Teve resultado positivo no mês' },
};

async function handler(req, res) {
  await ensureInit();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  return authMiddleware(async (req, res) => {
    try {
      const url = new URL(req.url, `https://${req.headers.host}`);
      const path = url.pathname.replace('/api/gamification', '');

      if (path === '/achievements') {
        const userAchievements = await sql`SELECT achievement_key, unlocked_at FROM achievements WHERE user_id = ${req.userId}`;
        const all = Object.entries(ACHIEVEMENTS).map(([key, info]) => ({
          key,
          ...info,
          unlocked: userAchievements.some(a => a.achievement_key === key),
          unlocked_at: userAchievements.find(a => a.achievement_key === key)?.unlocked_at || null,
        }));
        return res.json(all);
      }

      if (path === '/streaks') {
        let streak = await sql`SELECT * FROM streaks WHERE user_id = ${req.userId}`;
        if (streak.length === 0) {
          streak = await sql`INSERT INTO streaks (user_id) VALUES (${req.userId}) RETURNING *`;
        }
        return res.json(streak[0]);
      }

      if (path === '/stats') {
        const totalTx = await sql`SELECT COUNT(*) as c FROM transactions WHERE user_id = ${req.userId}`;
        const totalIncome = await sql`SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ${req.userId} AND type = 'income'`;
        const totalExpenses = await sql`SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ${req.userId} AND type = 'expense'`;
        const streak = await sql`SELECT * FROM streaks WHERE user_id = ${req.userId}`;
        const achievementCount = await sql`SELECT COUNT(*) as c FROM achievements WHERE user_id = ${req.userId}`;

        return res.json({
          totalTransactions: totalTx[0].c,
          totalIncome: totalIncome[0].t,
          totalExpenses: totalExpenses[0].t,
          currentStreak: streak[0]?.current_streak || 0,
          bestStreak: streak[0]?.best_streak || 0,
          achievements: achievementCount[0].c,
          level: Math.floor((achievementCount[0].c + totalTx[0].c / 10) / 3) + 1,
        });
      }

      return res.status(404).json({ error: 'Rota não encontrada' });
    } catch (error) {
      console.error('Erro na gamificação:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  })(req, res);
}

module.exports = handler;
