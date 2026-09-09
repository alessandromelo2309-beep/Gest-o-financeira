const r = /explic|o que (é|e|sao|saó)|como (funciona|é|work)|diferença|qual a diferença|defini/i;
console.log('como economizar:', r.test('como economizar'));
console.log('Como economizar?:', r.test('Como economizar?'));
console.log('como funciona:', r.test('como funciona'));
console.log('o que é:', r.test('o que é'));
console.log('explicar:', r.test('explicar'));

const r2 = /resumo|resumo geral|overview|panorama|visao geral|meu resumo|resumo financeiro/i;
console.log('\nresumo:', r2.test('resumo'));
console.log('Resumo:', r2.test('Resumo'));
console.log('resumo geral:', r2.test('resumo geral'));
