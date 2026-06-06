const { pool } = require('../config/database');
const { logActivity, createNotification } = require('../utils/logger');

const getRFQs = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT r.*, u.name as created_by_name, 
      (SELECT COUNT(*) FROM rfq_vendors rv WHERE rv.rfq_id = r.id) as vendor_count,
      (SELECT COUNT(*) FROM quotations q WHERE q.rfq_id = r.id) as quotation_count
      FROM rfqs r JOIN users u ON r.created_by = u.id WHERE 1=1`;
    const params = [];
    
    if (req.user.role === 'vendor') {
      const [vendor] = await pool.query('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
      if (vendor.length) {
        query += ' AND r.id IN (SELECT rfq_id FROM rfq_vendors WHERE vendor_id = ?) AND r.status = "published"';
        params.push(vendor[0].id);
      }
    }
    if (status) { query += ' AND r.status = ?'; params.push(status); }
    query += ' ORDER BY r.created_at DESC';
    
    const [rfqs] = await pool.query(query, params);
    res.json(rfqs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRFQById = async (req, res) => {
  try {
    const [rfqs] = await pool.query(
      `SELECT r.*, u.name as created_by_name FROM rfqs r JOIN users u ON r.created_by = u.id WHERE r.id = ?`,
      [req.params.id]
    );
    if (!rfqs.length) return res.status(404).json({ message: 'RFQ not found' });
    
    const [vendors] = await pool.query(
      `SELECT v.* FROM vendors v JOIN rfq_vendors rv ON v.id = rv.vendor_id WHERE rv.rfq_id = ?`,
      [req.params.id]
    );
    res.json({ ...rfqs[0], vendors });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createRFQ = async (req, res) => {
  try {
    const { title, description, quantity, budget, deadline, vendor_ids } = req.body;
    const [result] = await pool.query(
      'INSERT INTO rfqs (title, description, quantity, budget, deadline, created_by, status) VALUES (?, ?, ?, ?, ?, ?, "draft")',
      [title, description, quantity, budget, deadline, req.user.id]
    );
    
    if (vendor_ids && vendor_ids.length) {
      const values = vendor_ids.map(vid => [result.insertId, vid]);
      await pool.query('INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ?', [values]);
    }
    
    await logActivity(req.user.id, `Created RFQ: ${title}`, 'rfq', result.insertId);
    res.status(201).json({ message: 'RFQ created', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateRFQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, quantity, budget, deadline, status, vendor_ids } = req.body;
    await pool.query(
      'UPDATE rfqs SET title=?, description=?, quantity=?, budget=?, deadline=?, status=? WHERE id=?',
      [title, description, quantity, budget, deadline, status, id]
    );
    
    if (vendor_ids) {
      await pool.query('DELETE FROM rfq_vendors WHERE rfq_id = ?', [id]);
      if (vendor_ids.length) {
        const values = vendor_ids.map(vid => [id, vid]);
        await pool.query('INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ?', [values]);
      }
    }
    
    // Notify vendors when published
    if (status === 'published') {
      const [vendors] = await pool.query(
        `SELECT u.id FROM users u JOIN vendors v ON u.id = v.user_id JOIN rfq_vendors rv ON v.id = rv.vendor_id WHERE rv.rfq_id = ?`, [id]
      );
      for (const vendor of vendors) {
        await createNotification(vendor.id, `New RFQ available: ${title}`, 'rfq');
      }
    }
    
    await logActivity(req.user.id, `Updated RFQ: ${title}`, 'rfq', id);
    res.json({ message: 'RFQ updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteRFQ = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE rfqs SET status = "cancelled" WHERE id = ?', [id]);
    await logActivity(req.user.id, `Cancelled RFQ ${id}`, 'rfq', id);
    res.json({ message: 'RFQ cancelled' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRFQs, getRFQById, createRFQ, updateRFQ, deleteRFQ };
