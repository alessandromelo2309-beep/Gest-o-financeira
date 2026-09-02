export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
}

export function getCurrentMonth() {
  const now = new Date();
  return { month: (now.getMonth() + 1).toString().padStart(2, '0'), year: now.getFullYear() };
}

export function getMonthName(month) {
  return new Date(2024, parseInt(month) - 1).toLocaleDateString('pt-BR', { month: 'long' });
}

export function getMonthNames() {
  return Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString().padStart(2, '0'),
    label: new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })
  }));
}

export function getYears() {
  const current = new Date().getFullYear();
  return [current - 1, current, current + 1];
}
