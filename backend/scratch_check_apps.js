const { psql } = require('./init_db');

async function checkSchema() {
  console.log('Waiting for DB connection...');
  for (let i = 0; i < 10; i++) {
    if (psql.isReady()) break;
    await new Promise(r => setTimeout(r, 500));
  }

  try {
    const res = await psql.Query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'job_applications'
    `);
    console.log('Columns in "job_applications" table:');
    res.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });

    const constraints = await psql.Query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'job_applications'::regclass
    `);
    console.log('Constraints on "job_applications" table:');
    constraints.rows.forEach(row => {
      console.log(`- ${row.conname}: ${row.pg_get_constraintdef}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error checking schema:', err);
    process.exit(1);
  }
}

checkSchema();
