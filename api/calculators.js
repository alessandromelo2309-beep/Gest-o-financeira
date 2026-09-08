async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace('/api/calculators', '');

  if (req.method === 'POST' && path === '/compound') {
    const { principal, monthly, rate, years } = req.body;
    if (!principal || !rate || !years) return res.status(400).json({ error: 'Campos obrigatórios: principal, rate, years' });
    const months = years * 12;
    const monthlyRate = rate / 100 / 12;
    const schedule = [];
    let balance = principal;
    for (let m = 1; m <= months; m++) {
      const interest = balance * monthlyRate;
      balance += interest + (monthly || 0);
      if (m % 12 === 0) schedule.push({ year: m / 12, balance: Math.round(balance * 100) / 100 });
    }
    return res.json({ finalBalance: Math.round(balance * 100) / 100, totalContributed: principal + (monthly || 0) * months, schedule });
  }

  if (req.method === 'POST' && path === '/loan') {
    const { principal, rate, months } = req.body;
    if (!principal || !rate || !months) return res.status(400).json({ error: 'Campos obrigatórios: principal, rate, months' });
    const monthlyRate = rate / 100 / 12;
    const payment = monthlyRate > 0 ? (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1) : principal / months;
    return res.json({ monthlyPayment: Math.round(payment * 100) / 100, totalPayment: Math.round(payment * months * 100) / 100, totalInterest: Math.round((payment * months - principal) * 100) / 100 });
  }

  if (req.method === 'POST' && path === '/savings-goal') {
    const { target, current, monthly, rate } = req.body;
    if (!target || !current) return res.status(400).json({ error: 'Campos obrigatórios: target, current' });
    const monthlyRate = (rate || 0) / 100 / 12;
    const remaining = target - current;
    if (remaining <= 0) return res.json({ monthsNeeded: 0, totalContributed: 0, message: 'Meta já alcançada!' });
    if (!monthly || monthly <= 0) return res.json({ monthsNeeded: Infinity, message: 'Defina um aporte mensal para calcular.' });
    let balance = current;
    let months = 0;
    while (balance < target && months < 1200) {
      balance += balance * monthlyRate + monthly;
      months++;
    }
    return res.json({ monthsNeeded: months, years: Math.round(months / 12 * 10) / 10, totalContributed: months * monthly });
  }

  return res.status(404).json({ error: 'Rota não encontrada' });
}

module.exports = handler;
