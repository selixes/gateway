const { Client } = require('pg');

async function main() {
  const adminUrl = "postgresql://postgres:postgres@localhost:5432/postgres";
  const client = new Client({ connectionString: adminUrl });
  
  try {
    await client.connect();
    console.log("Connected as postgres superuser.");
    
    // Check if DB exists
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'selixes'");
    if (res.rowCount === 0) {
      console.log("Creating database selixes...");
      await client.query("CREATE DATABASE selixes");
    } else {
      console.log("Database selixes already exists.");
    }
    
    // Create user selixes if not exists
    const userRes = await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'selixes'");
    if (userRes.rowCount === 0) {
      console.log("Creating user selixes...");
      await client.query("CREATE USER selixes WITH PASSWORD 'changeme'");
      await client.query("ALTER USER selixes WITH SUPERUSER"); // For dev convenience
    } else {
      console.log("User selixes already exists.");
    }
    
    await client.end();
    console.log("✅ Database and user setup complete.");
  } catch (err) {
    console.error("❌ Error setting up database:", err.message);
    process.exit(1);
  }
}

main();
