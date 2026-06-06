const express = require('express');
const router = express.Router();
const { getPOs, getPOById, updatePOStatus, downloadPOPdf } = require('../controllers/poController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, getPOs);
router.get('/:id', authenticate, getPOById);
router.patch('/:id/status', authenticate, authorize('admin', 'procurement_officer'), updatePOStatus);
router.get('/:id/pdf', authenticate, downloadPOPdf);

module.exports = router;
