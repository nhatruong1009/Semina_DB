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
      WHERE table_name = 'companies'
    `);
    console.log('Columns in "companies" table:');
    res.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Error checking schema:', err);
    process.exit(1);
  }
}

checkSchema();
