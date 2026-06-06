const nodemailer = require('nodemailer');
require('dotenv').config();

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('[Email skipped - no credentials configured]:', subject, '->', to);
    return { messageId: 'skipped' };
  }
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: `"VendorBridge" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
  return info;
};

const emailTemplates = {
  rfqAssigned: (vendorName, rfqTitle, deadline) => ({
    subject: `New RFQ Assigned: ${rfqTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
        <div style="background:#2563eb;padding:20px;border-radius:6px 6px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">VendorBridge</h1>
        </div>
        <div style="padding:24px;">
          <p>Dear <strong>${vendorName}</strong>,</p>
          <p>You have been invited to submit a quotation for the following RFQ:</p>
          <div style="background:#f3f4f6;padding:16px;border-radius:6px;margin:16px 0;">
            <h3 style="margin:0 0 8px 0;color:#1f2937;">${rfqTitle}</h3>
            <p style="margin:0;color:#6b7280;">Deadline: <strong>${deadline}</strong></p>
          </div>
          <p>Please log in to VendorBridge to view the full details and submit your quotation.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/rfqs" 
               style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">
              View RFQ & Submit Quotation
            </a>
          </div>
        </div>
        <div style="padding:12px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:12px;">
          VendorBridge ERP — Automated notification
        </div>
      </div>
    `,
  }),

  quotationApproved: (vendorName, poNumber, rfqTitle) => ({
    subject: `Quotation Approved — PO ${poNumber} Generated`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
        <div style="background:#059669;padding:20px;border-radius:6px 6px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">VendorBridge</h1>
        </div>
        <div style="padding:24px;">
          <p>Dear <strong>${vendorName}</strong>,</p>
          <p style="color:#059669;font-weight:bold;font-size:16px;">🎉 Your quotation has been approved!</p>
          <div style="background:#ecfdf5;padding:16px;border-radius:6px;margin:16px 0;border-left:4px solid #059669;">
            <p style="margin:0;"><strong>RFQ:</strong> ${rfqTitle}</p>
            <p style="margin:8px 0 0 0;"><strong>Purchase Order:</strong> ${poNumber}</p>
          </div>
          <p>A Purchase Order has been generated. Please log in to view and download it.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/purchase-orders" 
               style="background:#059669;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">
              View Purchase Order
            </a>
          </div>
        </div>
        <div style="padding:12px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:12px;">
          VendorBridge ERP — Automated notification
        </div>
      </div>
    `,
  }),

  approvalRequired: (managerName, rfqTitle, vendorName, price) => ({
    subject: `Approval Required: ${rfqTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
        <div style="background:#d97706;padding:20px;border-radius:6px 6px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">VendorBridge</h1>
        </div>
        <div style="padding:24px;">
          <p>Dear <strong>${managerName}</strong>,</p>
          <p>A quotation is pending your approval:</p>
          <div style="background:#fffbeb;padding:16px;border-radius:6px;margin:16px 0;border-left:4px solid #d97706;">
            <p style="margin:0;"><strong>RFQ:</strong> ${rfqTitle}</p>
            <p style="margin:8px 0 0 0;"><strong>Vendor:</strong> ${vendorName}</p>
            <p style="margin:8px 0 0 0;"><strong>Price:</strong> ₹${Number(price).toLocaleString('en-IN')}</p>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/approvals" 
               style="background:#d97706;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">
              Review & Approve
            </a>
          </div>
        </div>
        <div style="padding:12px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:12px;">
          VendorBridge ERP — Automated notification
        </div>
      </div>
    `,
  }),

  invoiceGenerated: (vendorName, invoiceNumber, total) => ({
    subject: `Invoice Generated: ${invoiceNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
        <div style="background:#7c3aed;padding:20px;border-radius:6px 6px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">VendorBridge</h1>
        </div>
        <div style="padding:24px;">
          <p>Dear <strong>${vendorName}</strong>,</p>
          <p>An invoice has been generated for your records:</p>
          <div style="background:#f5f3ff;padding:16px;border-radius:6px;margin:16px 0;border-left:4px solid #7c3aed;">
            <p style="margin:0;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
            <p style="margin:8px 0 0 0;"><strong>Total Amount:</strong> ₹${Number(total).toLocaleString('en-IN')}</p>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/invoices" 
               style="background:#7c3aed;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">
              View Invoice
            </a>
          </div>
        </div>
        <div style="padding:12px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:12px;">
          VendorBridge ERP — Automated notification
        </div>
      </div>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };
