const express = require('express');
const router = express.Router();
const { getRFQs, getRFQById, createRFQ, updateRFQ, deleteRFQ } = require('../controllers/rfqController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, getRFQs);
router.get('/:id', authenticate, getRFQById);
router.post('/', authenticate, authorize('procurement_officer', 'admin'), createRFQ);
router.put('/:id', authenticate, authorize('procurement_officer', 'admin'), updateRFQ);
router.delete('/:id', authenticate, authorize('procurement_officer', 'admin'), deleteRFQ);

module.exports = router;
