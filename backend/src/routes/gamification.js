const express = require('express');
const { getAll, getOne, runInsert, runQuery } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const ACHIEVEMENTS = {
  first_transaction: { name: 'Primeiro Lançamento', icon: '🎉', description: 'Registrou sua primeira transação' },
  save_100: { name: 'Poupador Iniciante', icon: '💰', description: 'Economizou R$ 100' },
  save_1000: { name: 'Poupador PRO', icon: '💎', description: 'Economizou R$ 1.000' },
  save_5000: { name: 'Mestre da Economia', icon: '👑', description: 'Economizou R$ 5.000' },
  save_10000: { name: 'Lenda Financeira', icon: '🏆', description: 'Economizou R$ 10.000' },
  streak_7: { name: 'Sequência de 7 dias', icon: '🔥', description: 'Registrou gastos por 7 dias seguidos' },
  streak_30: { name: 'Sequência de 30 dias', icon: '⚡', description: 'Registrou gastos por 30 dias seguidos' },
  no_expense_day: { name: 'Dia sem Gastos', icon: '🌟', description: 'Passou um dia sem registrar despesas' },
  budget_under: { name: 'Dentro do Orçamento', icon: '✅', description: 'Manteve todos os orçamentos no limite' },
  first_goal: { name: 'Primeira Meta', icon: '🎯', description: 'Criou sua primeira meta financeira' },
  goal_completed: { name: 'Meta Alcançada', icon: '🏅', description: 'Completou uma meta financeira' },
  import_data: { name: 'Organizado', icon: '📂', description: 'Importou dados de extrato' },
  use_nexa: { name: 'Amigo da NEXA', icon: '🤖', description: 'Conversou 10 vezes com a NEXA' },
  negative_balance: { name: 'Alerta Vermelho', icon: '🚨', description: 'Teve saldo negativo (aprendizado!)' },
  positive_month: { name: 'Mês Positivo', icon: '📈', description: 'Teve resultado positivo no mês' },
};

router.get('/achievements', (req, res) => {
  const unlocked = getAll('SELECT achievement_key, unlocked_at FROM achievements WHERE user_id = ?', [req.userId]);
  const all = Object.entries(ACHIEVEMENTS).map(([key, info]) => {
    const u = unlocked.find(x => x.achievement_key === key);
    return { key, ...info, unlocked: !!u, unlocked_at: u?.unlocked_at };
  });
  res.json(all);
});

router.get('/stats', (req, res) => {
  let streak = getOne('SELECT * FROM streaks WHERE user_id = ?', [req.userId]);
  if (!streak) {
    runInsert('INSERT INTO streaks (user_id) VALUES (?)', [req.userId]);
    streak = getOne('SELECT * FROM streaks WHERE user_id = ?', [req.userId]);
  }

  const totalTransactions = getOne('SELECT COUNT(*) as c FROM transactions WHERE user_id = ?', [req.userId])?.c || 0;
  const totalSaved = getOne("SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ? AND type = 'income'", [req.userId])?.t || 0;
  const totalSpent = getOne("SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ? AND type = 'expense'", [req.userId])?.t || 0;
  const achievementCount = getOne('SELECT COUNT(*) as c FROM achievements WHERE user_id = ?', [req.userId])?.c || 0;

  const now = new Date();
  const cm = (now.getMonth() + 1).toString().padStart(2, '0');
  const cy = now.getFullYear().toString();
  const monthIncome = getOne("SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ? AND type = 'income' AND strftime('%m', date) = ? AND strftime('%Y', date) = ?", [req.userId, cm, cy])?.t || 0;
  const monthExpenses = getOne("SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ? AND type = 'expense' AND strftime('%m', date) = ? AND strftime('%Y', date) = ?", [req.userId, cm, cy])?.t || 0;

  res.json({
    streak: streak.current_streak,
    bestStreak: streak.best_streak,
    totalTransactions,
    totalSaved,
    totalSpent,
    netSavings: totalSaved - totalSpent,
    achievementCount,
    totalAchievements: Object.keys(ACHIEVEMENTS).length,
    monthIncome,
    monthExpenses,
    monthResult: monthIncome - monthExpenses,
  });
});

router.post('/check-achievements', (req, res) => {
  const newlyUnlocked = [];

  function unlock(key) {
    const existing = getOne('SELECT id FROM achievements WHERE user_id = ? AND achievement_key = ?', [req.userId, key]);
    if (!existing) {
      runInsert('INSERT INTO achievements (user_id, achievement_key) VALUES (?, ?)', [req.userId, key]);
      newlyUnlocked.push({ key, ...ACHIEVEMENTS[key] });
    }
  }

  const totalTransactions = getOne('SELECT COUNT(*) as c FROM transactions WHERE user_id = ?', [req.userId])?.c || 0;
  if (totalTransactions >= 1) unlock('first_transaction');

  const totalSaved = getOne("SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ? AND type = 'income'", [req.userId])?.t || 0;
  const totalSpent = getOne("SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ? AND type = 'expense'", [req.userId])?.t || 0;
  const netSavings = totalSaved - totalSpent;

  if (netSavings >= 100) unlock('save_100');
  if (netSavings >= 1000) unlock('save_1000');
  if (netSavings >= 5000) unlock('save_5000');
  if (netSavings >= 10000) unlock('save_10000');

  const streak = getOne('SELECT * FROM streaks WHERE user_id = ?', [req.userId]);
  if (streak) {
    if (streak.current_streak >= 7) unlock('streak_7');
    if (streak.current_streak >= 30) unlock('streak_30');
  }

  const goals = getOne('SELECT COUNT(*) as c FROM goals WHERE user_id = ?', [req.userId])?.c || 0;
  if (goals >= 1) unlock('first_goal');

  const completedGoals = getOne("SELECT COUNT(*) as c FROM goals WHERE user_id = ? AND status = 'completed'", [req.userId])?.c || 0;
  if (completedGoals >= 1) unlock('goal_completed');

  const now = new Date();
  const cm = (now.getMonth() + 1).toString().padStart(2, '0');
  const cy = now.getFullYear().toString();
  const monthIncome = getOne("SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ? AND type = 'income' AND strftime('%m', date) = ? AND strftime('%Y', date) = ?", [req.userId, cm, cy])?.t || 0;
  const monthExpenses = getOne("SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ? AND type = 'expense' AND strftime('%m', date) = ? AND strftime('%Y', date) = ?", [req.userId, cm, cy])?.t || 0;

  if (monthIncome > 0 && monthExpenses < monthIncome) unlock('positive_month');

  res.json({ newlyUnlocked, total: Object.keys(ACHIEVEMENTS).length });
});

router.post('/update-streak', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  let streak = getOne('SELECT * FROM streaks WHERE user_id = ?', [req.userId]);
  if (!streak) {
    runInsert('INSERT INTO streaks (user_id, current_streak, last_record_date) VALUES (?, 1, ?)', [req.userId, today]);
    return res.json({ streak: 1, best: 1 });
  }

  if (streak.last_record_date === today) {
    return res.json({ streak: streak.current_streak, best: streak.best_streak });
  }

  const lastDate = new Date(streak.last_record_date);
  const todayDate = new Date(today);
  const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

  let newStreak = 1;
  if (diffDays === 1) newStreak = streak.current_streak + 1;
  else if (diffDays > 1) newStreak = 1;

  const bestStreak = Math.max(newStreak, streak.best_streak);
  runQuery('UPDATE streaks SET current_streak = ?, best_streak = ?, last_record_date = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
    [newStreak, bestStreak, today, req.userId]);

  res.json({ streak: newStreak, best: bestStreak });
});

module.exports = router;
