const express = require('express');
const router = express.Router();
const { getQuotations, submitQuotation, updateQuotation, selectQuotation } = require('../controllers/quotationController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, getQuotations);
router.post('/', authenticate, authorize('vendor'), submitQuotation);
router.put('/:id', authenticate, authorize('vendor'), updateQuotation);
router.post('/:id/select', authenticate, authorize('procurement_officer', 'admin'), selectQuotation);

module.exports = router;
