const express = require('express');
const { getAll, getOne, runInsert, runQuery } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    const notifications = getAll(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.userId]
    );
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar notificações' });
  }
});

router.get('/unread', (req, res) => {
  try {
    const count = getOne('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read = 0', [req.userId]);
    res.json({ count: count?.c || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao contar notificações' });
  }
});

router.put('/:id/read', (req, res) => {
  try {
    runQuery('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ message: 'Marcada como lida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao marcar notificação' });
  }
});

router.put('/read-all', (req, res) => {
  try {
    runQuery('UPDATE notifications SET read = 1 WHERE user_id = ?', [req.userId]);
    res.json({ message: 'Todas marcadas como lidas' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao marcar notificações' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    runQuery('DELETE FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ message: 'Removida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover notificação' });
  }
});

router.post('/check', (req, res) => {
  try {
    const now = new Date();
    const cm = (now.getMonth() + 1).toString().padStart(2, '0');
    const cy = now.getFullYear().toString();
    let created = 0;

    const goals = getAll("SELECT * FROM goals WHERE user_id = ? AND status = 'active' AND deadline IS NOT NULL", [req.userId]);
    for (const g of goals) {
      const deadline = new Date(g.deadline);
      const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7 && daysLeft > 0) {
        const existing = getOne(
          "SELECT id FROM notifications WHERE user_id = ? AND type = 'goal_deadline' AND message LIKE ? AND created_at > datetime('now', '-1 day')",
          [req.userId, `%${g.name}%`]
        );
        if (!existing) {
          const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount * 100).toFixed(0) : 0;
          runInsert(
            'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
            [req.userId, 'goal_deadline', 'Meta com prazo próximo',
              `A meta "${g.name}" tem prazo em ${daysLeft} dia(s). Progresso: ${pct}%`]
          );
          created++;
        }
      }
    }

    const cards = getAll('SELECT * FROM credit_cards WHERE user_id = ?', [req.userId]);
    for (const card of cards) {
      if (card.due_day) {
        const dueDate = new Date(now.getFullYear(), now.getMonth(), card.due_day);
        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        if (daysUntilDue <= 3 && daysUntilDue >= 0) {
          const existing = getOne(
            "SELECT id FROM notifications WHERE user_id = ? AND type = 'card_due' AND message LIKE ? AND created_at > datetime('now', '-1 day')",
            [req.userId, `%${card.name}%`]
          );
          if (!existing) {
            runInsert(
              'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
              [req.userId, 'card_due', 'Fatura próxima do vencimento',
                `A fatura do cartão "${card.name}" vence em ${daysUntilDue} dia(s).`
              ]
            );
            created++;
          }
        }
      }
    }

    const budgets = getAll('SELECT b.*, c.name as cat_name FROM budgets b LEFT JOIN categories c ON b.category_id = c.id WHERE b.user_id = ? AND b.month = ? AND b.year = ?', [req.userId, cm, parseInt(cy)]);
    for (const b of budgets) {
      const spent = getOne(
        "SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ? AND category_id = ? AND type = 'expense' AND strftime('%m', date) = ? AND strftime('%Y', date) = ?",
        [req.userId, b.category_id, cm, cy]
      )?.t || 0;
      const pct = b.amount > 0 ? (spent / b.amount * 100) : 0;
      if (pct >= 90) {
        const existing = getOne(
          "SELECT id FROM notifications WHERE user_id = ? AND type = 'budget_alert' AND message LIKE ? AND created_at > datetime('now', '-1 day')",
          [req.userId, `%${b.cat_name}%`]
        );
        if (!existing) {
          runInsert(
            'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
            [req.userId, 'budget_alert', 'Orçamento próximo do limite',
              `O orçamento de "${b.cat_name}" está em ${pct.toFixed(0)}% do limite.`
            ]
          );
          created++;
        }
      }
    }

    res.json({ created, message: `${created} notificações criadas` });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao verificar notificações' });
  }
});

module.exports = router;
