const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const db = require('./db');
const fs = require('fs').promises;

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  console.error('FATAL ERROR: JWT_SECRET is not defined.');
  process.exit(1);
}

app.use(express.json());
app.use(cookieParser());

// Serve static files from the 'stitch_calendario_semanal_de_pistas' directory
app.use(express.static(path.join(__dirname, 'stitch_calendario_semanal_de_pistas')));

// Redirect the root URL to the weekly calendar
app.get('/', (req, res) => {
  res.redirect('/calendario_semanal_de_pistas_1/code.html');
});

// --- AUTHENTICATION & AUTHORIZATION ---

const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, jwtSecret, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.json({ message: 'Logged in successfully', must_change_password: user.must_change_password });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// --- API ENDPOINTS ---

// User management
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const [result] = await db.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);
    res.status(201).json({ id: result.insertId, name, email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid old password' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    await db.query('UPDATE users SET password = ?, must_change_password = FALSE WHERE id = ?', [hashedNewPassword, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, email, role, created_at FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    await db.query('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?', [name, email, role, req.params.id]);
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Court management
app.get('/api/courts', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM courts');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/courts', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { name, type } = req.body;
    const [result] = await db.query('INSERT INTO courts (name, type) VALUES (?, ?)', [name, type]);
    res.status(201).json({ id: result.insertId, name, type });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/courts/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { name, type } = req.body;
    await db.query('UPDATE courts SET name = ?, type = ? WHERE id = ?', [name, type, req.params.id]);
    res.json({ message: 'Court updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/courts/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM courts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Court deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reservation management
app.get('/api/schedule', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT court_id, start_time FROM reservations');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reservations', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM reservations');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/my-reservations', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT r.id, r.start_time, r.end_time, c.name as court_name FROM reservations r JOIN courts c ON r.court_id = c.id WHERE r.user_id = ?',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reservations', authenticateToken, async (req, res) => {
  try {
    const { court_id, start_time, end_time } = req.body;
    const [result] = await db.query('INSERT INTO reservations (user_id, court_id, start_time, end_time) VALUES (?, ?, ?, ?)', [req.user.id, court_id, start_time, end_time]);
    res.status(201).json({ id: result.insertId, user_id: req.user.id, court_id, start_time, end_time });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reservations/:id', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    const reservation = rows[0];
    if (reservation.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    await db.query('DELETE FROM reservations WHERE id = ?', [req.params.id]);
    res.json({ message: 'Reservation deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- SERVER INITIALIZATION ---

const initializeDatabase = async () => {
  try {
    const schema = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf-8');
    const queries = schema.split(';').filter(query => query.trim());
    for (const query of queries) {
      await db.query(query);
    }
    console.log('Database schema initialized successfully.');
  } catch (err) {
    console.error('Error initializing database schema:', err);
    process.exit(1);
  }
};

const createDefaultAdmin = async () => {
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', ['admin@example.com']);
    if (rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin', saltRounds);
      await db.query('INSERT INTO users (name, email, password, role, must_change_password) VALUES (?, ?, ?, ?, ?)', ['admin', 'admin@example.com', hashedPassword, 'admin', true]);
      console.log('Default admin user created.');
    }
  } catch (err) {
    console.error('Error creating default admin user:', err);
  }
};

const createDefaultCourt = async () => {
  try {
    const [rows] = await db.query('SELECT * FROM courts');
    if (rows.length === 0) {
      await db.query('INSERT INTO courts (name, type) VALUES (?, ?)', ['Pista 1', 'Standard']);
      console.log('Default court created.');
    }
  } catch (err) {
    console.error('Error creating default court:', err);
  }
};

app.listen(port, async () => {
  await initializeDatabase();
  await createDefaultAdmin();
  await createDefaultCourt();
  console.log(`Server is running on http://localhost:${port}`);
});
