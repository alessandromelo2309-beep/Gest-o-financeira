const { sql } = require('./db');
const { authMiddleware } = require('./auth-middleware');

const conversations = new Map();

function getHistory(userId) {
  if (!conversations.has(userId)) conversations.set(userId, []);
  const hist = conversations.get(userId);
  if (hist.length > 30) hist.splice(0, hist.length - 30);
  return hist;
}

function saveMessage(userId, role, text) {
  const hist = getHistory(userId);
  hist.push({ role, text, ts: Date.now() });
}

function formatCurrency(v) { return `R$ ${(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`; }

async function getFinancialData(userId) {
  const now = new Date();
  const cm = (now.getMonth() + 1).toString().padStart(2, '0');
  const cy = now.getFullYear().toString();
  const pm = (now.getMonth() || 12).toString().padStart(2, '0');
  const py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const totalBalance = await sql`SELECT COALESCE(SUM(balance), 0) as t FROM accounts WHERE user_id = ${userId}`;
  const accounts = await sql`SELECT name, type, balance FROM accounts WHERE user_id = ${userId}`;
  const categories = await sql`SELECT name, type FROM categories WHERE user_id = ${userId}`;
  const cardCount = await sql`SELECT COUNT(*) as c FROM credit_cards WHERE user_id = ${userId}`;
  const cards = await sql`SELECT name, limit_amount FROM credit_cards WHERE user_id = ${userId}`;
  const goalCount = await sql`SELECT COUNT(*) as c FROM goals WHERE user_id = ${userId} AND status = 'active'`;
  const goals = await sql`SELECT name, target_amount, current_amount FROM goals WHERE user_id = ${userId} AND status = 'active'`;
  const budgetCount = await sql`SELECT COUNT(*) as c FROM budgets WHERE user_id = ${userId}`;

  const currIncome = await sql`SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ${userId} AND type = 'income' AND to_char(date::date, 'MM') = ${cm} AND to_char(date::date, 'YYYY') = ${cy}`;
  const currExpenses = await sql`SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ${userId} AND type = 'expense' AND to_char(date::date, 'MM') = ${cm} AND to_char(date::date, 'YYYY') = ${cy}`;
  const prevIncome = await sql`SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ${userId} AND type = 'income' AND to_char(date::date, 'MM') = ${pm} AND to_char(date::date, 'YYYY') = ${py.toString()}`;
  const prevExpenses = await sql`SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ${userId} AND type = 'expense' AND to_char(date::date, 'MM') = ${pm} AND to_char(date::date, 'YYYY') = ${py.toString()}`;

  const topCats = await sql`
    SELECT c.name, c.icon, COALESCE(SUM(t.amount), 0) as total
    FROM categories c LEFT JOIN transactions t ON t.category_id = c.id
    AND to_char(t.date::date, 'MM') = ${cm} AND to_char(t.date::date, 'YYYY') = ${cy}
    WHERE c.user_id = ${userId} AND c.type = 'expense' GROUP BY c.id ORDER BY total DESC LIMIT 5
  `;

  const recentTx = await sql`
    SELECT t.description, t.amount, t.type, t.date, c.name as cat_name
    FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ${userId} ORDER BY t.date DESC LIMIT 5
  `;

  return {
    totalBalance: totalBalance[0].t,
    accounts,
    categories,
    cardCount: cardCount[0].c,
    cards,
    goalCount: goalCount[0].c,
    goals,
    budgetCount: budgetCount[0].c,
    currIncome: currIncome[0].t,
    currExpenses: currExpenses[0].t,
    currResult: currIncome[0].t - currExpenses[0].t,
    prevIncome: prevIncome[0].t,
    prevExpenses: prevExpenses[0].t,
    prevResult: prevIncome[0].t - prevExpenses[0].t,
    topCats,
    recentTx,
    cm,
    cy,
    savingsRate: currIncome[0].t > 0 ? ((currIncome[0].t - currExpenses[0].t) / currIncome[0].t * 100).toFixed(1) : 0,
    expChange: prevExpenses[0].t > 0 ? (((currExpenses[0].t - prevExpenses[0].t) / prevExpenses[0].t) * 100).toFixed(1) : null,
    incChange: prevIncome[0].t > 0 ? (((currIncome[0].t - prevIncome[0].t) / prevIncome[0].t) * 100).toFixed(1) : null,
  };
}

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

const GENERAL_KNOWLEDGE = {
  'einstein': 'Albert Einstein (1879-1955) foi um físico teórico alemão, considerado um dos cientistas mais influentes da história. Desenvolveu a Teoria da Relatividade (Especial em 1905 e Geral em 1915). Recebeu o Prêmio Nobel de Física em 1921 por sua explicação do efeito fotoelétrico. Sua equação mais famosa é E=mc², que mostra a relação entre energia e massa.',
  'inteligencia artificial': 'Inteligência Artificial (IA) é o campo da computação que busca criar sistemas capazes de realizar tarefas que normalmente exigiriam inteligência humana. Isso inclui aprendizado, raciocínio, percepção, compreensão de linguagem e tomada de decisão. Existem dois tipos principais: IA Fraca (específica para uma tarefa, como assistentes virtuais) e IA Forta (capaz de qualquer tarefa intelectual humana, que ainda não existe).',
  'avião': 'Um avião voa graças aos princípios da aerodinâmica. As asas têm um formato especial (perfil aerodinâmico) que faz o ar passar mais rápido por cima do que por baixo, gerando uma diferença de pressão que cria sustentação (Força de Sustentação). O motor empurra o avião para frente (Tração), a gravidade puxa para baixo (Peso), e o ar opõe resistência (Arrasto). Quando a sustentação supera o peso, o avião voa!',
  'matematica': 'Claro! Matemática é uma área vasta. Posso te ajudar com:\n\n• Aritmética (soma, subtração, multiplicação, divisão)\n• Álgebra (equações, expressões)\n• Geometria (formas, áreas, volumes)\n• Probabilidade e Estatística\n• Cálculo (derivadas, integrais)\n\nQue assunto específico você quer estudar? Me diga o nível também (fundamental, médio, superior).',
  'fisica': 'Física é a ciência que estuda a natureza, seus componentes, suas propriedades e como elas se comportam no espaço e no tempo. Grandes áreas incluem:\n\n• Mecânica (movimento, forças)\n• Termodinâmica (calor, energia)\n• Eletromagnetismo (eletricidade, magnetismo)\n• Óptica (luz)\n• Quântica (partículas subatômicas)\n\nQue assunto te interessa?',
  'quimica': 'Química é o estudo da matéria, sua composição, estrutura, propriedades e como ela muda. Conceitos fundamentais:\n\n• Átomos e moléculas\n• Tabela Periódica\n• Ligações químicas\n• Reações químicas\n• Ácidos e bases\n\nPrecisa de ajuda com algum conceito específico?',
  'programacao': 'Programação é o processo de criar instruções que um computador pode executar. Principais linguagens:\n\n• Python — fácil, versátil, boa para iniciantes\n• JavaScript — para web (front e back-end)\n• Java — corporativo, Android\n• C/C++ — performance, jogos, sistemas\n• TypeScript — JavaScript com tipos\n\nQuer aprender alguma linguagem específica?',
  'investimento': 'Investimentos são formas de fazer seu dinheiro render. Principais tipos:\n\n• Renda Fixa (CDB, Tesouro Direto, LCI/LCA) — menor risco\n• Renda Variável (ações, fundos imobiliários) — maior risco\n• Fundos Multimercado — diversificado\n• Criptomoedas — alta volatilidade\n\nDica: comece pela reserva de emergência (6-12 meses de gastos) antes de investir.',
  'diet': 'Dicas gerais para uma alimentação saudável:\n\n• Coma frutas e legumes diariamente\n• Reduza ultraprocessados e açúcar\n• Beba pelo menos 2L de água por dia\n• Prefira grãos integrais\n• Controle as porções\n• Não pule refeições\n\nPara um plano personalizado, consulte um nutricionista.',
  'exercicio': 'Exercícios recomendados para iniciantes:\n\n• Caminhada (30 min/dia)\n• Musculação (2-3x/semana)\n• Alongamento/yoga\n• Natação\n• Corrida\n\nBenefícios: melhora cardiovascular, humor, sono, energia e saúde mental. Comece devagar e aumente gradualmente.',
  'sono': 'Dicas para melhorar o sono:\n\n• Durma 7-9 horas por noite\n• Mantenha horário regular\n• Evite telas 1h antes de dormir\n• Quarto escuro e fresco\n• Evite café após 14h\n• Exercício físico regular\n• Evite refeições pesadas à noite\n\nDormir bem é essencial para saúde física e mental.',
};

function tryMath(expr) {
  const cleaned = expr.replace(/[^0-9\+\-\*\/\.\(\)\s\^]/g, '').replace(/\^/g, '**');
  if (!cleaned || !/[\d]/.test(cleaned)) return null;
  try {
    const result = Function('"use strict"; return (' + cleaned + ')')();
    if (typeof result === 'number' && isFinite(result)) return result;
  } catch (e) {}
  return null;
}

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

function findKnowledge(message) {
  const m = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, text] of Object.entries(GENERAL_KNOWLEDGE)) {
    if (m.includes(key)) return text;
  }
  return null;
}

function generateFinancialResponse(intent, data, message) {
  const m = message.toLowerCase();
  switch (intent) {
    case 'balance': {
      let r = `💰 **Seu saldo total:** ${formatCurrency(data.totalBalance)}\n\n`;
      data.accounts.forEach(a => { r += `• ${a.name}: ${formatCurrency(a.balance)}\n`; });
      if (data.totalBalance < 0) r += `\n⚠️ Seu saldo está negativo. Precisa de ajuda para organizar?`;
      else if (data.totalBalance > 0 && data.totalBalance < 1000) r += `\n💡 Dica: Que tal começar uma reserva de emergência?`;
      else if (data.totalBalance >= 1000) r += `\n✅ Bom saldo! Está investindo ou guardando em algum lugar?`;
      return r;
    }
    case 'expenses': {
      let r = `📉 **Despesas de ${data.cm}/${data.cy}:** ${formatCurrency(data.currExpenses)}\n\n`;
      if (data.expChange !== null) {
        r += data.expChange > 0 ? `📈 Aumentaram ${data.expChange}% vs mês anterior.\n\n` : `📉 Diminuíram ${Math.abs(data.expChange)}% vs mês anterior.\n\n`;
      }
      if (data.topCats.length > 0) {
        r += `**Maiores categorias:**\n`;
        data.topCats.forEach(c => { r += `${c.icon || '•'} ${c.name}: ${formatCurrency(c.total)}\n`; });
      }
      if (data.currExpenses === 0) r += `\nNenhuma despesa registrada este mês.`;
      return r;
    }
    case 'income': {
      let r = `📈 **Receitas de ${data.cm}/${data.cy}:** ${formatCurrency(data.currIncome)}\n\n`;
      if (data.incChange !== null) {
        r += data.incChange > 0 ? `✅ Aumentaram ${data.incChange}% vs mês anterior.` : `⚠️ Diminuíram ${Math.abs(data.incChange)}% vs mês anterior.`;
      }
      if (data.currIncome === 0) r += `\nNenhuma receita registrada este mês.`;
      return r;
    }
    case 'savings': {
      const rate = data.savingsRate;
      let r = `💎 **Taxa de economia:** ${rate}%\n\n`;
      r += `Renda: ${formatCurrency(data.currIncome)}\nGastos: ${formatCurrency(data.currExpenses)}\nEconomia: ${formatCurrency(data.currResult)}\n\n`;
      if (rate >= 20) r += `✅ Excelante! Você economiza mais de 20%. Continue assim!`;
      else if (rate >= 10) r += `👍 Bom! Mas tente chegar a 20% para uma reserva mais sólida.`;
      else if (rate > 0) r += `⚠️ Sua taxa está baixa. Posso te ajudar com dicas para economizar.`;
      else r += `🚨 Suas despesas estão maiores que as receitas. Precisa de ajuda urgente?`;
      return r;
    }
    case 'categories': {
      if (data.topCats.length === 0) return `📊 Nenhuma despesa categorizada em ${data.cm}/${data.cy}.`;
      let r = `📊 **Top categorias (${data.cm}/${data.cy}):**\n\n`;
      const total = data.topCats.reduce((s, c) => s + c.total, 0);
      data.topCats.forEach((c, i) => {
        const pct = total > 0 ? (c.total / total * 100).toFixed(0) : 0;
        r += `${i + 1}. ${c.icon || '•'} ${c.name}: ${formatCurrency(c.total)} (${pct}%)\n`;
      });
      return r;
    }
    case 'accounts': {
      let r = `🏦 **Suas contas:**\n\n`;
      data.accounts.forEach(a => { r += `• ${a.name} (${a.type}): ${formatCurrency(a.balance)}\n`; });
      r += `\n💰 Total: ${formatCurrency(data.totalBalance)}`;
      return r;
    }
    case 'cards': {
      if (data.cardCount === 0) return `💳 Você ainda não possui cartões cadastrados.\n\nAcesse /cartoes para adicionar.`;
      let r = `💳 **Seus cartões:**\n\n`;
      data.cards.forEach(c => { r += `• ${c.name}: limite ${formatCurrency(c.limit_amount)}\n`; });
      r += `\nAcesse /cartoes para ver detalhes de faturas.`;
      return r;
    }
    case 'goals': {
      if (data.goalCount === 0) return `🎯 Você ainda não possui metas.\n\nAcesse /metas para criar seu primeiro objetivo.`;
      let r = `🎯 **Suas metas ativas:**\n\n`;
      data.goals.forEach(g => {
        const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount * 100).toFixed(0) : 0;
        r += `• ${g.name}: ${formatCurrency(g.current_amount)} de ${formatCurrency(g.target_amount)} (${pct}%)\n`;
      });
      return r;
    }
    case 'compare': {
      let r = `📊 **Comparativo:**\n\n`;
      r += `| | Atual | Anterior |\n|---|---|---|\n`;
      r += `| Receitas | ${formatCurrency(data.currIncome)} | ${formatCurrency(data.prevIncome)} |\n`;
      r += `| Despesas | ${formatCurrency(data.currExpenses)} | ${formatCurrency(data.prevExpenses)} |\n`;
      r += `| Resultado | ${formatCurrency(data.currResult)} | ${formatCurrency(data.prevResult)} |\n\n`;
      const diff = data.currResult - data.prevResult;
      r += diff >= 0 ? `✅ Resultado melhorou ${formatCurrency(diff)}.` : `⚠️ Resultado piorou ${formatCurrency(Math.abs(diff))}.`;
      return r;
    }
    case 'summary': {
      return `📋 **Resumo (${data.cm}/${data.cy}):**\n\n` +
        `💰 Saldo: ${formatCurrency(data.totalBalance)}\n` +
        `📈 Receitas: ${formatCurrency(data.currIncome)}\n` +
        `📉 Despesas: ${formatCurrency(data.currExpenses)}\n` +
        `📊 Resultado: ${formatCurrency(data.currResult)}\n` +
        `💎 Economia: ${data.savingsRate}%\n` +
        `🏦 Contas: ${data.accounts.length}\n` +
        `💳 Cartões: ${data.cardCount}\n` +
        `🎯 Metas: ${data.goalCount}\n` +
        `📝 Orçamentos: ${data.budgetCount}`;
    }
    default:
      return null;
  }
}

function generateGeneralResponse(intent, message) {
  const m = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  switch (intent) {
    case 'greeting':
      return `Olá! 😊 Que bom falar com você. Sou a NEXA, sua assistente inteligente. Posso te ajudar com:\n\n• 💰 Suas finanças (saldo, gastos, receitas)\n• 📚 Dúvidas gerais e estudos\n• ✍️ Escrita e redação\n• 🧮 Cálculos matemáticos\n• 💡 Ideias e planejamento\n• 😄 Conversa e humor\n\nComo posso ajudar?`;

    case 'howru':
      return `Tudo ótimo por aqui! 😊 E com você? Se precisar de qualquer coisa — financeira ou não — estou à disposição.`;

    case 'name':
      return `Sou a **NEXA** 🤖✨ — sua assistente inteligente do sistema GESTÃO FINANCEIRA. Pode me chamar de NEXA!`;

    case 'thanks':
      return `De nada! 😊 Fico feliz em ajudar. Quando precisar, é só chamar!`;

    case 'bye':
      return `Tchau! 👋 Até mais. Estarei aqui quando precisar. Boa gestão financeira!`;

    case 'time': {
      const now = new Date();
      const days = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
      const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      return `📅 Hoje é **${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}**\n🕐 São **${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}**.`;
    }

    case 'math': {
      const mathPatterns = m.match(/[\d\.\+\-\*\/\^\(\)\s]+/g);
      if (mathPatterns) {
        for (const p of mathPatterns) {
          const result = tryMath(p.trim());
          if (result !== null) return `🧮 **Resultado:** ${p.trim()} = **${result}**\n\nPrecisa de mais algum cálculo?`;
        }
      }
      return `🧮 Posso calcular expressões matemáticas! Tente digitar algo como:\n\n• "2 + 2"\n• "150 * 12"\n• "1000 / 3"\n• "2^8"\n\nOu me diga o que precisa calcular.`;
    }

    case 'write': {
      if (m.includes('email') || m.includes('e-mail')) {
        return `✍️ Posso te ajudar a escrever um e-mail! Me diga:\n\n1. **Para quem** (chef, cliente, amigo...)\n2. **Assunto** do e-mail\n3. **Tom** (formal, informal, profissional)\n\nAssim consigo gerar um texto adequado para você.`;
      }
      return `✍️ Posso te ajudar com escrita! Sou bom em:\n\n• 📧 E-mails profissionais e pessoais\n• 📝 Textos e redações\n• 📄 Cartas e documentos\n• 💬 Mensagens formais ou informais\n• 📋 Relatórios e resumos\n\nMe diga o que precisa escrever e o contexto!`;
    }

    case 'explain': {
      const knowledge = findKnowledge(message);
      if (knowledge) return knowledge;
      return `📚 Posso explicar diversos assuntos! Me diga o que quer entender:\n\n• Ciências (física, química, biologia)\n• Tecnologia e programação\n• Matemática\n• História e geografia\n• Economia e finanças\n• E muito mais!\n\nO que quer aprender?`;
    }

    case 'ideas': {
      return `💡 Adoroo gerar ideias! Para te ajudar melhor, me diga:\n\n1. **O tipo de ideia** (negócio, projeto, conteúdo,presente, viagem...)\n2. **Seu perfil** (estudante, profissional, empreendedor...)\n3. **Orçamento** (se aplicável)\n\nAssim posso dar sugestões mais relevantes para você!`;
    }

    case 'translate': {
      return `🌐 Posso traduzir textos! Me diga:\n\n1. O texto que quer traduzir\n2. O idioma de origem\n3. O idioma de destino\n\nExemplo: "Traduza 'Hello, how are you?' para português"`;
    }

    case 'study': {
      return `📚 Vamos estudar! Sou útil para:\n\n• 📖 Explicar conceitos\n• 🧮 Resolver exercícios\n• 📝 Resumir matérias\n• 📋 Criar flashcards\n• 🎯 Montar plano de estudos\n• 💡 Técnicas de memorização\n\nQue matéria ou assunto você quer estudar?`;
    }

    case 'plan': {
      return `📋 Posso te ajudar a planejar! Para isso, me diga:\n\n1. **O que quer planejar** (finanças, estudos, viagem, projeto...)\n2. **Prazo** (até quando?)\n3. **Recursos disponíveis** (tempo, dinheiro, etc.)\n\nAssim monto um plano personalizado para você!`;
    }

    case 'joke': {
      const jokes = [
        'Por que o programador usa óculos? Porque não sabe C++! 😄',
        'O que o zero disse para o oito? "Bonito cinto!" 😂',
        'Por que a calculadora ficou triste? Porque tinha muitos problemas! 😄',
        'Qual a diferença entre um advogado e uma nuvem? A nuvem chove (cobra) para todo lado! 😄',
        'Por que o livro de matemática estava triste? Porque tinha muitos problemas! 📚😂',
      ];
      return jokes[Math.floor(Math.random() * jokes.length)] + '\n\nQuer mais uma? 😊';
    }

    default: {
      const knowledge = findKnowledge(message);
      if (knowledge) return knowledge;

      if (m.length < 5) return `🤔 Pode me explicar melhor? Posso ajudar com muitas coisas!\n\n• 💰 Finanças\n• 📚 Estudos\n• ✍️ Escrita\n• 🧮 Cálculos\n• 💡 Ideias\n• 😄 Conversa\n\nO que precisa?`;

      return `🤔 Hmm, não tenho certeza se entendi. Posso te ajudar com:\n\n• **Finanças:** "Quanto tenho?", "Quanto gastei?"\n• **Geral:** "Explique inteligência artificial"\n• **Cálculos:** "250 * 12"\n• **Escrita:** "Escreva um e-mail profissional"\n• **Ideias:** "Me dê ideias de negócio"\n• **Estudos:** "Me ajude a estudar matemática"\n• **Horas:** "Que horas são?"\n\nTente perguntar de outra forma! 😊`;
    }
  }
}

function generateSpendingSuggestions(data) {
  let r = `📊 **Análise dos seus gastos (${data.cm}/${data.cy}):**\n\n`;

  if (data.topCats.length === 0) {
    return r + `Ainda não tenho dados de despesas suficientes para dar sugestões personalizadas. Registre seus gastos primeiro!`;
  }

  const total = data.topCats.reduce((s, c) => s + c.total, 0);
  const topCat = data.topCats[0];
  const topPct = total > 0 ? (topCat.total / total * 100).toFixed(0) : 0;

  r += `**Maior gasto:** ${topCat.icon || ''} ${topCat.name} — ${formatCurrency(topCat.total)} (${topPct}% do total)\n\n`;

  if (data.savingsRate < 10) {
    r += `⚠️ **Sua taxa de economia está baixa (${data.savingsRate}%).**\n`;
    r += `• Tente reduzir gastos na categoria "${topCat.name}"\n`;
    r += `• Regra 50-30-20: 50% necessidades, 30% desejos, 20% economia\n`;
    r += `• Automatize uma transferência para poupança no dia do salário\n\n`;
  } else if (data.savingsRate < 20) {
    r += `👍 **Sua taxa de economia é ${data.savingsRate}%.** Bom, mas pode melhorar!\n`;
    r += `• Que tal aumentar para 20%? Seria ${formatCurrency(data.currIncome * 0.2)} por mês\n`;
    r += `• Analise gastos em "${topCat.name}" para encontrar cortes\n\n`;
  } else {
    r += `✅ **Excelente! Você economiza ${data.savingsRate}% da renda.**\n`;
    r += `• Continue assim e considere investir parte dessa reserva\n`;
    r += `• Meta sugerida: Reserve ${formatCurrency(data.currIncome * 0.1)} mensais para investimentos\n\n`;
  }

  if (data.topCats.length >= 2) {
    r += `**Outros grandes gastos:**\n`;
    data.topCats.slice(1, 4).forEach(c => {
      const pct = total > 0 ? (c.total / total * 100).toFixed(0) : 0;
      r += `• ${c.icon || ''} ${c.name}: ${formatCurrency(c.total)} (${pct}%)\n`;
    });
  }

  return r;
}

function generateSmartAlerts(data) {
  let r = `🚨 **Alertas Inteligentes:**\n\n`;
  let hasAlerts = false;

  if (data.currExpenses > data.currIncome && data.currIncome > 0) {
    r += `🔴 **Gastos maiores que receitas!** Você gastou ${formatCurrency(data.currExpenses)} e recebeu ${formatCurrency(data.currIncome)}. Diferença: ${formatCurrency(data.currExpenses - data.currIncome)}\n\n`;
    hasAlerts = true;
  }

  if (data.expChange !== null && parseFloat(data.expChange) > 20) {
    r += `📈 **Despesas aumentaram ${data.expChange}%** vs mês anterior. Verifique onde houve o aumento.\n\n`;
    hasAlerts = true;
  }

  if (data.savingsRate < 0) {
    r += `🚨 **Taxa de economia negativa!** Você está gastando mais do que ganha.\n\n`;
    hasAlerts = true;
  } else if (data.savingsRate < 10 && data.currIncome > 0) {
    r += `⚠️ **Taxa de economia baixa (${data.savingsRate}%).** Recomendado: mínimo 20%.\n\n`;
    hasAlerts = true;
  }

  if (data.topCats.length > 0) {
    const total = data.topCats.reduce((s, c) => s + c.total, 0);
    const topPct = total > 0 ? (data.topCats[0].total / total * 100) : 0;
    if (topPct > 40) {
      r += `📌 **Concentração de gastos:** ${data.topCats[0].name} representa ${topPct.toFixed(0)}% das despesas. Considere diversificar.\n\n`;
      hasAlerts = true;
    }
  }

  if (data.goalCount > 0 && data.goals.length > 0) {
    const behindSchedule = data.goals.filter(g => {
      const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount * 100) : 0;
      return pct < 50;
    });
    if (behindSchedule.length > 0) {
      r += `🎯 **Metas abaixo do esperado:** ${behindSchedule.map(g => g.name).join(', ')}. Acelere os aportes!\n\n`;
      hasAlerts = true;
    }
  }

  if (!hasAlerts) {
    r += `✅ **Tudo tranquilo!** Suas finanças estão saudáveis.\n`;
    r += `• Receitas: ${formatCurrency(data.currIncome)}\n`;
    r += `• Despesas: ${formatCurrency(data.currExpenses)}\n`;
    r += `• Economia: ${data.savingsRate}%\n`;
    r += `• Continue assim! 💪`;
  }

  return r;
}

function buildContextualResponse(message, history, data) {
  const lastBot = [...history].reverse().find(h => h.role === 'bot');
  const recentContext = history.slice(-6).map(h => h.text).join(' ').toLowerCase();

  if (/quero.*economizar|quer.*economizar|quero.*guardar|quero.*poupar|como.*posso.*economizar|como.*faco.*economizar|guardar dinheiro|poupar dinheiro|economizar dinheiro|quero.*save/i.test(message)) {
    if (data.currIncome > 0) {
      const suggested = data.currIncome * 0.2;
      return `Com base na sua renda de ${formatCurrency(data.currIncome)}, uma meta de 20% seria **${formatCurrency(suggested)}** por mês.\n\nMas comece com o que conseguir. Até **${formatCurrency(data.currIncome * 0.1)}** (10%) já é uma boa base.\n\nQuer que eu te ajude a montar um plano de economia?`;
    }
    return `Para planejar quanto guardar, preciso saber sua renda mensal. Me diz: quanto você ganha por mês?`;
  }

  if (/como.*economizar|dica.*economizar|como.*guardar/i.test(message)) {
    return `💰 **Dicas para economizar:**\n\n1. **Registre tudo** — anote cada gasto (pode usar o sistema!)\n2. **Regra 50-30-20** — 50% necessidades, 30% desejos, 20% economia\n3. **Automatize** — transfira automaticamente para poupança\n4. **Revise assinaturas** — cancele o que não usa\n5. **Compare preços** — antes de comprar, pesquise\n6. **Lista de compras** — evite compras por impulso\n7. **Coze em casa** — alimentação é o maior gasto de muitos\n\nQuer que eu analise seus gastos para dar dicas mais personalizadas?`;
  }

  if (/planej|planejar|organizar/i.test(message) && /dinheiro|finança|financeiro|mês|mensal/i.test(message)) {
    return `📋 **Planejamento financeiro mensal:**\n\n1. **Receita total:** ${formatCurrency(data.currIncome)}\n2. **Reserva (20%):** ${formatCurrency(data.currIncome * 0.2)}\n3. **Necessidades (50%):** ${formatCurrency(data.currIncome * 0.5)}\n4. **Desejos (30%):** ${formatCurrency(data.currIncome * 0.3)}\n\n**Seus gastos atuais:** ${formatCurrency(data.currExpenses)}\n**Economia atual:** ${data.savingsRate}%\n\nQuer que eu detalhe alguma dessas categorias?`;
  }

  if (/sugest|sugir|o que fazer|me ajuda|me ajude|analise|analisa|analizar|dica personalizada/i.test(message) && /gasto|despesa|dinheiro|finança|gastar|econom/i.test(message)) {
    return generateSpendingSuggestions(data);
  }

  if (/alerta|alertas|aviso|avisos|preocup|preocupa|estou bem|está tudo ok|tudo ok/i.test(message)) {
    return generateSmartAlerts(data);
  }

  return null;
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  return authMiddleware(async (req, res) => {
    try {
      const url = new URL(req.url, `https://${req.headers.host}`);
      const path = url.pathname.replace('/api/assistant', '');

      if (req.method === 'POST' && (!path || path === '/')) {
        const { message } = req.body;
        if (!message || !message.trim()) return res.status(400).json({ error: 'Mensagem obrigatória' });

        saveMessage(req.userId, 'user', message.trim());
        const history = getHistory(req.userId);

        let response = null;
        const data = await getFinancialData(req.userId);

        const financialIntent = detectFinancialIntent(message);
        if (financialIntent) {
          response = generateFinancialResponse(financialIntent, data, message);
        }

        if (!response) {
          const contextual = buildContextualResponse(message, history, data);
          if (contextual) response = contextual;
        }

        if (!response) {
          const generalIntent = detectGeneralIntent(message);
          if (generalIntent) {
            response = generateGeneralResponse(generalIntent, message);
          }
        }

        if (!response) {
          const knowledge = findKnowledge(message);
          if (knowledge) response = knowledge;
        }

        if (!response) {
          response = `🤔 Hmm, não tenho certeza se entendi. Posso te ajudar com:\n\n` +
            `**💰 Finanças:**\n` +
            `• "Quanto tenho?" — seu saldo\n` +
            `• "Quanto gastei?" — despesas\n` +
            `• "Quanto ganhei?" — receitas\n` +
            `• "Minha economia" — taxa de poupança\n` +
            `• "Resumo" — visão geral\n\n` +
            `**📚 Geral:**\n` +
            `• "Explique [assunto]" — aprenda algo novo\n` +
            `• "250 * 12" — cálculos\n` +
            `• "Escreva um e-mail" — ajuda com escrita\n` +
            `• "Me dê ideias" — brainstorm\n` +
            `• "Que horas são?" — data/hora\n\n` +
            `Tente perguntar de outra forma! 😊`;
        }

        saveMessage(req.userId, 'bot', response);
        return res.json({ response });
      }

      if (req.method === 'GET' && path === '/history') {
        const hist = getHistory(req.userId);
        return res.json(hist.map(h => ({ role: h.role, text: h.text })));
      }

      if (req.method === 'DELETE' && path === '/history') {
        conversations.delete(req.userId);
        return res.json({ message: 'Histórico limpo' });
      }

      return res.status(404).json({ error: 'Rota não encontrada' });
    } catch (error) {
      console.error('Erro no assistente:', error);
      return res.status(500).json({ error: 'Erro interno do assistente' });
    }
  })(req, res);
}

module.exports = handler;
