const { pool } = require('../config/database');

const getDashboardStats = async (req, res) => {
  try {
    const [[vendors]] = await pool.query('SELECT COUNT(*) as count FROM vendors WHERE status = "active"');
    const [[rfqs]] = await pool.query('SELECT COUNT(*) as count FROM rfqs WHERE status IN ("published", "draft")');
    const [[pendingApprovals]] = await pool.query('SELECT COUNT(*) as count FROM approvals WHERE status = "pending"');
    const [[pos]] = await pool.query('SELECT COUNT(*) as count FROM purchase_orders');
    const [[invoices]] = await pool.query('SELECT COUNT(*) as count FROM invoices');
    const [[totalSpend]] = await pool.query('SELECT COALESCE(SUM(total), 0) as amount FROM invoices WHERE status != "generated" OR status = "generated"');
    
    const [monthlySpend] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(total) as amount
      FROM invoices GROUP BY month ORDER BY month DESC LIMIT 6
    `);
    
    const [vendorPerformance] = await pool.query(`
      SELECT v.company_name, v.rating,
        COUNT(DISTINCT q.id) as total_quotations,
        SUM(CASE WHEN q.status = 'approved' THEN 1 ELSE 0 END) as approved_quotations
      FROM vendors v LEFT JOIN quotations q ON v.id = q.vendor_id
      WHERE v.status = 'active' GROUP BY v.id ORDER BY v.rating DESC LIMIT 5
    `);
    
    const [recentActivity] = await pool.query(`
      SELECT al.*, u.name as user_name FROM activity_logs al
      JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT 10
    `);
    
    const [rfqTrend] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
      FROM rfqs GROUP BY month ORDER BY month DESC LIMIT 6
    `);

    res.json({
      stats: {
        vendors: vendors.count,
        rfqs: rfqs.count,
        pendingApprovals: pendingApprovals.count,
        purchaseOrders: pos.count,
        invoices: invoices.count,
        totalSpend: totalSpend.amount
      },
      monthlySpend,
      vendorPerformance,
      recentActivity,
      rfqTrend
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getNotifications = async (req, res) => {
  try {
    const [notifications] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getActivityLogs = async (req, res) => {
  try {
    const [logs] = await pool.query(
      `SELECT al.*, u.name as user_name FROM activity_logs al
      JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT 50`
    );
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDashboardStats, getNotifications, markNotificationRead, getActivityLogs };
