const express = require('express');
const router = express.Router();
const {
  registerVehicle, getAllVehicles, getVehicleById,
  getVehicleLocation, updateLocation, updateVehicleStatus,
  getLocationHistory, trackIncident,
} = require('../controllers/vehicle.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

const allAdmins = ['system_admin', 'hospital_admin', 'police_admin', 'fire_admin', 'ambulance_driver'];

router.use(verifyToken);

// Read routes — all roles
router.get('/vehicles', requireRole(allAdmins), getAllVehicles);
router.get('/vehicles/:id', requireRole(allAdmins), getVehicleById);
router.get('/vehicles/:id/location', requireRole(allAdmins), getVehicleLocation);
router.get('/vehicles/:id/history', requireRole(allAdmins), getLocationHistory);
router.get('/dispatch/:incidentId/track', requireRole(allAdmins), trackIncident);

// Write routes
router.post('/vehicles/register', requireRole(['system_admin', 'hospital_admin', 'police_admin', 'fire_admin']), registerVehicle);
router.post('/vehicles/:id/location', requireRole(allAdmins), updateLocation);
router.put('/vehicles/:id/status', requireRole(['system_admin', 'hospital_admin', 'police_admin', 'fire_admin']), updateVehicleStatus);

module.exports = router;