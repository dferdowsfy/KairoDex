const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser, getUserByEmail } = require('../models/userModel');

async function register({ email, password, role }) {
  const existing = await getUserByEmail(email);
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    err.code = 'EMAIL_EXISTS';
    throw err;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const saved = await createUser({ email, passwordHash, role: role || 'USER' });
  return { id: saved.id, email: saved.email, role: saved.role, createdAt: saved.createdAt };
}

async function login({ email, password }) {
  const user = await getUserByEmail(email);
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }
  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { token };
}

module.exports = { register, login };
