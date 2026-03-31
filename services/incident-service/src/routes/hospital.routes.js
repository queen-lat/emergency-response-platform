const express = require('express');
const router = express.Router();
const {
  registerHospital, getAllHospitals, getHospitalById,
  updateCapacity, updateHospital,
} = require('../controllers/hospital.controller');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

const allAdmins = ['system_admin', 'hospital_admin', 'police_admin', 'fire_admin', 'ambulance_driver'];

router.use(verifyToken);

// All admins can view hospitals
router.get('/', requireRole(allAdmins), getAllHospitals);
router.get('/:id', requireRole(allAdmins), getHospitalById);

// Only system_admin and hospital_admin can register/update
router.post('/', requireRole(['system_admin', 'hospital_admin']), registerHospital);
router.put('/:id', requireRole(['system_admin', 'hospital_admin']), updateHospital);
router.put('/:id/capacity', requireRole(['system_admin', 'hospital_admin']), updateCapacity);

module.exports = router;
