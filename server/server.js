require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5000;

// app.listen(port, () => {
//   console.log("Server running on port " + port);
// });

// Platform uses entirely stateless endpoints and external cloud storage for media

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/scores', require('./routes/scores'));
app.use('/api/charities', require('./routes/charities'));
app.use('/api/draws', require('./routes/draws'));
app.use('/api/winners', require('./routes/winners'));
app.use('/api/admin', require('./routes/admin'));

// Health check
// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`🏌️ Golf Charity Server running on port ${port}`);
});

module.exports = app;
