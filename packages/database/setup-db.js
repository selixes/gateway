const { Client } = require('pg');

async function main() {
  const adminUrl = "postgresql://postgres:postgres@localhost:5432/postgres";
  const client = new Client({ connectionString: adminUrl });
  
  try {
    await client.connect();
    console.log("Connected as postgres superuser.");
    
    // Check if DB exists
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'akra_flowops'");
    if (res.rowCount === 0) {
      console.log("Creating database akra_flowops...");
      await client.query("CREATE DATABASE akra_flowops");
    } else {
      console.log("Database akra_flowops already exists.");
    }
    
    // Create user akra if not exists
    const userRes = await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'akra'");
    if (userRes.rowCount === 0) {
      console.log("Creating user akra...");
      await client.query("CREATE USER akra WITH PASSWORD 'akrapassword'");
      await client.query("ALTER USER akra WITH SUPERUSER"); // For dev convenience
    } else {
      console.log("User akra already exists.");
    }
    
    await client.end();
    console.log("✅ Database and user setup complete.");
  } catch (err) {
    console.error("❌ Error setting up database:", err.message);
    process.exit(1);
  }
}

main();
