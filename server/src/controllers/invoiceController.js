const { pool } = require('../config/database');
const PDFDocument = require('pdfkit');
const { logActivity } = require('../utils/logger');

const getInvoices = async (req, res) => {
  try {
    const [invoices] = await pool.query(
      `SELECT i.*, po.po_number, v.company_name, v.gst_number, v.email as vendor_email,
       v.phone as vendor_phone, v.address as vendor_address,
       r.title as rfq_title, r.quantity, r.description as rfq_description
      FROM invoices i
      JOIN purchase_orders po ON i.po_id = po.id
      JOIN vendors v ON po.vendor_id = v.id
      JOIN quotations q ON po.quotation_id = q.id
      JOIN rfqs r ON q.rfq_id = r.id
      ORDER BY i.created_at DESC`
    );
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const generateInvoice = async (req, res) => {
  try {
    const { po_id, tax } = req.body;
    const [pos] = await pool.query(
      `SELECT po.*, q.price, q.delivery_days, r.quantity, r.title as rfq_title
       FROM purchase_orders po
       JOIN quotations q ON po.quotation_id = q.id
       JOIN rfqs r ON q.rfq_id = r.id
       WHERE po.id = ?`,
      [po_id]
    );
    if (!pos.length) return res.status(404).json({ message: 'PO not found' });

    // Check invoice not already generated for this PO
    const [existing] = await pool.query('SELECT id FROM invoices WHERE po_id = ?', [po_id]);
    if (existing.length) return res.status(400).json({ message: 'Invoice already generated for this PO' });

    const po = pos[0];
    const subtotal = Number(po.price);
    const taxRate = Number(tax) || 18;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    const year = new Date().getFullYear();
    const [lastInv] = await pool.query('SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1');
    let invNum = 1;
    if (lastInv.length) {
      const parts = lastInv[0].invoice_number.split('-');
      invNum = (parseInt(parts[2]) || 0) + 1;
    }
    const invoiceNumber = `INV-${year}-${String(invNum).padStart(3, '0')}`;

    const [result] = await pool.query(
      'INSERT INTO invoices (invoice_number, po_id, subtotal, tax, total, status) VALUES (?, ?, ?, ?, ?, "generated")',
      [invoiceNumber, po_id, subtotal, taxRate, total]
    );

    await logActivity(req.user.id, `Generated invoice: ${invoiceNumber}`, 'invoice', result.insertId);
    res.status(201).json({ message: 'Invoice generated', invoice_number: invoiceNumber, id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Helper drawing functions ───────────────────────────────────────────────

const BRAND_BLUE   = '#1E40AF';   // deep blue
const BRAND_LIGHT  = '#3B82F6';   // medium blue
const ACCENT       = '#DBEAFE';   // light blue fill
const DARK_TEXT    = '#111827';
const MID_TEXT     = '#374151';
const LIGHT_TEXT   = '#6B7280';
const BORDER       = '#E5E7EB';
const GREEN        = '#065F46';
const GREEN_BG     = '#D1FAE5';

function formatINR(amount) {
  return `Rs. ${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function drawRect(doc, x, y, w, h, color) {
  doc.save().rect(x, y, w, h).fill(color).restore();
}

function drawLine(doc, x1, y1, x2, y2, color = BORDER, width = 0.5) {
  doc.save().strokeColor(color).lineWidth(width).moveTo(x1, y1).lineTo(x2, y2).stroke().restore();
}

function labelValue(doc, x, y, label, value, labelColor = LIGHT_TEXT, valueColor = DARK_TEXT) {
  doc.font('Helvetica').fontSize(8).fillColor(labelColor).text(label, x, y);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(valueColor).text(value, x, y + 12);
}

function sectionHeader(doc, x, y, w, label) {
  drawRect(doc, x, y, w, 22, BRAND_BLUE);
  doc.font('Helvetica-Bold').fontSize(9).fillColor('white').text(label, x + 10, y + 7);
  return y + 22;
}

// ────────────────────────────────────────────────────────────────────────────

const downloadInvoicePdf = async (req, res) => {
  try {
    const [invoices] = await pool.query(
      `SELECT i.*, po.po_number,
       v.company_name, v.gst_number, v.email as vendor_email,
       v.phone as vendor_phone, v.address as vendor_address,
       v.contact_person,
       r.title as rfq_title, r.quantity, r.description as rfq_desc,
       q.delivery_days, q.warranty
      FROM invoices i
      JOIN purchase_orders po ON i.po_id = po.id
      JOIN vendors v ON po.vendor_id = v.id
      JOIN quotations q ON po.quotation_id = q.id
      JOIN rfqs r ON q.rfq_id = r.id
      WHERE i.id = ?`,
      [req.params.id]
    );
    if (!invoices.length) return res.status(404).json({ message: 'Invoice not found' });
    const inv = invoices[0];

    const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: inv.invoice_number, Author: 'VendorBridge' } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${inv.invoice_number}.pdf`);
    doc.pipe(res);

    const PAGE_W = 595;
    const PAGE_H = 842;
    const MARGIN = 40;
    const CONTENT_W = PAGE_W - MARGIN * 2;

    // ── 1. HEADER BAND ─────────────────────────────────────────────────────
    drawRect(doc, 0, 0, PAGE_W, 100, BRAND_BLUE);

    // Logo circle
    doc.save()
      .circle(MARGIN + 26, 50, 26)
      .fill('white');
    doc.font('Helvetica-Bold').fontSize(16).fillColor(BRAND_BLUE)
      .text('VB', MARGIN + 15, 42);

    // Company name
    doc.font('Helvetica-Bold').fontSize(22).fillColor('white')
      .text('VendorBridge', MARGIN + 62, 30);
    doc.font('Helvetica').fontSize(9).fillColor('#BFDBFE')
      .text('ERP Procurement Platform', MARGIN + 62, 56);

    // TAX INVOICE label (right side)
    drawRect(doc, PAGE_W - 160, 24, 120, 52, 'rgba(255,255,255,0.15)');
    doc.font('Helvetica-Bold').fontSize(15).fillColor('white')
      .text('TAX INVOICE', PAGE_W - 152, 35, { width: 104, align: 'center' });
    doc.font('Helvetica').fontSize(8).fillColor('#BFDBFE')
      .text('ORIGINAL', PAGE_W - 152, 56, { width: 104, align: 'center' });

    // ── 2. INVOICE META BAND ───────────────────────────────────────────────
    drawRect(doc, 0, 100, PAGE_W, 56, ACCENT);
    drawLine(doc, 0, 156, PAGE_W, 156, BRAND_LIGHT, 1.5);

    const invDate = new Date(inv.created_at);
    const dueDate = new Date(invDate);
    dueDate.setDate(dueDate.getDate() + 30);
    const fmt = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const metaBoxW = CONTENT_W / 4;
    const metaItems = [
      { label: 'INVOICE NUMBER', value: inv.invoice_number },
      { label: 'INVOICE DATE',   value: fmt(invDate) },
      { label: 'DUE DATE',       value: fmt(dueDate) },
      { label: 'PO REFERENCE',   value: inv.po_number },
    ];
    metaItems.forEach((item, i) => {
      const x = MARGIN + i * metaBoxW;
      if (i > 0) drawLine(doc, x, 108, x, 150, BRAND_LIGHT, 0.5);
      doc.font('Helvetica').fontSize(7).fillColor(BRAND_BLUE)
        .text(item.label, x + 4, 112, { width: metaBoxW - 8 });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK_TEXT)
        .text(item.value, x + 4, 126, { width: metaBoxW - 8 });
    });

    // ── 3. BILL FROM / BILL TO ─────────────────────────────────────────────
    let curY = 176;

    const halfW = (CONTENT_W - 20) / 2;

    // FROM box (VendorBridge)
    drawRect(doc, MARGIN, curY, halfW, 110, '#F9FAFB');
    drawLine(doc, MARGIN, curY, MARGIN + halfW, curY, BRAND_BLUE, 2);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(BRAND_BLUE)
      .text('BILLED BY', MARGIN + 10, curY + 10);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(DARK_TEXT)
      .text('VendorBridge Pvt. Ltd.', MARGIN + 10, curY + 24);
    doc.font('Helvetica').fontSize(8.5).fillColor(MID_TEXT)
      .text('ERP Procurement Platform', MARGIN + 10, curY + 40)
      .text('procurement@vendorbridge.com', MARGIN + 10, curY + 53)
      .text('www.vendorbridge.com', MARGIN + 10, curY + 66)
      .text('GST: 27AABCV1234K1ZX', MARGIN + 10, curY + 79);

    // TO box (Vendor)
    const toX = MARGIN + halfW + 20;
    drawRect(doc, toX, curY, halfW, 110, '#F9FAFB');
    drawLine(doc, toX, curY, toX + halfW, curY, '#10B981', 2);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#10B981')
      .text('BILLED TO', toX + 10, curY + 10);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(DARK_TEXT)
      .text(inv.company_name, toX + 10, curY + 24, { width: halfW - 20 });
    doc.font('Helvetica').fontSize(8.5).fillColor(MID_TEXT);
    let toLineY = curY + 40;
    if (inv.contact_person) {
      doc.text(`Contact: ${inv.contact_person}`, toX + 10, toLineY, { width: halfW - 20 });
      toLineY += 13;
    }
    if (inv.vendor_email) {
      doc.text(inv.vendor_email, toX + 10, toLineY, { width: halfW - 20 });
      toLineY += 13;
    }
    if (inv.vendor_phone) {
      doc.text(inv.vendor_phone, toX + 10, toLineY, { width: halfW - 20 });
      toLineY += 13;
    }
    if (inv.gst_number) {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(MID_TEXT)
        .text(`GSTIN: ${inv.gst_number}`, toX + 10, toLineY, { width: halfW - 20 });
    }

    // ── 4. LINE ITEMS TABLE ────────────────────────────────────────────────
    curY += 126;

    // Table header
    drawRect(doc, MARGIN, curY, CONTENT_W, 26, BRAND_BLUE);
    const cols = [
      { label: '#',          x: MARGIN + 8,   w: 24 },
      { label: 'DESCRIPTION',x: MARGIN + 36,  w: 210 },
      { label: 'PO REF',     x: MARGIN + 254, w: 90 },
      { label: 'QTY',        x: MARGIN + 350, w: 50 },
      { label: 'RATE (Rs.)', x: MARGIN + 405, w: 85 },
      { label: 'AMOUNT',     x: MARGIN + 494, w: 60 },
    ];
    cols.forEach(col => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor('white')
        .text(col.label, col.x, curY + 9, { width: col.w, align: col.label === '#' || col.label === 'QTY' ? 'center' : 'left' });
    });
    curY += 26;

    // Row 1
    const rowH = 36;
    drawRect(doc, MARGIN, curY, CONTENT_W, rowH, '#FFFFFF');
    drawLine(doc, MARGIN, curY + rowH, MARGIN + CONTENT_W, curY + rowH, BORDER);

    const unitPrice = Number(inv.subtotal);
    const qty = Number(inv.quantity) || 1;

    doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_TEXT)
      .text('1', cols[0].x, curY + 12, { width: cols[0].w, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_TEXT)
      .text(inv.rfq_title, cols[1].x, curY + 8, { width: cols[1].w });
    if (inv.rfq_desc) {
      doc.font('Helvetica').fontSize(7.5).fillColor(LIGHT_TEXT)
        .text(inv.rfq_desc.substring(0, 60) + (inv.rfq_desc.length > 60 ? '...' : ''), cols[1].x, curY + 21, { width: cols[1].w });
    }
    doc.font('Helvetica').fontSize(9).fillColor(MID_TEXT)
      .text(inv.po_number, cols[2].x, curY + 12, { width: cols[2].w });
    doc.font('Helvetica').fontSize(9).fillColor(MID_TEXT)
      .text(String(qty), cols[3].x, curY + 12, { width: cols[3].w, align: 'center' });
    doc.font('Helvetica').fontSize(9).fillColor(MID_TEXT)
      .text(formatINR(unitPrice), cols[4].x, curY + 12, { width: cols[4].w });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(DARK_TEXT)
      .text(formatINR(unitPrice), cols[5].x, curY + 12, { width: cols[5].w });

    // Delivery info row
    curY += rowH;
    drawRect(doc, MARGIN, curY, CONTENT_W, 22, '#F9FAFB');
    drawLine(doc, MARGIN, curY + 22, MARGIN + CONTENT_W, curY + 22, BORDER);
    doc.font('Helvetica').fontSize(7.5).fillColor(LIGHT_TEXT)
      .text(`Delivery: ${inv.delivery_days || 'N/A'} days  |  Warranty: ${inv.warranty || 'N/A'}`,
        MARGIN + 36, curY + 7);
    curY += 22;

    // ── 5. TOTALS SECTION ──────────────────────────────────────────────────
    curY += 16;
    const totalsX = MARGIN + CONTENT_W - 220;
    const totalsW = 220;
    const taxAmt = (unitPrice * Number(inv.tax)) / 100;
    const totalAmt = Number(inv.total);

    // Subtotal row
    drawRect(doc, totalsX, curY, totalsW, 26, '#F9FAFB');
    doc.font('Helvetica').fontSize(9.5).fillColor(MID_TEXT)
      .text('Subtotal', totalsX + 10, curY + 8, { width: 100 });
    doc.font('Helvetica').fontSize(9.5).fillColor(DARK_TEXT)
      .text(formatINR(unitPrice), totalsX + 10, curY + 8, { width: totalsW - 20, align: 'right' });
    curY += 26;

    // GST row
    drawRect(doc, totalsX, curY, totalsW, 26, '#F9FAFB');
    drawLine(doc, totalsX, curY, totalsX + totalsW, curY, BORDER);
    doc.font('Helvetica').fontSize(9.5).fillColor(MID_TEXT)
      .text(`GST @ ${inv.tax}%`, totalsX + 10, curY + 8, { width: 100 });
    doc.font('Helvetica').fontSize(9.5).fillColor(MID_TEXT)
      .text(formatINR(taxAmt), totalsX + 10, curY + 8, { width: totalsW - 20, align: 'right' });
    curY += 26;

    // CGST / SGST breakdown (half each)
    const halfTax = taxAmt / 2;
    [
      { label: `CGST @ ${inv.tax / 2}%`, value: halfTax },
      { label: `SGST @ ${inv.tax / 2}%`, value: halfTax },
    ].forEach(item => {
      drawRect(doc, totalsX, curY, totalsW, 22, '#FAFAFA');
      drawLine(doc, totalsX, curY, totalsX + totalsW, curY, BORDER);
      doc.font('Helvetica').fontSize(8.5).fillColor(LIGHT_TEXT)
        .text(item.label, totalsX + 20, curY + 7, { width: 100 });
      doc.font('Helvetica').fontSize(8.5).fillColor(LIGHT_TEXT)
        .text(formatINR(item.value), totalsX + 10, curY + 7, { width: totalsW - 20, align: 'right' });
      curY += 22;
    });

    // TOTAL row — highlighted
    drawRect(doc, totalsX, curY, totalsW, 36, BRAND_BLUE);
    doc.font('Helvetica-Bold').fontSize(13).fillColor('white')
      .text('TOTAL AMOUNT', totalsX + 10, curY + 10, { width: 110 });
    doc.font('Helvetica-Bold').fontSize(13).fillColor('white')
      .text(formatINR(totalAmt), totalsX + 10, curY + 10, { width: totalsW - 20, align: 'right' });
    curY += 36;

    // Amount in words
    curY += 10;
    drawRect(doc, MARGIN, curY, CONTENT_W, 26, GREEN_BG);
    drawLine(doc, MARGIN, curY, MARGIN + CONTENT_W, curY, '#10B981', 1);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(GREEN)
      .text('AMOUNT IN WORDS:', MARGIN + 10, curY + 8);
    doc.font('Helvetica').fontSize(8).fillColor(GREEN)
      .text(numberToWords(totalAmt) + ' Only', MARGIN + 120, curY + 8, { width: CONTENT_W - 130 });
    curY += 26;

    // ── 6. PAYMENT & NOTES ─────────────────────────────────────────────────
    curY += 20;
    const notesHalfW = (CONTENT_W - 16) / 2;

    // Payment terms
    drawRect(doc, MARGIN, curY, notesHalfW, 70, '#F9FAFB');
    drawLine(doc, MARGIN, curY, MARGIN + notesHalfW, curY, BRAND_BLUE, 2);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(BRAND_BLUE).text('PAYMENT TERMS', MARGIN + 10, curY + 8);
    doc.font('Helvetica').fontSize(8.5).fillColor(MID_TEXT)
      .text('• Payment due within 30 days of invoice date', MARGIN + 10, curY + 22)
      .text('• Bank transfer to VendorBridge account', MARGIN + 10, curY + 35)
      .text('• Quote invoice number in transfer reference', MARGIN + 10, curY + 48);

    // Notes
    const notesX2 = MARGIN + notesHalfW + 16;
    drawRect(doc, notesX2, curY, notesHalfW, 70, '#F9FAFB');
    drawLine(doc, notesX2, curY, notesX2 + notesHalfW, curY, '#10B981', 2);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#10B981').text('NOTES', notesX2 + 10, curY + 8);
    doc.font('Helvetica').fontSize(8.5).fillColor(MID_TEXT)
      .text('• All prices are inclusive of applicable taxes', notesX2 + 10, curY + 22)
      .text('• This is a system-generated invoice', notesX2 + 10, curY + 35)
      .text('• For queries: support@vendorbridge.com', notesX2 + 10, curY + 48);

    // ── 7. FOOTER ──────────────────────────────────────────────────────────
    const footerY = PAGE_H - 60;
    drawRect(doc, 0, footerY, PAGE_W, 60, BRAND_BLUE);
    drawLine(doc, 0, footerY, PAGE_W, footerY, BRAND_LIGHT, 1.5);

    doc.font('Helvetica-Bold').fontSize(9).fillColor('white')
      .text('VendorBridge ERP — Procurement Management Platform', 0, footerY + 10, { width: PAGE_W, align: 'center' });
    doc.font('Helvetica').fontSize(7.5).fillColor('#BFDBFE')
      .text(`Invoice ${inv.invoice_number}  |  Generated on ${new Date().toLocaleDateString('en-IN')}  |  This is a computer-generated document`,
        0, footerY + 26, { width: PAGE_W, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor('#93C5FD')
      .text('Page 1 of 1', 0, footerY + 42, { width: PAGE_W, align: 'center' });

    doc.end();

    await logActivity(req.user.id, `Downloaded invoice PDF: ${inv.invoice_number}`, 'invoice', inv.id);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ── Simple number to words converter (Indian system) ──────────────────────
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  let result = convert(intPart) || 'Zero';
  result += ' Rupees';
  if (decPart > 0) result += ' and ' + convert(decPart) + ' Paise';
  return result;
}

module.exports = { getInvoices, generateInvoice, downloadInvoicePdf };
