const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDB } = require('./database');

async function startServer() {
  await initDB();
  console.log('Banco de dados inicializado');

  const authRoutes = require('./routes/auth');
  const transactionRoutes = require('./routes/transactions');
  const accountRoutes = require('./routes/accounts');
  const categoryRoutes = require('./routes/categories');
  const budgetRoutes = require('./routes/budgets');
  const reportRoutes = require('./routes/reports');
  const cardRoutes = require('./routes/cards');
  const goalRoutes = require('./routes/goals');
  const assistantRoutes = require('./routes/assistant');

  const app = express();
  const PORT = process.env.PORT || 3001;

  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/accounts', accountRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/budgets', budgetRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/cards', cardRoutes);
  app.use('/api/goals', goalRoutes);
  app.use('/api/assistant', assistantRoutes);

  app.use(express.static(path.join(__dirname, '../../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/build', 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
