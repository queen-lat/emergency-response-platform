const express = require('express');
const router = express.Router();

// TODO: implement controllers
router.post('/register', (req, res) => res.status(501).json({ message: 'Not implemented yet' }));
router.post('/login', (req, res) => res.status(501).json({ message: 'Not implemented yet' }));
router.post('/refresh-token', (req, res) => res.status(501).json({ message: 'Not implemented yet' }));
router.get('/profile', (req, res) => res.status(501).json({ message: 'Not implemented yet' }));

module.exports = router;
