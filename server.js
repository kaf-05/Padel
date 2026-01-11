require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const db = require('./db');
const fs = require('fs').promises;

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;
const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret';

app.use(express.json());
app.use(cookieParser());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main page on the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- AUTHENTICATION & AUTHORIZATION ---

const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    // Redirect to login for HTML pages, return 401 for API calls
    if (req.accepts('html')) {
        return res.redirect('/login.html');
    }
    return res.status(401).json({ error: 'Acceso denegado' });
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      if (req.accepts('html')) {
        return res.redirect('/login.html');
      }
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Se requiere acceso de administrador' });
  }
  next();
};

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, jwtSecret, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' });
    res.json({ message: 'Logged in successfully', must_change_password: user.must_change_password });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor durante el inicio de sesión.' });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ message: 'Sesión cerrada correctamente' });
});

app.get('/api/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
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
    res.status(500).json({ error: 'Error al registrar el usuario' });
  }
});

app.get('/api/users', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, email, role, created_at FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener los usuarios' });
  }
});

app.post('/api/users/change-password', authenticateToken, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        const user = rows[0];

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'La contraseña antigua no es correcta' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
        await db.query('UPDATE users SET password = ?, must_change_password = FALSE WHERE id = ?', [hashedNewPassword, req.user.id]);

        res.json({ message: 'Contraseña cambiada correctamente' });
    } catch (err) {
        res.status(500).json({ error: 'Error al cambiar la contraseña' });
    }
});

// Court management
app.get('/api/courts', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM courts');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener las pistas' });
  }
});

// Reservation management
app.get('/api/schedule', async (req, res) => {
  try {
    const { date } = req.query;
    const queryDate = date ? new Date(date) : new Date();
    // Start of the day in UTC
    const startDate = new Date(Date.UTC(queryDate.getUTCFullYear(), queryDate.getUTCMonth(), queryDate.getUTCDate(), 0, 0, 0, 0));
    // End of the day in UTC
    const endDate = new Date(Date.UTC(queryDate.getUTCFullYear(), queryDate.getUTCMonth(), queryDate.getUTCDate(), 23, 59, 59, 999));

    const [rows] = await db.query('SELECT court_id, start_time FROM reservations WHERE start_time >= ? AND start_time < ?', [startDate, endDate]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener los horarios' });
  }
});

app.get('/api/my-reservations', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT r.id, r.start_time, r.end_time, c.name as court_name, c.type as court_type FROM reservations r JOIN courts c ON r.court_id = c.id WHERE r.user_id = ? ORDER BY r.start_time DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener mis reservas' });
  }
});

app.post('/api/reservations', authenticateToken, async (req, res) => {
  try {
    const { court_id, date, slot } = req.body;

    // The incoming date and slot are treated as local time.
    // We combine them to create a local time string.
    const localDateTimeString = `${date}T${slot}:00`;
    const startTime = new Date(localDateTimeString);

    // Calculate the end time (90 minutes later)
    const endTime = new Date(startTime.getTime() + 90 * 60 * 1000);

    // Check for existing reservation
    const [existing] = await db.query('SELECT id FROM reservations WHERE court_id = ? AND start_time = ?', [court_id, startTime]);
    if (existing.length > 0) {
        return res.status(409).json({ error: 'Este horario ya está reservado.' });
    }

    const [result] = await db.query('INSERT INTO reservations (user_id, court_id, start_time, end_time) VALUES (?, ?, ?, ?)', [req.user.id, court_id, startTime, endTime]);
    res.status(201).json({ id: result.insertId, message: 'Reserva creada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear la reserva' });
  }
});

app.delete('/api/reservations/:id', authenticateToken, async (req, res) => {
    try {
        const reservationId = req.params.id;
        const [rows] = await db.query('SELECT * FROM reservations WHERE id = ?', [reservationId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }
        const reservation = rows[0];
        if (reservation.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'No tienes permiso para eliminar esta reserva' });
        }
        await db.query('DELETE FROM reservations WHERE id = ?', [reservationId]);
        res.json({ message: 'Reserva eliminada correctamente' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar la reserva' });
    }
});


// --- SERVER INITIALIZATION ---

const initializeDatabase = async () => {
  try {
    const [tables] = await db.query("SHOW TABLES LIKE 'users'");
    if (tables.length > 0) {
        console.log('Database tables already exist.');
        return;
    }
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
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', ['admin']);
    if (rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin', saltRounds);
      await db.query('INSERT INTO users (name, email, password, role, must_change_password) VALUES (?, ?, ?, ?, ?)', ['Admin', 'admin', hashedPassword, 'admin', true]);
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
      await db.query('INSERT INTO courts (name, type) VALUES (?, ?)', ['Pista Central', 'Standard']);
      console.log('Default court created.');
    }
  } catch (err) {
    console.error('Error creating default court:', err);
  }
};

const initializeApp = async () => {
    try {
        await initializeDatabase();
        await createDefaultAdmin();
        await createDefaultCourt();
        console.log("Application initialization complete.");
    } catch (err) {
        console.error('Failed to initialize application:', err);
        // We log the error but don't exit. The server is already running.
        // This allows the health check to pass while still showing the error in the logs.
    }
};

// Start the server first to ensure it can respond to health checks.
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    // Then, attempt to initialize the database and create default data.
    initializeApp();
});
