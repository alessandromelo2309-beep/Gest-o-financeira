/**
 * =====================================================
 * TESTE DE CONEXÃO: Neon PostgreSQL
 * =====================================================
 * 
 * Este script verifica se a conexão com o Neon está funcionando.
 * NÃO exibe a connection string por segurança.
 * 
 * COMO USAR:
 *   node scripts/test-connection.js
 * =====================================================
 */

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { neon } = require('@neondatabase/serverless');

async function testConnection() {
  console.log('='.repeat(50));
  console.log('  TESTE DE CONEXÃO - Neon PostgreSQL');
  console.log('='.repeat(50));

  // 1. Verificar se DATABASE_URL está configurada
  console.log('\n1️⃣  Verificando variável DATABASE_URL...');
  
  if (!process.env.DATABASE_URL) {
    console.log('   ❌ DATABASE_URL NÃO encontrada no ambiente');
    console.log('   📋 Adicione no arquivo backend/.env:');
    console.log('      DATABASE_URL=sua_connection_string_aqui');
    process.exit(1);
  }

  // Verificar formato básico (sem revelar o valor)
  const url = process.env.DATABASE_URL;
  const isValidFormat = url.startsWith('postgresql://') || url.startsWith('postgres://');
  
  if (!isValidFormat) {
    console.log('   ❌ DATABASE_URL parece estar em formato inválido');
    console.log('   📋 Deve começar com: postgresql:// ou postgres://');
    process.exit(1);
  }

  console.log('   ✅ DATABASE_URL configurada (formato válido)');

  // 2. Testar conexão
  console.log('\n2️⃣  Testando conexão com o servidor...');
  
  const startTime = Date.now();
  
  try {
    const sql = neon(url);
    
    // Teste simples de conexão
    const result = await sql`SELECT 1 as test, NOW() as server_time`;
    
    const latency = Date.now() - startTime;
    
    console.log('   ✅ Conexão estabelecida com sucesso');
    console.log(`   ⏱️  Latência: ${latency}ms`);
    console.log(`   🕐 Hora do servidor: ${result[0].server_time}`);

    // 3. Verificar se tabelas existem
    console.log('\n3️⃣  Verificando tabelas do banco...');
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    if (tables.length === 0) {
      console.log('   ⚠️  Nenhuma tabela encontrada');
      console.log('   📋 Execute o script de migração para criar as tabelas');
    } else {
      console.log(`   ✅ ${tables.length} tabela(s) encontrada(s):`);
      tables.forEach(t => console.log(`      - ${t.table_name}`));
    }

    // 4. Verificar versão do PostgreSQL
    console.log('\n4️⃣  Informações do servidor...');
    
    const version = await sql`SELECT version()`;
    const pgVersion = version[0].version.split(' ')[1];
    console.log(`   📦 PostgreSQL versão: ${pgVersion}`);

    // 5. Verificar permissões
    console.log('\n5️⃣  Verificando permissões...');
    
    const permissions = await sql`
      SELECT has_database_privilege(current_user, current_database(), 'CREATE') as can_create,
             has_database_privilege(current_user, current_database(), 'CONNECT') as can_connect
    `;

    console.log(`   🔐 Conexão: ${permissions[0].can_connect ? '✅ Permitida' : '❌ Negada'}`);
    console.log(`   🔐 Criação de tabelas: ${permissions[0].can_create ? '✅ Permitida' : '❌ Negada'}`);

    // Resultado final
    console.log('\n' + '='.repeat(50));
    console.log('  ✅ CONEXÃO VALIDADA COM SUCESSO');
    console.log('='.repeat(50));
    console.log('\n📋 Próximo passo: Execute node scripts/migrate.js');
    console.log('   (Aguardando sua autorização)\n');

  } catch (error) {
    console.log('   ❌ Falha na conexão');
    console.log(`   📋 Erro: ${error.message}`);
    
    console.log('\n🔍 Possíveis causas:');
    console.log('   1. Connection string incorreta');
    console.log('   2. Projeto Neon pausado (plano gratuito pausa após inatividade)');
    console.log('   3. Firewall bloqueando a conexão');
    console.log('   4. Senha incorreta');
    
    console.log('\n📋 Soluções:');
    console.log('   1. Verifique a connection string no Neon Dashboard');
    console.log('   2. Acesse https://neon.tech e verifique se o projeto está ativo');
    console.log('   3. Tente novamente em alguns minutos');
    
    process.exit(1);
  }
}

testConnection();
