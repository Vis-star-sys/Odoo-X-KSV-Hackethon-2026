const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { logActivity } = require('../utils/logger');

// Register a new user (admin use)
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(400).json({ message: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashed, role || 'vendor']
    );

    await logActivity(result.insertId, `User registered: ${name}`, 'user', result.insertId);
    res.status(201).json({ message: 'User created successfully', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await pool.query('SELECT * FROM users WHERE email = ? AND is_active = TRUE', [email]);
    if (!users.length) return res.status(401).json({ message: 'Invalid credentials' });

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    await logActivity(user.id, 'User logged in', 'user', user.id);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get own profile
const getProfile = async (req, res) => {
  res.json({ user: req.user });
};

// Change own password — available to ALL roles
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!users.length) return res.status(404).json({ message: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, users[0].password);
    if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);

    await logActivity(req.user.id, 'Changed own password', 'user', req.user.id);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: reset any user's password directly
const adminResetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
    if (!users.length) return res.status(404).json({ message: 'User not found' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, id]);

    await logActivity(req.user.id, `Admin reset password for user ${id}`, 'user', id);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all users (admin)
const getUsers = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user (admin)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, is_active } = req.body;
    await pool.query('UPDATE users SET name = ?, role = ?, is_active = ? WHERE id = ?', [name, role, is_active, id]);
    await logActivity(req.user.id, `Updated user ${id}`, 'user', id);
    res.json({ message: 'User updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Deactivate user (admin)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE users SET is_active = FALSE WHERE id = ?', [id]);
    await logActivity(req.user.id, `Deactivated user ${id}`, 'user', id);
    res.json({ message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  changePassword,
  adminResetPassword,
  getUsers,
  updateUser,
  deleteUser,
};
