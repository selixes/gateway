const http = require('http');

console.log("==========================================");
console.log(" Selixes: Gateway Verification Script");
console.log("==========================================\n");

const req = http.request({
  hostname: 'localhost',
  port: 4000,
  path: '/health',
  method: 'GET'
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log("✅ SUCCESS: The Selixes Gateway is running and healthy on port 4000.");
      console.log("\nNext Steps:");
      console.log("1. Open http://localhost:3000 to view the Dashboard.");
      console.log("2. Route your OpenAI SDK traffic to http://localhost:4000/v1");
    } else {
      console.log(`❌ ERROR: The Gateway returned status ${res.statusCode}.`);
      console.log("Ensure the 'api' process is running without errors.");
    }
  });
});

req.on('error', (e) => {
  console.log("❌ ERROR: Could not connect to the Gateway.");
  console.log("Are you sure you ran './start.sh' or 'start.ps1'?");
  console.log(`Error details: ${e.message}`);
});

req.end();
