const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`React frontend server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to view the app`);
  console.log(`Alternative port available at http://localhost:5001`);
});
