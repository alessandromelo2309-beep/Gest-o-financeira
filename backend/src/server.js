const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
require('dotenv').config();

const { initDB, saveDB } = require('./database');

function setupBackups() {
  const backupDir = path.join(__dirname, '../../backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  setInterval(() => {
    try {
      const dbPath = path.join(__dirname, '../../database.sqlite');
      if (fs.existsSync(dbPath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `backup-${timestamp}.sqlite`);
        fs.copyFileSync(dbPath, backupPath);
        const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.sqlite')).sort();
        while (files.length > 7) {
          fs.unlinkSync(path.join(backupDir, files.shift()));
        }
        console.log(`Backup criado: ${backupPath}`);
      }
    } catch (err) {
      console.error('Erro ao criar backup:', err.message);
    }
  }, 24 * 60 * 60 * 1000);
}

async function startServer() {
  await initDB();
  console.log('Banco de dados inicializado');

  setupBackups();

  const authRoutes = require('./routes/auth');
  const transactionRoutes = require('./routes/transactions');
  const accountRoutes = require('./routes/accounts');
  const categoryRoutes = require('./routes/categories');
  const budgetRoutes = require('./routes/budgets');
  const reportRoutes = require('./routes/reports');
  const cardRoutes = require('./routes/cards');
  const goalRoutes = require('./routes/goals');
  const assistantRoutes = require('./routes/assistant');
  const recurringRoutes = require('./routes/recurring');
  const importRoutes = require('./routes/import');
  const exportRoutes = require('./routes/export');
  const notificationsRoutes = require('./routes/notifications');
  const gamificationRoutes = require('./routes/gamification');
  const tagsRoutes = require('./routes/tags');
  const calculatorsRoutes = require('./routes/calculators');
  const planningRoutes = require('./routes/planning');
  const dashboardConfigRoutes = require('./routes/dashboard-config');

  const app = express();
  const PORT = process.env.PORT || 3001;

  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' }
  });

  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: { error: 'Limite de requisições atingido.' }
  });

  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api', apiLimiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/accounts', accountRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/budgets', budgetRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/cards', cardRoutes);
  app.use('/api/goals', goalRoutes);
  app.use('/api/assistant', assistantRoutes);
  app.use('/api/recurring', recurringRoutes);
  app.use('/api/import', importRoutes);
  app.use('/api/export', exportRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/gamification', gamificationRoutes);
  app.use('/api/tags', tagsRoutes);
  app.use('/api/calculators', calculatorsRoutes);
  app.use('/api/planning', planningRoutes);
  app.use('/api/dashboard-config', dashboardConfigRoutes);

  app.use(express.static(path.join(__dirname, '../../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/build', 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
