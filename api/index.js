// api/index.js
// Vercel will treat this file as a serverless function.
// Export the express app (no app.listen) so Vercel can run it.

const app = require('../app'); // path from /api -> app.js
module.exports = app;
