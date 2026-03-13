const express = require('express');
const router = express.Router();
const {
  createIncident,
  getAllIncidents,
  getOpenIncidents,
  getIncidentById,
  updateStatus,
  assignUnit,
} = require('../controllers/incident.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

// All incident routes require a valid JWT and system_admin role
router.use(verifyToken);
router.use(requireRole('system_admin'));

router.post('/', createIncident);
router.get('/', getAllIncidents);
router.get('/open', getOpenIncidents);
router.get('/:id', getIncidentById);
router.put('/:id/status', updateStatus);
router.put('/:id/assign', assignUnit);

module.exports = router;
