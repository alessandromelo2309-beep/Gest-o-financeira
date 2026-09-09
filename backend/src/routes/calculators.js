const express = require('express');
const router = express.Router();

router.post('/compound', (req, res) => {
  const { principal, monthly, rate, years } = req.body;
  if (principal === undefined || rate === undefined || years === undefined) {
    return res.status(400).json({ error: 'Campos obrigatórios: principal, rate, years' });
  }
  const p = parseFloat(principal) || 0;
  const m = parseFloat(monthly) || 0;
  const r = parseFloat(rate) / 100 / 12;
  const n = parseInt(years) * 12;

  const results = [];
  let balance = p;
  let totalContributed = p;
  let totalInterest = 0;

  for (let month = 1; month <= n; month++) {
    const interest = balance * r;
    totalInterest += interest;
    balance += interest + m;
    totalContributed += m;

    if (month % 12 === 0 || month === n) {
      results.push({
        year: Math.ceil(month / 12),
        balance: parseFloat(balance.toFixed(2)),
        contributed: parseFloat(totalContributed.toFixed(2)),
        interest: parseFloat(totalInterest.toFixed(2)),
      });
    }
  }

  res.json({
    finalBalance: parseFloat(balance.toFixed(2)),
    totalContributed: parseFloat(totalContributed.toFixed(2)),
    totalInterest: parseFloat(totalInterest.toFixed(2)),
    timeline: results,
  });
});

router.post('/loan', (req, res) => {
  const { amount, rate, months } = req.body;
  if (!amount || !rate || !months) {
    return res.status(400).json({ error: 'Campos obrigatórios: amount, rate, months' });
  }
  const P = parseFloat(amount);
  const r = parseFloat(rate) / 100 / 12;
  const n = parseInt(months);

  let payment;
  if (r === 0) {
    payment = P / n;
  } else {
    payment = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  const totalPayment = payment * n;
  const totalInterest = totalPayment - P;

  const schedule = [];
  let balance = P;
  for (let i = 1; i <= n; i++) {
    const interestPart = balance * r;
    const principalPart = payment - interestPart;
    balance -= principalPart;
    schedule.push({
      month: i,
      payment: parseFloat(payment.toFixed(2)),
      principal: parseFloat(principalPart.toFixed(2)),
      interest: parseFloat(interestPart.toFixed(2)),
      balance: parseFloat(Math.max(0, balance).toFixed(2)),
    });
  }

  res.json({
    monthlyPayment: parseFloat(payment.toFixed(2)),
    totalPayment: parseFloat(totalPayment.toFixed(2)),
    totalInterest: parseFloat(totalInterest.toFixed(2)),
    schedule,
  });
});

router.post('/savings-goal', (req, res) => {
  const { target, current, monthly, rate } = req.body;
  if (!target) return res.status(400).json({ error: 'target obrigatório' });

  const targetAmount = parseFloat(target);
  const currentAmount = parseFloat(current) || 0;
  const monthlyAmount = parseFloat(monthly) || 0;
  const monthlyRate = (parseFloat(rate) || 0) / 100 / 12;

  let balance = currentAmount;
  let months = 0;
  const timeline = [];

  while (balance < targetAmount && months < 600) {
    months++;
    const interest = balance * monthlyRate;
    balance += interest + monthlyAmount;
    if (months % 12 === 0) {
      timeline.push({ year: Math.ceil(months / 12), balance: parseFloat(balance.toFixed(2)) });
    }
  }

  const totalContributed = currentAmount + (monthlyAmount * months);
  const totalInterest = balance - totalContributed;

  res.json({
    months,
    years: parseFloat((months / 12).toFixed(1)),
    finalBalance: parseFloat(balance.toFixed(2)),
    totalContributed: parseFloat(totalContributed.toFixed(2)),
    totalInterest: parseFloat(totalInterest.toFixed(2)),
    monthlyNeeded: monthlyAmount > 0 ? null : parseFloat(((targetAmount - currentAmount) / Math.max(months, 1)).toFixed(2)),
    timeline,
  });
});

module.exports = router;
