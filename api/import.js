const { sql } = require('./db');
const { authMiddleware } = require('./auth-middleware');

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  return authMiddleware(async (req, res) => {
    try {
      if (req.method === 'POST') {
        const { csv_data } = req.body;
        if (!csv_data) return res.status(400).json({ error: 'Dados CSV são obrigatórios' });

        const lines = csv_data.split('\n').filter(l => l.trim());
        if (lines.length < 2) return res.status(400).json({ error: 'CSV deve ter cabeçalho e pelo menos uma linha de dados' });

        const header = lines[0].toLowerCase();
        const isExpenses = header.includes('despesa') || header.includes('gasto') || header.includes('expense');
        const type = isExpenses ? 'expense' : 'income';

        const categories = await sql`SELECT id, name FROM categories WHERE user_id = ${req.userId} AND type = ${type}`;
        const accounts = await sql`SELECT id FROM accounts WHERE user_id = ${req.userId} LIMIT 1`;

        if (accounts.length === 0) return res.status(400).json({ error: 'Crie pelo menos uma conta antes de importar' });

        const accountId = accounts[0].id;
        let imported = 0;
        let skipped = 0;

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
          if (cols.length < 3) { skipped++; continue; }

          const [date, description, amountStr] = cols;
          const amount = parseFloat(amountStr.replace(/[^\d.,-]/g, '').replace(',', '.'));
          if (isNaN(amount) || amount <= 0) { skipped++; continue; }

          const catName = cols[3] || '';
          let categoryId = null;
          if (catName) {
            const cat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
            if (cat) categoryId = cat.id;
          }

          await sql`INSERT INTO transactions (user_id, account_id, category_id, type, description, amount, date) VALUES (${req.userId}, ${accountId}, ${categoryId}, ${type}, ${description || 'Importado'}, ${amount}, ${date})`;
          await sql`UPDATE accounts SET balance = balance + ${type === 'income' ? amount : -amount} WHERE id = ${accountId}`;
          imported++;
        }

        return res.json({ imported, skipped, message: `${imported} transações importadas, ${skipped} ignoradas` });
      }

      return res.status(404).json({ error: 'Rota não encontrada' });
    } catch (error) {
      console.error('Erro na importação:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  })(req, res);
}

module.exports = handler;
