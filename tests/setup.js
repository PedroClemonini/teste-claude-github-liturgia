/**
 * Preparo do ambiente de teste: carrega o .env, permite apontar os testes de
 * integração para um banco separado (DATABASE_URL_TEST) e reduz o custo do
 * bcrypt, que de outro modo domina o tempo da suíte.
 */
try {
  process.loadEnvFile?.('.env');
} catch {
  // Sem .env local: as variáveis já vêm do ambiente (CI, por exemplo).
}

if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

process.env.BCRYPT_ROUNDS ??= '4';
process.env.AUTH_SECRET ??= 'segredo-de-teste';
