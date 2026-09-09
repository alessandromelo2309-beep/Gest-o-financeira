const { sql, ensureInit } = require('./db');
const { authMiddleware } = require('./auth-middleware');

async function handler(req, res) {
  await ensureInit();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  return authMiddleware(async (req, res) => {
    try {
      const url = new URL(req.url, `https://${req.headers.host}`);
      const path = url.pathname.replace('/api/reports', '');
      const month = url.searchParams.get('month');
      const year = url.searchParams.get('year');
      const days = parseInt(url.searchParams.get('days')) || 7;

      if (path === '/summary') {
        const cm = month || new Date().toISOString().slice(5, 7);
        const cy = year || new Date().getFullYear().toString();
        const totalBalance = await sql`SELECT COALESCE(SUM(balance), 0) as t FROM accounts WHERE user_id = ${req.userId}`;
        const income = await sql`SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ${req.userId} AND type = 'income' AND TO_CHAR(date::date, 'MM') = ${cm} AND TO_CHAR(date::date, 'YYYY') = ${cy}`;
        const expenses = await sql`SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ${req.userId} AND type = 'expense' AND TO_CHAR(date::date, 'MM') = ${cm} AND TO_CHAR(date::date, 'YYYY') = ${cy}`;
        const accounts = await sql`SELECT COUNT(*) as c FROM accounts WHERE user_id = ${req.userId}`;
        const cards = await sql`SELECT COUNT(*) as c FROM credit_cards WHERE user_id = ${req.userId}`;
        const goals = await sql`SELECT COUNT(*) as c FROM goals WHERE user_id = ${req.userId} AND status = 'active'`;
        const budgets = await sql`SELECT COUNT(*) as c FROM budgets WHERE user_id = ${req.userId}`;
        return res.json({
          totalBalance: totalBalance[0].t,
          income: income[0].t,
          expenses: expenses[0].t,
          accounts: accounts[0].c,
          cards: cards[0].c,
          goals: goals[0].c,
          budgets: budgets[0].c,
        });
      }

      if (path === '/by-category') {
        const cm = month || new Date().toISOString().slice(5, 7);
        const cy = year || new Date().getFullYear().toString();
        const type = url.searchParams.get('type') || 'expense';
        const categories = await sql`
          SELECT c.name, c.icon, c.color, COALESCE(SUM(t.amount), 0) as total
          FROM categories c LEFT JOIN transactions t ON t.category_id = c.id
          AND TO_CHAR(t.date::date, 'MM') = ${cm} AND TO_CHAR(t.date::date, 'YYYY') = ${cy}
          WHERE c.user_id = ${req.userId} AND c.type = ${type}
          GROUP BY c.id ORDER BY total DESC
        `;
        return res.json(categories);
      }

      if (path === '/recent') {
        const limit = parseInt(url.searchParams.get('limit')) || 5;
        const transactions = await sql`
          SELECT t.*, c.name as category_name, c.icon as category_icon
          FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
          WHERE t.user_id = ${req.userId}
          ORDER BY t.date DESC, t.created_at DESC LIMIT ${limit}
        `;
        return res.json(transactions);
      }

      if (path === '/upcoming') {
        const d = new Date();
        const cm = (d.getMonth() + 1).toString().padStart(2, '0');
        const cy = d.getFullYear().toString();
        const upcoming = await sql`
          SELECT t.*, c.name as category_name, c.icon as category_icon
          FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
          WHERE t.user_id = ${req.userId} AND t.date >= ${d.toISOString().slice(0, 10)}
          ORDER BY t.date ASC LIMIT ${days}
        `;
        const overdue = await sql`
          SELECT t.*, c.name as category_name, c.icon as category_icon
          FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
          WHERE t.user_id = ${req.userId} AND t.date < ${d.toISOString().slice(0, 10)}
          ORDER BY t.date DESC LIMIT 5
        `;
        return res.json({ upcoming, overdue });
      }

      if (path === '/monthly') {
        const months = parseInt(url.searchParams.get('months')) || 6;
        const data = [];
        for (let i = months - 1; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const cm = (d.getMonth() + 1).toString().padStart(2, '0');
          const cy = d.getFullYear().toString();
          const income = await sql`SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ${req.userId} AND type = 'income' AND TO_CHAR(date::date, 'MM') = ${cm} AND TO_CHAR(date::date, 'YYYY') = ${cy}`;
          const expenses = await sql`SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ${req.userId} AND type = 'expense' AND TO_CHAR(date::date, 'MM') = ${cm} AND TO_CHAR(date::date, 'YYYY') = ${cy}`;
          data.push({ month: `${cm}/${cy.slice(2)}`, income: income[0].t, expenses: expenses[0].t });
        }
        return res.json(data);
      }

      if (path === '/insights') {
        const insights = [];
        const cm = new Date().toISOString().slice(5, 7);
        const cy = new Date().getFullYear().toString();
        const pm = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(5, 7);
        const py = new Date(new Date().setMonth(new Date().getMonth() - 1)).getFullYear().toString();

        const currIncome = await sql`SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ${req.userId} AND type = 'income' AND TO_CHAR(date::date, 'MM') = ${cm} AND TO_CHAR(date::date, 'YYYY') = ${cy}`;
        const currExpenses = await sql`SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ${req.userId} AND type = 'expense' AND TO_CHAR(date::date, 'MM') = ${cm} AND TO_CHAR(date::date, 'YYYY') = ${cy}`;
        const prevExpenses = await sql`SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ${req.userId} AND type = 'expense' AND TO_CHAR(date::date, 'MM') = ${pm} AND TO_CHAR(date::date, 'YYYY') = ${py}`;

        const income = currIncome[0].t;
        const expenses = currExpenses[0].t;
        const prev = prevExpenses[0].t;

        if (income > 0) {
          const savingsRate = ((income - expenses) / income * 100).toFixed(1);
          if (savingsRate >= 20) {
            insights.push({ type: 'success', text: `Excelente! Você está economizando ${savingsRate}% da renda.` });
          } else if (savingsRate < 10) {
            insights.push({ type: 'warning', text: `Sua taxa de economia está baixa (${savingsRate}%). Tente reduzir gastos.` });
          }
        }

        if (prev > 0) {
          const change = ((expenses - prev) / prev * 100).toFixed(1);
          if (change > 20) {
            insights.push({ type: 'danger', text: `Suas despesas aumentaram ${change}% vs mês anterior.` });
          } else if (change < -10) {
            insights.push({ type: 'success', text: `Suas despesas diminuíram ${Math.abs(change)}% vs mês anterior.` });
          }
        }

        return res.json({ insights });
      }

      return res.status(404).json({ error: 'Rota não encontrada' });
    } catch (error) {
      console.error('Erro nos relatórios:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  })(req, res);
}

module.exports = handler;
