const express = require('express');
const router = express.Router();
const {
  register, login, getProfile,
  changePassword, adminResetPassword,
  getUsers, updateUser, deleteUser,
} = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/login', login);
router.get('/profile', authenticate, getProfile);
router.put('/change-password', authenticate, changePassword);

// Admin only
router.post('/register', authenticate, authorize('admin'), register);
router.get('/users', authenticate, authorize('admin'), getUsers);
router.put('/users/:id', authenticate, authorize('admin'), updateUser);
router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
router.put('/users/:id/reset-password', authenticate, authorize('admin'), adminResetPassword);

module.exports = router;
