const { Client } = require('pg');

async function testConnection(url) {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    console.log(`✅ Success: ${url}`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`❌ Failed: ${url} (${err.message})`);
    return false;
  }
}

async function main() {
  const urls = [
    "postgresql://selixes:changeme@localhost:5432/selixes",
    "postgresql://postgres:postgres@localhost:5432/postgres",
    "postgresql://postgres:password@localhost:5432/postgres",
    "postgresql://postgres@localhost:5432/postgres",
  ];

  for (const url of urls) {
    if (await testConnection(url)) break;
  }
}

main();
