const express = require('express');
const PDFDocument = require('pdfkit');
const { getAll, getOne } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function formatCurrency(v) { return `R$ ${(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`; }

router.get('/pdf', (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const cm = month || (now.getMonth() + 1).toString().padStart(2, '0');
    const cy = year || now.getFullYear().toString();

    const user = getOne('SELECT name, email FROM users WHERE id = ?', [req.userId]);
    const accounts = getAll('SELECT name, type, balance FROM accounts WHERE user_id = ?', [req.userId]);
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

    const income = getOne("SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ? AND type = 'income' AND strftime('%m', date) = ? AND strftime('%Y', date) = ?", [req.userId, cm, cy])?.t || 0;
    const expenses = getOne("SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ? AND type = 'expense' AND strftime('%m', date) = ? AND strftime('%Y', date) = ?", [req.userId, cm, cy])?.t || 0;

    const topCats = getAll(`
      SELECT c.name, c.icon, COALESCE(SUM(t.amount), 0) as total
      FROM categories c LEFT JOIN transactions t ON t.category_id = c.id
      AND strftime('%m', t.date) = ? AND strftime('%Y', t.date) = ?
      WHERE c.user_id = ? AND c.type = 'expense' GROUP BY c.id ORDER BY total DESC LIMIT 10
    `, [cm, cy, req.userId]);

    const transactions = getAll(`
      SELECT t.description, t.amount, t.type, t.date, c.name as cat_name
      FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND strftime('%m', t.date) = ? AND strftime('%Y', t.date) = ?
      ORDER BY t.date DESC
    `, [req.userId, cm, cy]);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=relatorio-${cm}-${cy}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('GESTÃO FINANCEIRA', { align: 'center' });
    doc.fontSize(12).text(`Relatório Mensal - ${cm}/${cy}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`);
    doc.text(`Usuário: ${user?.name || 'N/A'}`);
    doc.moveDown();

    doc.fontSize(14).text('Resumo Financeiro', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Saldo Total: ${formatCurrency(totalBalance)}`);
    doc.text(`Receitas: ${formatCurrency(income)}`);
    doc.text(`Despesas: ${formatCurrency(expenses)}`);
    doc.text(`Resultado: ${formatCurrency(income - expenses)}`);
    doc.moveDown();

    if (accounts.length > 0) {
      doc.fontSize(14).text('Contas', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      accounts.forEach(a => { doc.text(`• ${a.name}: ${formatCurrency(a.balance)}`); });
      doc.moveDown();
    }

    if (topCats.length > 0) {
      doc.fontSize(14).text('Top Despesas por Categoria', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      topCats.forEach((c, i) => { doc.text(`${i + 1}. ${c.name}: ${formatCurrency(c.total)}`); });
      doc.moveDown();
    }

    if (transactions.length > 0) {
      doc.fontSize(14).text('Transações', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(8);
      transactions.forEach(t => {
        const sign = t.type === 'income' ? '+' : '-';
        doc.text(`${t.date} | ${sign}${formatCurrency(t.amount)} | ${t.description} | ${t.cat_name || 'Sem categoria'}`);
      });
    }

    doc.end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar PDF' });
  }
});

router.get('/csv', (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const cm = month || (now.getMonth() + 1).toString().padStart(2, '0');
    const cy = year || now.getFullYear().toString();

    const transactions = getAll(`
      SELECT t.date, t.description, t.type, t.amount, c.name as cat_name, a.name as account_name
      FROM transactions t LEFT JOIN categories c ON t.category_id = c.id LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.user_id = ? AND strftime('%m', t.date) = ? AND strftime('%Y', t.date) = ?
      ORDER BY t.date DESC
    `, [req.userId, cm, cy]);

    let csv = 'Data,Descrição,Tipo,Valor,Categoria,Conta\n';
    transactions.forEach(t => {
      csv += `"${t.date}","${t.description}","${t.type === 'income' ? 'Receita' : 'Despesa'}","${t.amount.toFixed(2).replace('.', ',')}","${t.cat_name || ''}","${t.account_name || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=transacoes-${cm}-${cy}.csv`);
    res.send('\uFEFF' + csv);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar CSV' });
  }
});

module.exports = router;
