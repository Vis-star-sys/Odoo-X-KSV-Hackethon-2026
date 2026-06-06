const express = require('express');
const router = express.Router();
const { getApprovals, approveReject } = require('../controllers/approvalController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, getApprovals);
router.put('/:id', authenticate, authorize('manager'), approveReject);

module.exports = router;
