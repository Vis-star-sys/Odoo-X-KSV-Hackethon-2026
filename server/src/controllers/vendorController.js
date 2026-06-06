const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const { logActivity } = require('../utils/logger');

const getVendors = async (req, res) => {
  try {
    const { search, status, category } = req.query;
    let query = 'SELECT v.*, u.email as user_email FROM vendors v LEFT JOIN users u ON v.user_id = u.id WHERE 1=1';
    const params = [];
    if (search) { query += ' AND (v.company_name LIKE ? OR v.contact_person LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (status) { query += ' AND v.status = ?'; params.push(status); }
    if (category) { query += ' AND v.vendor_category = ?'; params.push(category); }
    query += ' ORDER BY v.created_at DESC';
    const [vendors] = await pool.query(query, params);
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getVendorById = async (req, res) => {
  try {
    const [vendors] = await pool.query('SELECT * FROM vendors WHERE id = ?', [req.params.id]);
    if (!vendors.length) return res.status(404).json({ message: 'Vendor not found' });
    res.json(vendors[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createVendor = async (req, res) => {
  try {
    const { company_name, vendor_category, gst_number, contact_person, email, phone, address, password } = req.body;

    const [existingVendor] = await pool.query('SELECT id FROM vendors WHERE email = ?', [email]);
    if (existingVendor.length) return res.status(400).json({ message: 'Vendor email already exists' });

    const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length) return res.status(400).json({ message: 'Email already in use by another user' });

    const plainPassword = (password && password.trim()) ? password.trim() : 'vendor@123';
    const hashed = await bcrypt.hash(plainPassword, 10);

    const [userResult] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [contact_person || company_name, email, hashed, 'vendor']
    );

    const [result] = await pool.query(
      'INSERT INTO vendors (user_id, company_name, vendor_category, gst_number, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userResult.insertId, company_name, vendor_category, gst_number, contact_person, email, phone, address]
    );

    await logActivity(req.user.id, `Added vendor: ${company_name}`, 'vendor', result.insertId);
    res.status(201).json({
      message: 'Vendor created successfully',
      id: result.insertId,
      loginEmail: email,
      loginPassword: plainPassword,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, vendor_category, gst_number, contact_person, phone, address, status, rating } = req.body;
    await pool.query(
      'UPDATE vendors SET company_name=?, vendor_category=?, gst_number=?, contact_person=?, phone=?, address=?, status=?, rating=? WHERE id=?',
      [company_name, vendor_category, gst_number, contact_person, phone, address, status, rating, id]
    );
    await logActivity(req.user.id, `Updated vendor: ${company_name}`, 'vendor', id);
    res.json({ message: 'Vendor updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle vendor status: active ↔ inactive
const toggleVendorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' | 'inactive' | 'blacklisted'
    await pool.query('UPDATE vendors SET status = ? WHERE id = ?', [status, id]);

    // Also update linked user is_active
    if (status === 'inactive' || status === 'blacklisted') {
      await pool.query('UPDATE users SET is_active = FALSE WHERE id = (SELECT user_id FROM vendors WHERE id = ?)', [id]);
    } else if (status === 'active') {
      await pool.query('UPDATE users SET is_active = TRUE WHERE id = (SELECT user_id FROM vendors WHERE id = ?)', [id]);
    }

    await logActivity(req.user.id, `Set vendor ${id} status to: ${status}`, 'vendor', id);
    res.json({ message: `Vendor status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Permanent delete vendor + linked user
const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const [vendor] = await pool.query('SELECT user_id, company_name FROM vendors WHERE id = ?', [id]);
    if (!vendor.length) return res.status(404).json({ message: 'Vendor not found' });

    // Check for active POs
    const [activePOs] = await pool.query(
      'SELECT COUNT(*) as count FROM purchase_orders WHERE vendor_id = ? AND status NOT IN ("cancelled", "completed")',
      [id]
    );
    if (activePOs[0].count > 0) {
      return res.status(400).json({ message: 'Cannot delete vendor with active purchase orders. Complete or cancel POs first.' });
    }

    // Delete vendor and linked user
    await pool.query('DELETE FROM vendors WHERE id = ?', [id]);
    if (vendor[0].user_id) {
      await pool.query('DELETE FROM users WHERE id = ?', [vendor[0].user_id]);
    }

    await logActivity(req.user.id, `Permanently deleted vendor: ${vendor[0].company_name}`, 'vendor', id);
    res.json({ message: 'Vendor permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getVendorStats = async (req, res) => {
  try {
    const [[total]] = await pool.query('SELECT COUNT(*) as count FROM vendors');
    const [[active]] = await pool.query('SELECT COUNT(*) as count FROM vendors WHERE status = "active"');
    const [byCategory] = await pool.query('SELECT vendor_category, COUNT(*) as count FROM vendors GROUP BY vendor_category');
    const [topVendors] = await pool.query('SELECT company_name, rating FROM vendors ORDER BY rating DESC LIMIT 5');
    res.json({ total: total.count, active: active.count, byCategory, topVendors });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getVendors, getVendorById, createVendor, updateVendor, toggleVendorStatus, deleteVendor, getVendorStats };
