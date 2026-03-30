const axios = require('axios');
const Incident = require('../models/incident.model');
const Hospital = require('../models/hospital.model');
const { publishEvent } = require('../config/queue');

// ── Haversine distance formula (returns km) ───────────────────────────────
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── Map incident type to responder type ──────────────────────────────────
const getResponderType = (incidentType) => {
  const type = incidentType.toLowerCase();
  if (['fire', 'explosion', 'gas leak'].includes(type)) return 'fire';
  if (['medical emergency', 'accident', 'injury'].includes(type)) return 'ambulance';
  return 'police';
};

// ── Vehicle type map ─────────────────────────────────────────────────────
const vehicleTypeMap = {
  fire: 'fire_truck',
  police: 'police_car',
  ambulance: 'ambulance',
};

// ── Generate incident ID ──────────────────────────────────────────────────
const generateIncidentId = () => {
  const year = new Date().getFullYear();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `INC-${year}-${num}`;
};

// ── Generate service token for inter-service calls ────────────────────────
const getServiceToken = () => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId: 'incident-service', email: 'service@internal', role: 'system_admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1m' }
  );
};

// ── Find nearest available unit from dispatch service ────────────────────
const findNearestUnit = async (latitude, longitude, unitType) => {
  try {
    const dispatchUrl = process.env.DISPATCH_SERVICE_URL || 'http://localhost:3003';
    const vehicleType = vehicleTypeMap[unitType];
    const response = await axios.get(`${dispatchUrl}/vehicles`, {
      params: { status: 'available', type: vehicleType },
      headers: { Authorization: `Bearer ${getServiceToken()}` },
    });

    const vehicles = response.data;
    if (!vehicles || vehicles.length === 0) return null;

    const withDistance = vehicles.map((v) => ({
      ...v,
      distanceKm: haversineKm(latitude, longitude, parseFloat(v.latitude), parseFloat(v.longitude)),
    }));

    withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
    return withDistance[0];
  } catch (error) {
    console.warn('Could not reach dispatch service:', error.message);
    return null;
  }
};

// ── Find nearest hospital with available beds ────────────────────────────
const findNearestHospital = async (latitude, longitude) => {
  try {
    const hospitals = await Hospital.findAll({
      where: { available_beds: { [require('sequelize').Op.gt]: 0 } },
    });

    if (!hospitals || hospitals.length === 0) return null;

    const withDistance = hospitals.map((h) => ({
      ...h.dataValues,
      distanceKm: haversineKm(latitude, longitude, parseFloat(h.latitude), parseFloat(h.longitude)),
    }));

    withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
    return withDistance[0];
  } catch (error) {
    console.warn('Could not find hospital:', error.message);
    return null;
  }
};

// ── POST /incidents ───────────────────────────────────────────────────────
const createIncident = async (req, res) => {
  try {
    const { citizen_name, citizen_phone, incident_type, latitude, longitude, notes } = req.body;

    if (!citizen_name || !incident_type || !latitude || !longitude) {
      return res.status(400).json({ message: 'citizen_name, incident_type, latitude and longitude are required' });
    }

    const incident_id = generateIncidentId();
    const responderType = getResponderType(incident_type);
    const isMedical = responderType === 'ambulance';

    // Save incident with status 'created'
    const incident = await Incident.create({
      incident_id,
      citizen_name,
      citizen_phone,
      incident_type,
      latitude,
      longitude,
      notes,
      created_by: req.user.userId,
      status: 'created',
    });

    // Find nearest available unit
    const nearestUnit = await findNearestUnit(latitude, longitude, responderType);

    // For medical emergencies, also find nearest hospital with available beds
    let nearestHospital = null;
    if (isMedical) {
      nearestHospital = await findNearestHospital(latitude, longitude);

      // Reserve a bed at the hospital
      if (nearestHospital) {
        await Hospital.update(
          { available_beds: nearestHospital.available_beds - 1 },
          { where: { hospital_id: nearestHospital.hospital_id } }
        );
      }
    }

    if (nearestUnit) {
      await incident.update({
        assigned_unit_id: nearestUnit.vehicle_id,
        assigned_unit_type: responderType,
        assigned_hospital: nearestHospital ? nearestHospital.hospital_id : null,
        status: 'dispatched',
        dispatched_at: new Date(),
      });

      // Publish events to RabbitMQ
      await publishEvent('incident.created', {
        incidentId: incident_id,
        incidentType: incident_type,
        latitude,
        longitude,
        assignedUnitId: nearestUnit.vehicle_id,
        assignedUnitType: responderType,
        assignedHospital: nearestHospital ? nearestHospital.hospital_id : null,
        createdBy: req.user.userId,
      });

      await publishEvent('unit.dispatched', {
        incidentId: incident_id,
        unitId: nearestUnit.vehicle_id,
        unitType: responderType,
        dispatchedAt: new Date().toISOString(),
      });

      const responseData = {
        incidentId: incident_id,
        status: 'dispatched',
        assignedUnit: {
          type: responderType,
          id: nearestUnit.vehicle_id,
          stationId: nearestUnit.station_id,
          distanceKm: nearestUnit.distanceKm.toFixed(2),
        },
        dispatchedAt: incident.dispatched_at,
      };

      // Include hospital info for medical emergencies
      if (isMedical && nearestHospital) {
        responseData.receivingHospital = {
          id: nearestHospital.hospital_id,
          name: nearestHospital.name,
          availableBeds: nearestHospital.available_beds - 1,
          distanceKm: nearestHospital.distanceKm.toFixed(2),
        };
      } else if (isMedical && !nearestHospital) {
        responseData.hospitalWarning = 'No hospital with available beds found nearby';
      }

      return res.status(201).json(responseData);
    }

    // No unit available
    return res.status(201).json({
      incidentId: incident_id,
      status: 'created',
      message: 'Incident logged. No available unit found at this time.',
    });

  } catch (error) {
    console.error('Create incident error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── GET /incidents ────────────────────────────────────────────────────────
const getAllIncidents = async (req, res) => {
  try {
    const { status, incident_type } = req.query;
    const where = {};
    if (status) where.status = status;
    if (incident_type) where.incident_type = incident_type;

    const incidents = await Incident.findAll({
      where,
      order: [['created_at', 'DESC']],
    });
    return res.status(200).json(incidents);
  } catch (error) {
    console.error('Get incidents error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── GET /incidents/open ───────────────────────────────────────────────────
const getOpenIncidents = async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const incidents = await Incident.findAll({
      where: { status: { [Op.ne]: 'resolved' } },
      order: [['created_at', 'DESC']],
    });
    return res.status(200).json(incidents);
  } catch (error) {
    console.error('Get open incidents error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── GET /incidents/:id ────────────────────────────────────────────────────
const getIncidentById = async (req, res) => {
  try {
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    return res.status(200).json(incident);
  } catch (error) {
    console.error('Get incident error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── PUT /incidents/:id/status ─────────────────────────────────────────────
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['created', 'dispatched', 'in_progress', 'resolved'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });

    const updates = { status };
    if (status === 'resolved') {
      updates.resolved_at = new Date();

      const createdAt = new Date(incident.created_at);
      const responseTimeSeconds = Math.floor((new Date() - createdAt) / 1000);

      await publishEvent('incident.resolved', {
        incidentId: incident.incident_id,
        resolvedBy: req.user.userId,
        resolvedAt: new Date().toISOString(),
        responseTimeSeconds,
        incidentType: incident.incident_type,
      });

      // Free up hospital bed when medical incident resolved
      if (incident.assigned_hospital) {
        try {
          await Hospital.increment('available_beds', {
            where: { hospital_id: incident.assigned_hospital }
          });
        } catch (err) {
          console.warn('Could not free hospital bed:', err.message);
        }
      }
    }

    await incident.update(updates);

    // Sync vehicle status
    if (incident.assigned_unit_id) {
      try {
        const dispatchUrl = process.env.DISPATCH_SERVICE_URL || 'http://localhost:3003';
        const vehicleStatus = {
          'in_progress': 'en_route',
          'resolved': 'available',
          'dispatched': 'dispatched',
        }[status];

        if (vehicleStatus) {
          await axios.put(
            `${dispatchUrl}/vehicles/${incident.assigned_unit_id}/status`,
            { status: vehicleStatus },
            { headers: { Authorization: `Bearer ${getServiceToken()}` } }
          );
        }
      } catch (err) {
        console.warn('Could not update vehicle status:', err.message);
      }
    }

    return res.status(200).json({ message: 'Status updated', incidentId: req.params.id, status });
  } catch (error) {
    console.error('Update status error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── PUT /incidents/:id/assign ─────────────────────────────────────────────
const assignUnit = async (req, res) => {
  try {
    const { assigned_unit_id, assigned_unit_type } = req.body;
    const incident = await Incident.findByPk(req.params.id);
    if (!incident) return res.status(404).json({ message: 'Incident not found' });

    await incident.update({
      assigned_unit_id,
      assigned_unit_type,
      status: 'dispatched',
      dispatched_at: new Date(),
    });

    return res.status(200).json({ message: 'Unit assigned', incidentId: req.params.id, assigned_unit_id });
  } catch (error) {
    console.error('Assign unit error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createIncident, getAllIncidents, getOpenIncidents, getIncidentById, updateStatus, assignUnit };
