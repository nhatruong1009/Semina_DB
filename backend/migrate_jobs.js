const { psql } = require('./init_db');

async function migrate() {
  console.log('Waiting for DB connection...');
  for (let i = 0; i < 10; i++) {
    if (psql.isReady()) break;
    await new Promise(r => setTimeout(r, 500));
  }

  try {
    console.log('Adding missing columns to "jobs" table...');
    await psql.Query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS description TEXT`);
    await psql.Query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location TEXT`);
    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
