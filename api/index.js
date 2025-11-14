// api/index.js
// Vercel serverless entrypoint. 
// Export the Express app (from project root), DO NOT recreate the app here.

const app = require('../app');  // <-- IMPORTANT: correct path from api/ to root app.js
module.exports = app;
