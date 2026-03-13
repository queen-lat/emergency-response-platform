const express = require('express');
const router = express.Router();
const { register, login, refreshToken, getProfile, getAllUsers, updateRole } = require('../controllers/auth.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);

// Protected routes (require valid JWT)
router.get('/profile', verifyToken, getProfile);
router.get('/users', verifyToken, requireRole('system_admin'), getAllUsers);
router.put('/users/:id/role', verifyToken, requireRole('system_admin'), updateRole);

module.exports = router;
