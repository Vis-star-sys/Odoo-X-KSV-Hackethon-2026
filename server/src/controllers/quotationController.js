const { pool } = require('../config/database');
const { logActivity, createNotification } = require('../utils/logger');

const calculateAIScore = (price, deliveryDays, rating, allQuotations) => {
  const prices = allQuotations.map(q => Number(q.price));
  const deliveries = allQuotations.map(q => Number(q.delivery_days));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDelivery = Math.min(...deliveries);
  const maxDelivery = Math.max(...deliveries);

  const priceScore = maxPrice === minPrice ? 100 : ((maxPrice - price) / (maxPrice - minPrice)) * 100;
  const deliveryScore = maxDelivery === minDelivery ? 100 : ((maxDelivery - deliveryDays) / (maxDelivery - minDelivery)) * 100;
  const ratingScore = (Number(rating) / 5) * 100;

  return (priceScore * 0.5 + deliveryScore * 0.3 + ratingScore * 0.2).toFixed(2);
};

const getQuotations = async (req, res) => {
  try {
    const { rfq_id } = req.query;
    let query = `SELECT q.*, v.company_name, v.rating, v.gst_number, r.title as rfq_title, r.quantity, r.id as rfq_id_val
      FROM quotations q
      JOIN vendors v ON q.vendor_id = v.id
      JOIN rfqs r ON q.rfq_id = r.id WHERE 1=1`;
    const params = [];

    if (rfq_id) { query += ' AND q.rfq_id = ?'; params.push(rfq_id); }
    if (req.user.role === 'vendor') {
      const [vendor] = await pool.query('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
      if (vendor.length) { query += ' AND q.vendor_id = ?'; params.push(vendor[0].id); }
      else return res.json([]);
    }
    query += ' ORDER BY q.ai_score DESC';

    const [quotations] = await pool.query(query, params);
    res.json(quotations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const submitQuotation = async (req, res) => {
  try {
    const { rfq_id, price, delivery_days, warranty, notes } = req.body;
    const [vendor] = await pool.query('SELECT id, rating FROM vendors WHERE user_id = ?', [req.user.id]);
    if (!vendor.length) return res.status(403).json({ message: 'Your account is not linked to a vendor. Contact admin.' });

    const [existing] = await pool.query('SELECT id FROM quotations WHERE rfq_id = ? AND vendor_id = ?', [rfq_id, vendor[0].id]);
    if (existing.length) return res.status(400).json({ message: 'You have already submitted a quotation for this RFQ' });

    const [rfqCheck] = await pool.query('SELECT status FROM rfqs WHERE id = ?', [rfq_id]);
    if (!rfqCheck.length) return res.status(404).json({ message: 'RFQ not found' });
    if (rfqCheck[0].status !== 'published') return res.status(400).json({ message: 'RFQ is not open for quotations' });

    const [result] = await pool.query(
      'INSERT INTO quotations (rfq_id, vendor_id, price, delivery_days, warranty, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [rfq_id, vendor[0].id, price, delivery_days, warranty || null, notes || null]
    );

    // Recalculate AI scores for all quotations in this RFQ
    const [allQuotations] = await pool.query(
      'SELECT q.price, q.delivery_days, v.rating, q.id FROM quotations q JOIN vendors v ON q.vendor_id = v.id WHERE q.rfq_id = ?',
      [rfq_id]
    );
    for (const q of allQuotations) {
      const score = calculateAIScore(Number(q.price), Number(q.delivery_days), Number(q.rating), allQuotations);
      await pool.query('UPDATE quotations SET ai_score = ? WHERE id = ?', [score, q.id]);
    }

    // Notify procurement officers
    const [officers] = await pool.query('SELECT id FROM users WHERE role = "procurement_officer" AND is_active = TRUE');
    const [rfq] = await pool.query('SELECT title FROM rfqs WHERE id = ?', [rfq_id]);
    for (const officer of officers) {
      await createNotification(officer.id, `📋 New quotation received for RFQ: ${rfq[0]?.title}`, 'quotation');
    }

    await logActivity(req.user.id, `Submitted quotation for RFQ: ${rfq[0]?.title}`, 'quotation', result.insertId);
    res.status(201).json({ message: 'Quotation submitted successfully', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, delivery_days, warranty, notes } = req.body;

    // Vendors can only update their own submitted quotations
    if (req.user.role === 'vendor') {
      const [vendor] = await pool.query('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
      if (!vendor.length) return res.status(403).json({ message: 'Not a vendor' });

      const [q] = await pool.query('SELECT * FROM quotations WHERE id = ? AND vendor_id = ?', [id, vendor[0].id]);
      if (!q.length) return res.status(404).json({ message: 'Quotation not found' });
      if (q[0].status !== 'submitted') return res.status(400).json({ message: 'Can only edit quotations that are still submitted (not under review)' });
    }

    await pool.query(
      'UPDATE quotations SET price=?, delivery_days=?, warranty=?, notes=? WHERE id=?',
      [price, delivery_days, warranty || null, notes || null, id]
    );

    // Recalculate AI scores
    const [q] = await pool.query('SELECT rfq_id FROM quotations WHERE id = ?', [id]);
    if (q.length) {
      const [allQuotations] = await pool.query(
        'SELECT q.price, q.delivery_days, v.rating, q.id FROM quotations q JOIN vendors v ON q.vendor_id = v.id WHERE q.rfq_id = ?',
        [q[0].rfq_id]
      );
      for (const aq of allQuotations) {
        const score = calculateAIScore(Number(aq.price), Number(aq.delivery_days), Number(aq.rating), allQuotations);
        await pool.query('UPDATE quotations SET ai_score = ? WHERE id = ?', [score, aq.id]);
      }
    }

    await logActivity(req.user.id, `Updated quotation ${id}`, 'quotation', id);
    res.json({ message: 'Quotation updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const selectQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const [quotation] = await pool.query('SELECT * FROM quotations WHERE id = ?', [id]);
    if (!quotation.length) return res.status(404).json({ message: 'Quotation not found' });
    if (!['submitted', 'rejected'].includes(quotation[0].status)) {
      return res.status(400).json({ message: `Cannot select a quotation with status: ${quotation[0].status}` });
    }

    // Find available manager — round-robin by assigning to manager with fewest pending approvals
    const [managers] = await pool.query(`
      SELECT u.id, COUNT(a.id) as pending_count
      FROM users u
      LEFT JOIN approvals a ON u.id = a.manager_id AND a.status = 'pending'
      WHERE u.role = 'manager' AND u.is_active = TRUE
      GROUP BY u.id
      ORDER BY pending_count ASC
      LIMIT 1
    `);
    if (!managers.length) return res.status(400).json({ message: 'No active manager available for approval' });

    await pool.query('UPDATE quotations SET status = "under_review" WHERE id = ?', [id]);
    const [approval] = await pool.query(
      'INSERT INTO approvals (quotation_id, manager_id, status) VALUES (?, ?, "pending")',
      [id, managers[0].id]
    );

    await createNotification(managers[0].id, `📋 Quotation pending your approval`, 'approval');
    await logActivity(req.user.id, `Selected quotation ${id} for approval`, 'quotation', id);
    res.json({ message: 'Sent for manager approval', approval_id: approval.insertId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getQuotations, submitQuotation, updateQuotation, selectQuotation };
