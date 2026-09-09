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
      const format = url.searchParams.get('format') || 'csv';
      const type = url.searchParams.get('type');

      let query;
      if (type) {
        query = await sql`
          SELECT t.*, c.name as category_name, a.name as account_name
          FROM transactions t
          LEFT JOIN categories c ON t.category_id = c.id
          LEFT JOIN accounts a ON t.account_id = a.id
          WHERE t.user_id = ${req.userId} AND t.type = ${type}
          ORDER BY t.date DESC
        `;
      } else {
        query = await sql`
          SELECT t.*, c.name as category_name, a.name as account_name
          FROM transactions t
          LEFT JOIN categories c ON t.category_id = c.id
          LEFT JOIN accounts a ON t.account_id = a.id
          WHERE t.user_id = ${req.userId}
          ORDER BY t.date DESC
        `;
      }

      if (format === 'csv') {
        let csv = 'Data,Tipo,Descrição,Valor,Categoria,Conta\n';
        query.forEach(t => {
          csv += `${t.date},${t.type === 'income' ? 'Receita' : 'Despesa'},"${t.description}",${t.amount},${t.category_name || ''},${t.account_name || ''}\n`;
        });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=transacoes.csv');
        return res.send('\uFEFF' + csv);
      }

      if (format === 'pdf') {
        try {
          const PDFDocument = require('pdfkit');
          const doc = new PDFDocument();
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename=transacoes.pdf');
          doc.pipe(res);

          doc.fontSize(20).text('GESTÃO FINANCEIRA', { align: 'center' });
          doc.moveDown();
          doc.fontSize(12).text(`Relatório de Transações - ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });
          doc.moveDown();

          let totalIncome = 0, totalExpenses = 0;
          query.forEach(t => {
            if (t.type === 'income') totalIncome += t.amount;
            else totalExpenses += t.amount;
            doc.fontSize(10).text(`${t.date} | ${t.type === 'income' ? 'Receita' : 'Despesa'} | ${t.description} | R$ ${t.amount.toFixed(2)} | ${t.category_name || 'Sem categoria'}`);
          });

          doc.moveDown();
          doc.fontSize(12).text(`Total Receitas: R$ ${totalIncome.toFixed(2)}`);
          doc.text(`Total Despesas: R$ ${totalExpenses.toFixed(2)}`);
          doc.text(`Resultado: R$ ${(totalIncome - totalExpenses).toFixed(2)}`);

          doc.end();
          return;
        } catch (pdfError) {
          return res.status(500).json({ error: 'Erro ao gerar PDF. Use CSV como alternativa.' });
        }
      }

      return res.status(400).json({ error: 'Formato inválido. Use csv ou pdf.' });
    } catch (error) {
      console.error('Erro na exportação:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  })(req, res);
}

module.exports = handler;
