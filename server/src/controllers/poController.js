const { pool } = require('../config/database');
const PDFDocument = require('pdfkit');
const { logActivity } = require('../utils/logger');

const getPOs = async (req, res) => {
  try {
    let query = `SELECT po.*, v.company_name, v.gst_number, v.email as vendor_email,
      q.price, q.delivery_days, r.title as rfq_title, r.quantity, r.description
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      JOIN quotations q ON po.quotation_id = q.id
      JOIN rfqs r ON q.rfq_id = r.id WHERE 1=1`;
    const params = [];

    if (req.user.role === 'vendor') {
      const [vendor] = await pool.query('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
      if (vendor.length) { query += ' AND po.vendor_id = ?'; params.push(vendor[0].id); }
      else return res.json([]);
    }
    query += ' ORDER BY po.created_at DESC';
    const [pos] = await pool.query(query, params);
    res.json(pos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPOById = async (req, res) => {
  try {
    const [pos] = await pool.query(
      `SELECT po.*, v.company_name, v.gst_number, v.email as vendor_email, v.phone, v.address,
      q.price, q.delivery_days, q.warranty, r.title as rfq_title, r.quantity, r.description
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      JOIN quotations q ON po.quotation_id = q.id
      JOIN rfqs r ON q.rfq_id = r.id WHERE po.id = ?`,
      [req.params.id]
    );
    if (!pos.length) return res.status(404).json({ message: 'PO not found' });
    res.json(pos[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePOStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['generated', 'sent', 'acknowledged', 'completed', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    await pool.query('UPDATE purchase_orders SET status = ? WHERE id = ?', [status, id]);
    await logActivity(req.user.id, `Updated PO ${id} status to: ${status}`, 'po', id);
    res.json({ message: `PO status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── PDF helpers ────────────────────────────────────────────────────────────
const BRAND_BLUE  = '#1E40AF';
const BRAND_LIGHT = '#3B82F6';
const ACCENT      = '#DBEAFE';
const DARK_TEXT   = '#111827';
const MID_TEXT    = '#374151';
const LIGHT_TEXT  = '#6B7280';
const BORDER      = '#E5E7EB';

function formatINR(n) {
  return `Rs. ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function drawRect(doc, x, y, w, h, color) {
  doc.save().rect(x, y, w, h).fill(color).restore();
}
function drawLine(doc, x1, y1, x2, y2, color = BORDER, lw = 0.5) {
  doc.save().strokeColor(color).lineWidth(lw).moveTo(x1, y1).lineTo(x2, y2).stroke().restore();
}

const downloadPOPdf = async (req, res) => {
  try {
    const [pos] = await pool.query(
      `SELECT po.*, v.company_name, v.gst_number, v.email as vendor_email,
       v.phone as vendor_phone, v.address as vendor_address, v.contact_person,
       q.price, q.delivery_days, q.warranty, q.notes as quotation_notes,
       r.title as rfq_title, r.quantity, r.description as rfq_desc, r.budget
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      JOIN quotations q ON po.quotation_id = q.id
      JOIN rfqs r ON q.rfq_id = r.id WHERE po.id = ?`,
      [req.params.id]
    );
    if (!pos.length) return res.status(404).json({ message: 'PO not found' });
    const po = pos[0];

    const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: po.po_number, Author: 'VendorBridge' } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${po.po_number}.pdf`);
    doc.pipe(res);

    const PAGE_W = 595;
    const PAGE_H = 842;
    const MARGIN = 40;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    // ── HEADER BAND ────────────────────────────────────────────────────────
    drawRect(doc, 0, 0, PAGE_W, 100, BRAND_BLUE);

    doc.save().circle(MARGIN + 26, 50, 26).fill('white');
    doc.font('Helvetica-Bold').fontSize(16).fillColor(BRAND_BLUE).text('VB', MARGIN + 15, 42);

    doc.font('Helvetica-Bold').fontSize(22).fillColor('white').text('VendorBridge', MARGIN + 62, 30);
    doc.font('Helvetica').fontSize(9).fillColor('#BFDBFE').text('ERP Procurement Platform', MARGIN + 62, 56);

    drawRect(doc, PAGE_W - 160, 24, 120, 52, 'rgba(255,255,255,0.15)');
    doc.font('Helvetica-Bold').fontSize(14).fillColor('white')
      .text('PURCHASE ORDER', PAGE_W - 156, 38, { width: 112, align: 'center' });

    // ── PO META BAND ───────────────────────────────────────────────────────
    drawRect(doc, 0, 100, PAGE_W, 56, ACCENT);
    drawLine(doc, 0, 156, PAGE_W, 156, BRAND_LIGHT, 1.5);

    const poDate = new Date(po.created_at);
    const fmt = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const metaBoxW = CONTENT_W / 4;
    const statusColor = { generated: '#2563EB', sent: '#D97706', acknowledged: '#059669', completed: '#065F46', cancelled: '#DC2626' };
    const metaItems = [
      { label: 'PO NUMBER',    value: po.po_number },
      { label: 'PO DATE',      value: fmt(poDate) },
      { label: 'STATUS',       value: po.status?.toUpperCase(), color: statusColor[po.status] || DARK_TEXT },
      { label: 'DELIVERY DAYS',value: `${po.delivery_days} Days` },
    ];
    metaItems.forEach((item, i) => {
      const x = MARGIN + i * metaBoxW;
      if (i > 0) drawLine(doc, x, 108, x, 150, BRAND_LIGHT, 0.5);
      doc.font('Helvetica').fontSize(7).fillColor(BRAND_BLUE).text(item.label, x + 4, 112, { width: metaBoxW - 8 });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(item.color || DARK_TEXT)
        .text(item.value, x + 4, 126, { width: metaBoxW - 8 });
    });

    // ── VENDOR DETAILS ─────────────────────────────────────────────────────
    let curY = 176;
    const halfW = (CONTENT_W - 20) / 2;

    // FROM (VendorBridge)
    drawRect(doc, MARGIN, curY, halfW, 110, '#F9FAFB');
    drawLine(doc, MARGIN, curY, MARGIN + halfW, curY, BRAND_BLUE, 2);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(BRAND_BLUE).text('ISSUED BY', MARGIN + 10, curY + 10);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(DARK_TEXT).text('VendorBridge Pvt. Ltd.', MARGIN + 10, curY + 24);
    doc.font('Helvetica').fontSize(8.5).fillColor(MID_TEXT)
      .text('procurement@vendorbridge.com', MARGIN + 10, curY + 40)
      .text('www.vendorbridge.com', MARGIN + 10, curY + 53)
      .text('GST: 27AABCV1234K1ZX', MARGIN + 10, curY + 66);

    // TO (Vendor)
    const toX = MARGIN + halfW + 20;
    drawRect(doc, toX, curY, halfW, 110, '#F9FAFB');
    drawLine(doc, toX, curY, toX + halfW, curY, '#10B981', 2);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#10B981').text('ISSUED TO', toX + 10, curY + 10);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(DARK_TEXT)
      .text(po.company_name, toX + 10, curY + 24, { width: halfW - 20 });
    doc.font('Helvetica').fontSize(8.5).fillColor(MID_TEXT);
    let ly = curY + 40;
    if (po.contact_person)  { doc.text(`Contact: ${po.contact_person}`, toX + 10, ly, { width: halfW - 20 }); ly += 13; }
    if (po.vendor_email)    { doc.text(po.vendor_email, toX + 10, ly, { width: halfW - 20 }); ly += 13; }
    if (po.vendor_phone)    { doc.text(po.vendor_phone, toX + 10, ly, { width: halfW - 20 }); ly += 13; }
    if (po.gst_number)      { doc.font('Helvetica-Bold').fontSize(8.5).fillColor(MID_TEXT).text(`GSTIN: ${po.gst_number}`, toX + 10, ly, { width: halfW - 20 }); }

    // ── ITEMS TABLE ────────────────────────────────────────────────────────
    curY += 126;
    drawRect(doc, MARGIN, curY, CONTENT_W, 26, BRAND_BLUE);
    const cols = [
      { label: '#',          x: MARGIN + 8,   w: 24 },
      { label: 'ITEM / DESCRIPTION', x: MARGIN + 36, w: 230 },
      { label: 'QTY',        x: MARGIN + 272, w: 60 },
      { label: 'DELIVERY',   x: MARGIN + 338, w: 80 },
      { label: 'WARRANTY',   x: MARGIN + 424, w: 80 },
      { label: 'AMOUNT',     x: MARGIN + 509, w: 46 },
    ];
    cols.forEach(c => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor('white')
        .text(c.label, c.x, curY + 9, { width: c.w });
    });
    curY += 26;

    // Row
    const rowH = 40;
    drawRect(doc, MARGIN, curY, CONTENT_W, rowH, '#FFFFFF');
    drawLine(doc, MARGIN, curY + rowH, MARGIN + CONTENT_W, curY + rowH, BORDER);

    doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_TEXT).text('1', cols[0].x, curY + 14, { width: cols[0].w });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_TEXT).text(po.rfq_title, cols[1].x, curY + 8, { width: cols[1].w });
    if (po.rfq_desc) {
      doc.font('Helvetica').fontSize(7.5).fillColor(LIGHT_TEXT)
        .text(po.rfq_desc.substring(0, 70) + (po.rfq_desc.length > 70 ? '...' : ''), cols[1].x, curY + 22, { width: cols[1].w });
    }
    doc.font('Helvetica').fontSize(9).fillColor(MID_TEXT)
      .text(String(po.quantity || 1), cols[2].x, curY + 14, { width: cols[2].w })
      .text(`${po.delivery_days} days`, cols[3].x, curY + 14, { width: cols[3].w })
      .text(po.warranty || 'N/A', cols[4].x, curY + 14, { width: cols[4].w });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_TEXT)
      .text(formatINR(po.price), cols[5].x - 10, curY + 14, { width: cols[5].w + 10, align: 'right' });
    curY += rowH;

    // Total band
    curY += 10;
    const totX = MARGIN + CONTENT_W - 200;
    drawRect(doc, totX, curY, 200, 36, BRAND_BLUE);
    doc.font('Helvetica-Bold').fontSize(13).fillColor('white')
      .text('ORDER VALUE', totX + 10, curY + 10, { width: 90 });
    doc.font('Helvetica-Bold').fontSize(13).fillColor('white')
      .text(formatINR(po.price), totX + 10, curY + 10, { width: 180, align: 'right' });
    curY += 36;

    // Notes
    if (po.quotation_notes) {
      curY += 16;
      drawRect(doc, MARGIN, curY, CONTENT_W, 36, '#FFFBEB');
      drawLine(doc, MARGIN, curY, MARGIN + CONTENT_W, curY, '#D97706', 2);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#92400E').text('VENDOR NOTES:', MARGIN + 10, curY + 8);
      doc.font('Helvetica').fontSize(8.5).fillColor('#78350F')
        .text(po.quotation_notes, MARGIN + 100, curY + 8, { width: CONTENT_W - 110 });
      curY += 36;
    }

    // Terms
    curY += 20;
    const halfT = (CONTENT_W - 16) / 2;
    drawRect(doc, MARGIN, curY, halfT, 70, '#F9FAFB');
    drawLine(doc, MARGIN, curY, MARGIN + halfT, curY, BRAND_BLUE, 2);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(BRAND_BLUE).text('TERMS & CONDITIONS', MARGIN + 10, curY + 8);
    doc.font('Helvetica').fontSize(8).fillColor(MID_TEXT)
      .text('• Goods to be delivered within agreed timeframe', MARGIN + 10, curY + 22)
      .text('• Quality must meet specifications in RFQ', MARGIN + 10, curY + 35)
      .text('• Invoice to be submitted after delivery', MARGIN + 10, curY + 48);

    const tx2 = MARGIN + halfT + 16;
    drawRect(doc, tx2, curY, halfT, 70, '#F9FAFB');
    drawLine(doc, tx2, curY, tx2 + halfT, curY, '#10B981', 2);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#10B981').text('AUTHORISED BY', tx2 + 10, curY + 8);
    doc.font('Helvetica').fontSize(8).fillColor(MID_TEXT)
      .text('VendorBridge Procurement Team', tx2 + 10, curY + 22)
      .text('This is a system-generated PO', tx2 + 10, curY + 35)
      .text('No physical signature required', tx2 + 10, curY + 48);

    // Footer
    const footerY = PAGE_H - 60;
    drawRect(doc, 0, footerY, PAGE_W, 60, BRAND_BLUE);
    drawLine(doc, 0, footerY, PAGE_W, footerY, BRAND_LIGHT, 1.5);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('white')
      .text('VendorBridge ERP — Procurement Management Platform', 0, footerY + 10, { width: PAGE_W, align: 'center' });
    doc.font('Helvetica').fontSize(7.5).fillColor('#BFDBFE')
      .text(`PO ${po.po_number}  |  Generated on ${new Date().toLocaleDateString('en-IN')}  |  Computer-generated document`,
        0, footerY + 26, { width: PAGE_W, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor('#93C5FD')
      .text('Page 1 of 1', 0, footerY + 42, { width: PAGE_W, align: 'center' });

    doc.end();
    await logActivity(req.user.id, `Downloaded PO PDF: ${po.po_number}`, 'po', po.id);
  } catch (error) {
    console.error('PO PDF error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPOs, getPOById, updatePOStatus, downloadPOPdf };
