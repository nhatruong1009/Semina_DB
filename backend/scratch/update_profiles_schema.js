const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

async function run() {
  await client.connect();
  try {
    console.log("Updating profiles table schema...");
    await client.query(`
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512),
      ADD COLUMN IF NOT EXISTS cover_url VARCHAR(512);
    `);
    console.log("Successfully updated profiles table.");
  } catch (err) {
    console.error("Update failed:", err);
  } finally {
    await client.end();
  }
}

run();
