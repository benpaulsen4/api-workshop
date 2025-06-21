const express = require('express');
const path = require('path');
const compression = require('compression');
const app = express();
const PORT = process.env.PORT || 3000;

// Enable compression for all responses
app.use(compression());

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist/api-workshop')));

// Send all requests to index.html
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/api-workshop/browser/index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
