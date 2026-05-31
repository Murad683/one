const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  await client.connect();
  console.log('Connected to DB');

  const username = 'habibmammadov_';
  
  // Select to verify
  let res = await client.query('SELECT id, "igUsername", "igHighlights" FROM "User" WHERE "igUsername" = $1', [username]);
  if (res.rows.length === 0) {
    console.log('User not found');
    return;
  }
  
  console.log('Before update:', res.rows[0].igHighlights);
  
  // Update to empty JSON array
  await client.query('UPDATE "User" SET "igHighlights" = $1 WHERE "igUsername" = $2', ['[]', username]);
  
  // Select again
  res = await client.query('SELECT "igHighlights" FROM "User" WHERE "igUsername" = $1', [username]);
  console.log('After update:', res.rows[0].igHighlights);
  
  await client.end();
}

main().catch(console.error);
