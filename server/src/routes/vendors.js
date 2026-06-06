const express = require('express');
const router = express.Router();
const {
  getVendors, getVendorById, createVendor,
  updateVendor, toggleVendorStatus, deleteVendor, getVendorStats
} = require('../controllers/vendorController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, getVendors);
router.get('/stats', authenticate, getVendorStats);
router.get('/:id', authenticate, getVendorById);
router.post('/', authenticate, authorize('admin'), createVendor);
router.put('/:id', authenticate, authorize('admin', 'procurement_officer'), updateVendor);
router.patch('/:id/status', authenticate, authorize('admin'), toggleVendorStatus);
router.delete('/:id', authenticate, authorize('admin'), deleteVendor);

module.exports = router;
