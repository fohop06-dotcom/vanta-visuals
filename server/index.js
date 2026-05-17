const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const JWT_SECRET = process.env.JWT_SECRET || 'vanta-secret-2026';

pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(6) UNIQUE,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    reg_date TIMESTAMP DEFAULT NOW(),
    sub_end TIMESTAMP,
    avatar TEXT,
    hwid TEXT
  )
`).catch(console.error);

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const uid = Math.floor(100000 + Math.random() * 900000).toString();
  try {
    const result = await pool.query(
      'INSERT INTO users (uid, name, email, password, avatar) VALUES ($1, $2, $3, $4, $5) RETURNING id, uid, name, email, reg_date, sub_end, avatar, hwid',
      [uid, name, email, hash, name[0].toUpperCase()]
    );
    const token = jwt.sign({ uid: result.rows[0].uid }, JWT_SECRET);
    res.json({ token, user: result.rows[0] });
  } catch (e) {
    res.status(400).json({ error: 'Email уже занят' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (!result.rows[0] || !await bcrypt.compare(password, result.rows[0].password)) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  const token = jwt.sign({ uid: result.rows[0].uid }, JWT_SECRET);
  res.json({ token, user: result.rows[0] });
});

app.get('/api/profile', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query('SELECT id, uid, name, email, reg_date, sub_end, avatar, hwid FROM users WHERE uid = $1', [decoded.uid]);
    res.json(result.rows[0]);
  } catch {
    res.status(401).json({ error: 'Неверный токен' });
  }
});

app.post('/api/activate', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { key } = req.body;
    let months = 0;
    if (key.startsWith('MONTH-')) months = 1;
    else if (key.startsWith('HALF-')) months = 6;
    else if (key.startsWith('FOREVER-')) {
      await pool.query('UPDATE users SET sub_end = $1 WHERE uid = $2', ['2099-01-01', decoded.uid]);
      return res.json({ subEnd: '2099-01-01' });
    }
    else return res.status(400).json({ error: 'Неверный ключ' });
    const subEnd = new Date();
    subEnd.setMonth(subEnd.getMonth() + months);
    await pool.query('UPDATE users SET sub_end = $1 WHERE uid = $2', [subEnd, decoded.uid]);
    res.json({ subEnd });
  } catch {
    res.status(401).json({ error: 'Неверный токен' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running on port', process.env.PORT || 3000);
});
