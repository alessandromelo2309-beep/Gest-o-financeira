const express = require('express');
const { getAll, getOne, runInsert, runQuery } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.post('/csv', (req, res) => {
  try {
    const { csv_data, account_id, default_category_id } = req.body;
    if (!csv_data || !account_id) {
      return res.status(400).json({ error: 'csv_data e account_id são obrigatórios' });
    }

    const lines = csv_data.trim().split('\n');
    if (lines.length < 2) return res.status(400).json({ error: 'CSV deve ter cabeçalho e pelo menos 1 linha de dados' });

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const dateIdx = headers.findIndex(h => h.includes('data') || h.includes('date'));
    const descIdx = headers.findIndex(h => h.includes('descri') || h.includes('desc') || h.includes('historico') || h.includes('histórico'));
    const amountIdx = headers.findIndex(h => h.includes('valor') || h.includes('amount'));
    const typeIdx = headers.findIndex(h => h.includes('tipo') || h.includes('type'));

    if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
      return res.status(400).json({ error: 'CSV deve conter colunas de data, descrição e valor' });
    }

    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
      if (cols.length < 3) { skipped++; continue; }

      const dateStr = cols[dateIdx];
      const description = cols[descIdx];
      const amountStr = cols[amountIdx].replace(/[R$\s.]/g, '').replace(',', '.');
      const amount = parseFloat(amountStr);

      if (!dateStr || !description || isNaN(amount)) { skipped++; continue; }

      let type = 'expense';
      if (typeIdx !== -1 && cols[typeIdx]) {
        const t = cols[typeIdx].toLowerCase();
        if (t.includes('receita') || t.includes('credit') || t.includes('crédito') || t.includes('+') || amount > 0) type = 'income';
      } else {
        type = amount > 0 ? 'income' : 'expense';
      }

      const finalAmount = Math.abs(amount);
      const date = normalizeDate(dateStr);

      runInsert(
        'INSERT INTO transactions (user_id, account_id, category_id, type, description, amount, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.userId, account_id, default_category_id || null, type, description, finalAmount, date]
      );

      const balanceChange = type === 'income' ? finalAmount : -finalAmount;
      runQuery('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?', [balanceChange, account_id, req.userId]);

      imported++;
    }

    res.json({ imported, skipped, message: `${imported} transações importadas, ${skipped} ignoradas` });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao processar CSV: ' + err.message });
  }
});

function normalizeDate(dateStr) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return dateStr;
}

module.exports = router;
