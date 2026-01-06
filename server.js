const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./db');

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;

app.use(express.json());

// Serve static files from the 'stitch_calendario_semanal_de_pistas' directory
app.use(express.static(path.join(__dirname, 'stitch_calendario_semanal_de_pistas')));

// Redirect the root URL to the login page
app.get('/', (req, res) => {
  res.redirect('/inicio_de_sesión/code.html');
});

// API endpoints for users
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, email, created_at FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const [result] = await db.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);
    res.json({ id: result.insertId, name, email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API endpoints for courts
app.get('/api/courts', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM courts');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/courts', async (req, res) => {
  try {
    const { name, type } = req.body;
    const [result] = await db.query('INSERT INTO courts (name, type) VALUES (?, ?)', [name, type]);
    res.json({ id: result.insertId, name, type });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API endpoints for reservations
app.get('/api/reservations', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM reservations');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reservations', async (req, res) => {
  try {
    const { user_id, court_id, start_time, end_time } = req.body;
    const [result] = await db.query('INSERT INTO reservations (user_id, court_id, start_time, end_time) VALUES (?, ?, ?, ?)', [user_id, court_id, start_time, end_time]);
    res.json({ id: result.insertId, user_id, court_id, start_time, end_time });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
