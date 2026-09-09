const {initDB} = require('./src/database');
initDB().then(() => { console.log('DB OK'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
