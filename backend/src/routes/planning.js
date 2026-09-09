const express = require('express');
const { getAll, getOne, runInsert, runQuery } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const plans = getAll('SELECT * FROM financial_goals WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
  res.json(plans);
});

router.post('/', (req, res) => {
  const { name, initial_amount, monthly_contribution, interest_rate, goal_amount, deadline } = req.body;
  if (!name || !goal_amount) return res.status(400).json({ error: 'name e goal_amount obrigatórios' });

  const initial = parseFloat(initial_amount) || 0;
  const monthly = parseFloat(monthly_contribution) || 0;
  const rate = (parseFloat(interest_rate) || 0) / 100 / 12;
  const target = parseFloat(goal_amount);

  let balance = initial;
  let months = 0;
  while (balance < target && months < 600) {
    months++;
    balance += balance * rate + monthly;
  }

  const projectedDate = new Date();
  projectedDate.setMonth(projectedDate.getMonth() + months);

  const id = runInsert(
    'INSERT INTO financial_goals (user_id, name, initial_amount, monthly_contribution, interest_rate, goal_amount, deadline, projected_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [req.userId, name, initial, monthly, parseFloat(interest_rate) || 0, target, deadline || null, projectedDate.toISOString().split('T')[0]]
  );

  res.status(201).json({
    id, name, initial_amount: initial, monthly_contribution: monthly,
    interest_rate: parseFloat(interest_rate) || 0, goal_amount: target,
    deadline, projected_date: projectedDate.toISOString().split('T')[0],
    months_to_reach: months,
  });
});

router.put('/:id', (req, res) => {
  const { name, initial_amount, monthly_contribution, interest_rate, goal_amount, deadline } = req.body;
  runQuery(
    'UPDATE financial_goals SET name = COALESCE(?, name), initial_amount = COALESCE(?, initial_amount), monthly_contribution = COALESCE(?, monthly_contribution), interest_rate = COALESCE(?, interest_rate), goal_amount = COALESCE(?, goal_amount), deadline = COALESCE(?, deadline) WHERE id = ? AND user_id = ?',
    [name, initial_amount, monthly_contribution, interest_rate, goal_amount, deadline, req.params.id, req.userId]
  );
  res.json({ message: 'Atualizada' });
});

router.delete('/:id', (req, res) => {
  runQuery('DELETE FROM financial_goals WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  res.json({ message: 'Removida' });
});

router.post('/simulate', (req, res) => {
  const { initial_amount, monthly_contribution, interest_rate, years, inflation_rate } = req.body;

  const initial = parseFloat(initial_amount) || 0;
  const monthly = parseFloat(monthly_contribution) || 0;
  const annualRate = (parseFloat(interest_rate) || 0) / 100;
  const inflation = (parseFloat(inflation_rate) || 0) / 100;
  const totalYears = parseInt(years) || 10;

  const monthlyRate = annualRate / 12;
  const realRate = ((1 + annualRate) / (1 + inflation)) - 1;

  const optimistic = { timeline: [], finalBalance: 0 };
  const realistic = { timeline: [], finalBalance: 0 };
  const conservative = { timeline: [], finalBalance: 0 };

  let balOpt = initial, balReal = initial, balCons = initial;

  for (let year = 1; year <= totalYears; year++) {
    for (let month = 1; month <= 12; month++) {
      balOpt += balOpt * (monthlyRate * 1.5) + monthly;
      balReal += balReal * monthlyRate + monthly;
      balCons += balCons * (monthlyRate * 0.5) + monthly;
    }
    optimistic.timeline.push({ year, balance: parseFloat(balOpt.toFixed(2)) });
    realistic.timeline.push({ year, balance: parseFloat(balReal.toFixed(2)) });
    conservative.timeline.push({ year, balance: parseFloat(balCons.toFixed(2)) });
  }

  optimistic.finalBalance = parseFloat(balOpt.toFixed(2));
  realistic.finalBalance = parseFloat(balReal.toFixed(2));
  conservative.finalBalance = parseFloat(balCons.toFixed(2));

  const totalContributed = initial + (monthly * totalYears * 12);

  res.json({
    totalContributed,
    scenarios: { optimistic, realistic, conservative },
  });
});

module.exports = router;
