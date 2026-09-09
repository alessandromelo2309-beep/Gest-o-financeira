const express = require('express');
const { getOne, getAll } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/summary', (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const targetMonth = month || (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const targetYear = year || currentDate.getFullYear();

    const income = getOne(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE user_id = ? AND type = 'income'
      AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
    `, [req.userId, targetMonth, targetYear.toString()]);

    const expenses = getOne(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE user_id = ? AND type = 'expense'
      AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
    `, [req.userId, targetMonth, targetYear.toString()]);

    const incomeTotal = income ? income.total : 0;
    const expensesTotal = expenses ? expenses.total : 0;
    const balance = incomeTotal - expensesTotal;

    const totalBalance = getOne(`
      SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE user_id = ?
    `, [req.userId]);

    res.json({
      month: parseInt(targetMonth),
      year: parseInt(targetYear),
      income: incomeTotal,
      expenses: expensesTotal,
      balance,
      totalBalance: totalBalance ? totalBalance.total : 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar resumo' });
  }
});

router.get('/by-category', (req, res) => {
  try {
    const { month, year, type } = req.query;
    const currentDate = new Date();
    const targetMonth = month || (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const targetYear = year || currentDate.getFullYear();

    const data = getAll(`
      SELECT c.name, c.icon, c.color, COALESCE(SUM(t.amount), 0) as total
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id
        AND strftime('%m', t.date) = ? AND strftime('%Y', t.date) = ?
      WHERE c.user_id = ? AND c.type = ?
      GROUP BY c.id
      ORDER BY total DESC
    `, [targetMonth, targetYear.toString(), req.userId, type || 'expense']);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

router.get('/monthly', (req, res) => {
  try {
    const { months } = req.query;
    const limit = parseInt(months) || 6;

    const data = getAll(`
      SELECT
        strftime('%m', date) as month,
        strftime('%Y', date) as year,
        type,
        COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE user_id = ?
      AND date >= date('now', '-' || ? || ' months')
      GROUP BY strftime('%Y-%m', date), type
      ORDER BY year DESC, month DESC
    `, [req.userId, limit]);

    const grouped = {};
    data.forEach(row => {
      const key = `${row.year}-${row.month}`;
      if (!grouped[key]) grouped[key] = { month: row.month, year: row.year, income: 0, expenses: 0 };
      if (row.type === 'income') grouped[key].income = row.total;
      if (row.type === 'expense') grouped[key].expenses = row.total;
    });

    res.json(Object.values(grouped).sort((a, b) => `${b.year}${b.month}`.localeCompare(`${a.year}${a.month}`)));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dados mensais' });
  }
});

router.get('/daily', (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const targetMonth = month || (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const targetYear = year || currentDate.getFullYear();

    const data = getAll(`
      SELECT
        strftime('%d', date) as day,
        type,
        COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE user_id = ?
      AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
      GROUP BY strftime('%d', date), type
      ORDER BY day
    `, [req.userId, targetMonth, targetYear.toString()]);

    const grouped = {};
    data.forEach(row => {
      if (!grouped[row.day]) grouped[row.day] = { day: row.day, income: 0, expenses: 0 };
      if (row.type === 'income') grouped[row.day].income = row.total;
      if (row.type === 'expense') grouped[row.day].expenses = row.total;
    });

    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dados diários' });
  }
});

router.get('/recent', (req, res) => {
  try {
    const { limit } = req.query;
    const n = parseInt(limit) || 5;

    const transactions = getAll(`
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
             a.name as account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.user_id = ?
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ?
    `, [req.userId, n]);

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar transações recentes' });
  }
});

router.get('/upcoming', (req, res) => {
  try {
    const { days } = req.query;
    const n = parseInt(days) || 7;

    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + n);
    const future = futureDate.toISOString().split('T')[0];

    const upcoming = getAll(`
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
             a.name as account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.user_id = ? AND t.type = 'expense' AND t.date >= ? AND t.date <= ?
      ORDER BY t.date ASC
    `, [req.userId, today, future]);

    const overdue = getAll(`
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
             a.name as account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.user_id = ? AND t.type = 'expense' AND t.date < ?
      ORDER BY t.date ASC
    `, [req.userId, today]);

    res.json({ upcoming, overdue });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar despesas futuras' });
  }
});

router.get('/insights', (req, res) => {
  try {
    const now = new Date();
    const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const currentYear = now.getFullYear().toString();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = (prevDate.getMonth() + 1).toString().padStart(2, '0');
    const prevYear = prevDate.getFullYear().toString();

    const currIncome = getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions
      WHERE user_id = ? AND type = 'income'
      AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
    `, [req.userId, currentMonth, currentYear]);

    const currExpenses = getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions
      WHERE user_id = ? AND type = 'expense'
      AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
    `, [req.userId, currentMonth, currentYear]);

    const prevIncome = getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions
      WHERE user_id = ? AND type = 'income'
      AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
    `, [req.userId, prevMonth, prevYear]);

    const prevExpenses = getOne(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions
      WHERE user_id = ? AND type = 'expense'
      AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
    `, [req.userId, prevMonth, prevYear]);

    const topCategory = getAll(`
      SELECT c.name, c.icon, COALESCE(SUM(t.amount), 0) as total
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id
        AND strftime('%m', t.date) = ? AND strftime('%Y', t.date) = ?
      WHERE c.user_id = ? AND c.type = 'expense'
      GROUP BY c.id ORDER BY total DESC LIMIT 3
    `, [currentMonth, currentYear, req.userId]);

    const totalTransactions = getOne(`
      SELECT COUNT(*) as count FROM transactions
      WHERE user_id = ? AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
    `, [req.userId, currentMonth, currentYear]);

    const avgTicket = getOne(`
      SELECT COALESCE(AVG(amount), 0) as avg FROM transactions
      WHERE user_id = ? AND type = 'expense'
      AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
    `, [req.userId, currentMonth, currentYear]);

    const insights = [];
    const cInc = currIncome ? currIncome.total : 0;
    const cExp = currExpenses ? currExpenses.total : 0;
    const pInc = prevIncome ? prevIncome.total : 0;
    const pExp = prevExpenses ? prevExpenses.total : 0;

    if (pExp > 0) {
      const expChange = ((cExp - pExp) / pExp * 100).toFixed(1);
      if (expChange > 0) {
        insights.push({ type: 'warning', text: `Suas despesas aumentaram ${expChange}% este mês em relação ao anterior.` });
      } else if (expChange < 0) {
        insights.push({ type: 'success', text: `Suas despesas diminuíram ${Math.abs(expChange)}% este mês. Parabéns!` });
      }
    }

    if (pInc > 0) {
      const incChange = ((cInc - pInc) / pInc * 100).toFixed(1);
      if (incChange > 0) {
        insights.push({ type: 'success', text: `Suas receitas aumentaram ${incChange}% este mês.` });
      } else if (incChange < 0) {
        insights.push({ type: 'warning', text: `Suas receitas diminuíram ${Math.abs(incChange)}% este mês.` });
      }
    }

    if (topCategory.length > 0 && cExp > 0) {
      const pct = ((topCategory[0].total / cExp) * 100).toFixed(0);
      insights.push({ type: 'info', text: `${topCategory[0].icon} ${topCategory[0].name} representa ${pct}% das suas despesas.` });
    }

    if (cExp > 0 && cInc > 0) {
      const savingRate = (((cInc - cExp) / cInc) * 100).toFixed(0);
      if (savingRate > 0) {
        insights.push({ type: 'success', text: `Você está economizando ${savingRate}% da sua renda este mês.` });
      } else {
        insights.push({ type: 'danger', text: `Suas despesas estão acima das receitas este mês.` });
      }
    }

    if (cExp === 0 && cInc === 0) {
      insights.push({ type: 'info', text: 'Comece registrando suas receitas e despesas para ver insights personalizados.' });
    }

    res.json({
      insights,
      currentMonth: { income: cInc, expenses: cExp, balance: cInc - cExp },
      previousMonth: { income: pInc, expenses: pExp, balance: pInc - pExp },
      topCategories: topCategory,
      totalTransactions: totalTransactions ? totalTransactions.count : 0,
      avgTicket: avgTicket ? avgTicket.avg : 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar insights' });
  }
});

module.exports = router;
