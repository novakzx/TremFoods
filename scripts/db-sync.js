const { execSync } = require('child_process');

const dbUrl = process.env.DATABASE_URL;

if (dbUrl && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://') || dbUrl.startsWith('prisma://'))) {
  console.log('[db-sync] DATABASE_URL detected. Synchronizing Prisma database schema...');
  try {
    // Sem --accept-data-loss: uma alteração destrutiva ao schema falha o passo
    // (e é feita à mão, com backup) em vez de apagar dados de produção num deploy.
    execSync('npx prisma db push --skip-generate', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('[db-sync] Prisma database schema synchronized successfully.');

    try {
      // O seed só cria o que falta (não reescreve o cardápio editado no painel).
      console.log('[db-sync] Seeding missing menu items...');
      execSync('npx tsx prisma/seed.ts', {
        stdio: 'inherit',
        env: process.env,
      });
      console.log('[db-sync] Menu seed finished.');
    } catch (seedErr) {
      console.warn('[db-sync] Note: Seed step notice:', seedErr.message);
    }
  } catch (error) {
    console.warn('[db-sync] Warning: Could not push Prisma schema to database:', error.message);
  }
} else {
  console.log('[db-sync] No valid DATABASE_URL provided. Skipping database synchronization.');
}
