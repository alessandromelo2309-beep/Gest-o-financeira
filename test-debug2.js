// Test the contextual regex directly
const r1 = /como.*economizar|dica.*economizar|como.*guardar/i;
console.log('Test 1 - como.*economizar:', r1.test('como economizar'));
console.log('Test 2 - Como economizar?:', r1.test('Como economizar?'));
console.log('Test 3 - como guardar:', r1.test('como guardar'));

// Test with a simpler version
const r2 = /como.*economizar/i;
console.log('\nTest 4 - simple como.*economizar:', r2.test('Como economizar?'));
console.log('Test 5 - lowercase:', r2.test('como economizar'));
