const r = /explic|o que (é|e|sao|saó)|como (funciona|é|e|work)|diferença|qual a diferença|defini/i;
console.log('como economizar:', r.test('como economizar'));
console.log('Como economizar?:', r.test('Como economizar?'));
console.log('como funciona:', r.test('como funciona'));

const r2 = /quero.*economizar|quer.*economizar|quero.*guardar|quero.*poupar|como.*posso.*economizar|como.*faco.*economizar|guardar dinheiro|poupar dinheiro|economizar dinheiro|quero.*save/i;
console.log('\nquero economizar dinheiro:', r2.test('Quero economizar dinheiro'));
console.log('como economizar:', r2.test('como economizar'));
console.log('Como economizar?:', r2.test('Como economizar?'));
