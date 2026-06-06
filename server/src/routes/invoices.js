const express = require('express');
const router = express.Router();
const { getInvoices, generateInvoice, downloadInvoicePdf } = require('../controllers/invoiceController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, getInvoices);
router.post('/', authenticate, authorize('procurement_officer', 'admin'), generateInvoice);
router.get('/:id/pdf', authenticate, downloadInvoicePdf);

module.exports = router;
