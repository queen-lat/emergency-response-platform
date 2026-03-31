const Hospital = require('../models/hospital.model');

// ── POST /hospitals ───────────────────────────────────────────────────────
const registerHospital = async (req, res) => {
  try {
    const { hospital_id, name, latitude, longitude, total_beds, contact } = req.body;

    if (!hospital_id || !name || !latitude || !longitude) {
      return res.status(400).json({ message: 'hospital_id, name, latitude and longitude are required' });
    }

    const existing = await Hospital.findByPk(hospital_id);
    if (existing) return res.status(409).json({ message: 'Hospital already registered' });

    const hospital = await Hospital.create({
      hospital_id, name, latitude, longitude,
      total_beds: total_beds || 50,
      available_beds: total_beds || 50,
      contact,
    });

    return res.status(201).json(hospital);
  } catch (error) {
    console.error('Register hospital error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── GET /hospitals ────────────────────────────────────────────────────────
const getAllHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.findAll({ order: [['name', 'ASC']] });
    return res.status(200).json(hospitals);
  } catch (error) {
    console.error('Get hospitals error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── GET /hospitals/:id ────────────────────────────────────────────────────
const getHospitalById = async (req, res) => {
  try {
    const hospital = await Hospital.findByPk(req.params.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    return res.status(200).json(hospital);
  } catch (error) {
    console.error('Get hospital error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── PUT /hospitals/:id/capacity ───────────────────────────────────────────
const updateCapacity = async (req, res) => {
  try {
    const { available_beds, total_beds } = req.body;
    const hospital = await Hospital.findByPk(req.params.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const updates = {};
    if (available_beds !== undefined) updates.available_beds = available_beds;
    if (total_beds !== undefined) updates.total_beds = total_beds;

    await hospital.update(updates);
    return res.status(200).json({
      message: 'Capacity updated',
      hospitalId: req.params.id,
      available_beds: hospital.available_beds,
      total_beds: hospital.total_beds,
    });
  } catch (error) {
    console.error('Update capacity error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── PUT /hospitals/:id ────────────────────────────────────────────────────
const updateHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findByPk(req.params.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    await hospital.update(req.body);
    return res.status(200).json(hospital);
  } catch (error) {
    console.error('Update hospital error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { registerHospital, getAllHospitals, getHospitalById, updateCapacity, updateHospital };
