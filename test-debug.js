// Simulate the exact flow from assistant.js
const GREETINGS = /^(oi|olá|ola|bom dia|boa tarde|boa noite|eai|e ai|fala|hello|hi|hey|hello|hi|salve|fala ai|eae|opa|hello|hi)/i;

const FINANCIAL = {
  balance: /saldo|quanto (tenho|possui|tem|tem em)|balanco|balance|meu dinheiro|dinheiro total|patrimonio/i,
  expenses: /despesa|gasto|gastei|despend|quanto (gastei|gastou|gasta)|meus gastos|onde (gastei|gasta)/i,
  income: /receita|ganho|ganhei|renda|quanto (ganhei|recebi|ganha)|salario|salário|freela/i,
  savings: /minha economia|poupança|saving|quanto (economizei|poupei)|juntei|reserva/i,
  categories: /categori|mais gasto|onde (gasto|gastei)|o que mais|principais gastos/i,
  accounts: /conta|account|quais contas|minhas contas|banco/i,
  cards: /cartão|cartao|credit|fatura|crédito/i,
  goals: /meta|goal|objetivo|objetivos|quero juntar/i,
  compare: /compar|mês anterior|anterior|vs|diferença| comparar /i,
  summary: /resumo|resumo geral|overview|panorama|visao geral|meu resumo|resumo financeiro/i,
  transfer: /transfer|transferir|mover|enviar|transferência/i,
  reports: /relatório|report|exportar|csv|pdf/i,
  budget: /orcamento|orçamento|budget|limite mensal/i,
  help_system: /como (funciona|uso|faço)|recurso|feature|tem no sistema|pode fazer/i,
};

const GENERAL = {
  math: /quanto (é|e|da|faz|resulta|compon|somando)|calc|calcul|solve|operacao|soma|subtra|multipl|divid|raiz|potencia|\d+\s*[\+\-\*\/\^]\s*\d+/i,
  write: /escreva|redija|escrever|redigir|compose|draft|texto|email|e-mail|carta|mensagem|report|relat/i,
  explain: /explic|o que (é|e|sao|saó)|como (funciona|é|work)|diferença|qual a diferença|defini/i,
  ideas: /ideia|ideias|sugest|sugira|brainstorm|inspira|criar|montar|começar|iniciar|negocio|negócio/i,
  translate: /tradu|traduzir|traduz|translate/i,
  study: /estud|aprend|matéria|matéria|aula|prova|exercicio|exercício|learn/i,
  plan: /planej|planejar|planejamento|organizar|organiz|plano|meta|objetivo/i,
  joke: /piada|engraç|engraçad|humor|rir|zoei|conta uma/i,
  time: /horas|hora|que horas|que hora|data|dia|hoje|amanha|amanhã|ontem/i,
  name: /seu nome|quem (é|e) voce|como (se|te) chama|qual seu nome|seu appelido/i,
  howru: /tudo (bem|bom|ok|certo|joia|beleza)|como vai|como (está|esta|voce esta|vc esta)|e voce|e ai/i,
  thanks: /obrigad|valeu|thanks|brigad|agradeç|mtobrigad/i,
  bye: /tchau|bye|até (mais|logo|amanha|amanhã)|flw|falou|adeus/i,
};

function detectFinancialIntent(message) {
  for (const [key, regex] of Object.entries(FINANCIAL)) {
    if (regex.test(message)) return key;
  }
  return null;
}

function detectGeneralIntent(message) {
  if (GREETINGS.test(message)) return 'greeting';
  for (const [key, regex] of Object.entries(GENERAL)) {
    if (regex.test(message)) return key;
  }
  return null;
}

const msg = 'Como economizar?';
console.log('Message:', msg);
console.log('Financial intent:', detectFinancialIntent(msg));
console.log('General intent:', detectGeneralIntent(msg));
console.log('Contextual match:', /como.*economizar|dica.*economizar|como.*guardar/.test(msg));
