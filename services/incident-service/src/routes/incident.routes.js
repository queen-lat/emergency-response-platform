const express = require('express');
const router = express.Router();
const {
  createIncident, getAllIncidents, getOpenIncidents,
  getIncidentById, updateStatus, assignUnit,
} = require('../controllers/incident.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

const allAdmins = ['system_admin', 'hospital_admin', 'police_admin', 'fire_admin', 'ambulance_driver'];

// All routes require a valid JWT
router.use(verifyToken);

// Read routes — all admin roles can read
router.get('/', requireRole(allAdmins), getAllIncidents);
router.get('/open', requireRole(allAdmins), getOpenIncidents);
router.get('/:id', requireRole(allAdmins), getIncidentById);

// Write routes — only system_admin can create/modify
router.post('/', requireRole('system_admin'), createIncident);
router.put('/:id/status', requireRole(allAdmins), updateStatus);
router.put('/:id/assign', requireRole('system_admin'), assignUnit);

module.exports = router;