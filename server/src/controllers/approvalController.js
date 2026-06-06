const { pool } = require('../config/database');
const { logActivity, createNotification } = require('../utils/logger');
const { sendEmail, emailTemplates } = require('../services/emailService');

const getApprovals = async (req, res) => {
  try {
    let query = `SELECT a.*, q.price, q.delivery_days, q.notes, q.warranty, q.ai_score,
      v.company_name, v.rating, v.gst_number,
      r.title as rfq_title, r.quantity, r.budget,
      u.name as manager_name
      FROM approvals a
      JOIN quotations q ON a.quotation_id = q.id
      JOIN vendors v ON q.vendor_id = v.id
      JOIN rfqs r ON q.rfq_id = r.id
      JOIN users u ON a.manager_id = u.id WHERE 1=1`;
    const params = [];

    if (req.user.role === 'manager') {
      query += ' AND a.manager_id = ?';
      params.push(req.user.id);
    }
    query += ' ORDER BY a.id DESC';

    const [approvals] = await pool.query(query, params);
    res.json(approvals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const approveReject = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    // Check this approval belongs to the current manager
    const [existing] = await pool.query(
      'SELECT a.*, q.rfq_id, q.vendor_id FROM approvals a JOIN quotations q ON a.quotation_id = q.id WHERE a.id = ? AND a.manager_id = ?',
      [id, req.user.id]
    );
    if (!existing.length) return res.status(404).json({ message: 'Approval not found or not assigned to you' });

    const approval = existing[0];

    await pool.query(
      'UPDATE approvals SET status=?, remarks=?, approved_at=NOW() WHERE id=?',
      [status, remarks || null, id]
    );

    if (status === 'approved') {
      await pool.query('UPDATE quotations SET status = "approved" WHERE id = ?', [approval.quotation_id]);

      // Reset any other pending quotations for same RFQ to submitted (if they were under_review)
      await pool.query(
        'UPDATE quotations SET status = "submitted" WHERE rfq_id = ? AND id != ? AND status = "under_review"',
        [approval.rfq_id, approval.quotation_id]
      );

      // Get RFQ title
      const [rfqData] = await pool.query('SELECT title FROM rfqs WHERE id = ?', [approval.rfq_id]);
      const rfqTitle = rfqData[0]?.title || '';

      // Auto-generate PO with transaction-safe number
      const year = new Date().getFullYear();
      const [lastPO] = await pool.query('SELECT po_number FROM purchase_orders ORDER BY id DESC LIMIT 1');
      let poNum = 1;
      if (lastPO.length) {
        const lastNum = parseInt(lastPO[0].po_number.split('-')[2]) || 0;
        poNum = lastNum + 1;
      }
      const poNumber = `PO-${year}-${String(poNum).padStart(3, '0')}`;

      const [po] = await pool.query(
        'INSERT INTO purchase_orders (po_number, quotation_id, vendor_id, status) VALUES (?, ?, ?, "generated")',
        [poNumber, approval.quotation_id, approval.vendor_id]
      );

      // Notify vendor
      const [vendor] = await pool.query(
        'SELECT v.user_id, v.email, v.company_name FROM vendors v WHERE v.id = ?',
        [approval.vendor_id]
      );
      if (vendor.length) {
        await createNotification(vendor[0].user_id, `🎉 Your quotation was approved! PO: ${poNumber}`, 'po');
        try {
          const tpl = emailTemplates.quotationApproved(vendor[0].company_name, poNumber, rfqTitle);
          await sendEmail({ to: vendor[0].email, ...tpl });
        } catch (emailErr) {
          console.error('Email error:', emailErr.message);
        }
      }

      // Notify procurement officers
      const [officers] = await pool.query('SELECT id FROM users WHERE role = "procurement_officer" AND is_active = TRUE');
      for (const o of officers) {
        await createNotification(o.id, `✅ Quotation approved for "${rfqTitle}". PO ${poNumber} generated.`, 'po');
      }

      await logActivity(req.user.id, `Approved quotation, generated PO: ${poNumber}`, 'po', po.insertId);
      res.json({ message: 'Approved and PO generated', po_number: poNumber });

    } else {
      // REJECTED
      await pool.query('UPDATE quotations SET status = "rejected" WHERE id = ?', [approval.quotation_id]);

      // Notify vendor about rejection
      const [vendor] = await pool.query(
        'SELECT v.user_id, v.company_name FROM vendors v WHERE v.id = ?',
        [approval.vendor_id]
      );
      if (vendor.length) {
        const msg = remarks
          ? `❌ Your quotation was rejected. Reason: ${remarks}`
          : `❌ Your quotation was rejected by the manager.`;
        await createNotification(vendor[0].user_id, msg, 'rejection');
      }

      // Notify procurement officer so they can re-select
      const [rfqData] = await pool.query('SELECT title FROM rfqs WHERE id = ?', [approval.rfq_id]);
      const [officers] = await pool.query('SELECT id FROM users WHERE role = "procurement_officer" AND is_active = TRUE');
      for (const o of officers) {
        await createNotification(o.id, `❌ Quotation for "${rfqData[0]?.title}" was rejected. Please select another.`, 'rejection');
      }

      await logActivity(req.user.id, `Rejected quotation ${approval.quotation_id}`, 'approval', id);
      res.json({ message: 'Quotation rejected' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getApprovals, approveReject };
