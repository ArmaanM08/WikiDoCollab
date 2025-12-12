import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

function signAccess(user) {
  return jwt.sign({ _id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_TTL || '15m' });
}

function signRefresh(user) {
  return jwt.sign({ _id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.REFRESH_TOKEN_TTL || '12h' });
}

function getCookie(req, name) {
  const cookie = req.headers.cookie || '';
  const parts = cookie.split(';').map(v => v.trim());
  for (const p of parts) {
    if (p.startsWith(name + '=')) return decodeURIComponent(p.split('=').slice(1).join('='));
  }
  return null;
}

router.post('/register', async (req, res) => {
  try {
    let { email, password, displayName } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    email = String(email).trim().toLowerCase();
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, displayName });
    return res.status(201).json({ id: user._id, email: user.email });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  let { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  email = String(email).trim().toLowerCase();
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'User not found. Please sign up.' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signAccess(user);
  const refresh = signRefresh(user);
  res.cookie('refresh_token', refresh, { httpOnly: true, sameSite: 'lax', secure: false });
  return res.json({ token });
});

// Return current user profile based on token
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload._id).select('_id email displayName roles createdAt');
    if (!user) return res.status(404).json({ error: 'Not found' });
    return res.json(user);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Issue a new access token using refresh cookie (session cookie clears when browser is closed)
router.post('/refresh', async (req, res) => {
  try {
    const rt = getCookie(req, 'refresh_token');
    if (!rt) return res.status(401).json({ error: 'Missing refresh token' });
    const payload = jwt.verify(rt, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload._id).select('_id email');
    if (!user) return res.status(401).json({ error: 'Invalid refresh token' });
    const token = signAccess(user);
    return res.json({ token });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', (_req, res) => {
  res.cookie('refresh_token', '', { httpOnly: true, sameSite: 'lax', secure: false, expires: new Date(0) });
  return res.json({ ok: true });
});

// Update profile (displayName)
router.patch('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { displayName } = req.body || {};
    const safeName = (displayName || '').toString().trim();
    if (safeName.length > 100) return res.status(400).json({ error: 'Display name too long' });
    await User.updateOne({ _id: payload._id }, { $set: { displayName: safeName } });
    const user = await User.findById(payload._id).select('_id email displayName roles createdAt');
    return res.json(user);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
