const axios = require('axios');
const Incident = require('../models/incident.model');
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
  return 'police'; // default: robbery, crime, assault, theft, etc.
};

// ── Generate incident ID ──────────────────────────────────────────────────
const generateIncidentId = () => {
  const year = new Date().getFullYear();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `INC-${year}-${num}`;
};

// ── Find nearest available unit from dispatch service ────────────────────
const findNearestUnit = async (latitude, longitude, unitType) => {
  try {
    const dispatchUrl = process.env.DISPATCH_SERVICE_URL || 'http://localhost:3003';
    const response = await axios.get(`${dispatchUrl}/vehicles`, {
      params: { status: 'available', type: unitType },
    });

    const vehicles = response.data;
    if (!vehicles || vehicles.length === 0) return null;

    // Calculate distance for each vehicle and sort by nearest
    const withDistance = vehicles.map((v) => ({
      ...v,
      distanceKm: haversineKm(latitude, longitude, v.latitude, v.longitude),
    }));

    withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
    return withDistance[0]; // nearest available unit
  } catch (error) {
    console.warn('Could not reach dispatch service:', error.message);
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

    // Try to find and assign nearest unit
    const nearestUnit = await findNearestUnit(latitude, longitude, responderType);

    if (nearestUnit) {
      await incident.update({
        assigned_unit_id: nearestUnit.vehicle_id,
        assigned_unit_type: responderType,
        status: 'dispatched',
        dispatched_at: new Date(),
      });

      // Publish event to RabbitMQ
      await publishEvent('incident.created', {
        incidentId: incident_id,
        incidentType: incident_type,
        latitude,
        longitude,
        assignedUnitId: nearestUnit.vehicle_id,
        assignedUnitType: responderType,
        createdBy: req.user.userId,
      });

      await publishEvent('unit.dispatched', {
        incidentId: incident_id,
        unitId: nearestUnit.vehicle_id,
        unitType: responderType,
        dispatchedAt: new Date().toISOString(),
      });

      return res.status(201).json({
        incidentId: incident_id,
        status: 'dispatched',
        assignedUnit: {
          type: responderType,
          id: nearestUnit.vehicle_id,
          name: nearestUnit.station_id,
          distanceKm: nearestUnit.distanceKm.toFixed(2),
        },
        dispatchedAt: incident.dispatched_at,
      });
    }

    // No unit available — save as created only
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

      // Publish resolved event
      const createdAt = new Date(incident.created_at);
      const responseTimeSeconds = Math.floor((new Date() - createdAt) / 1000);
      await publishEvent('incident.resolved', {
        incidentId: incident.incident_id,
        resolvedBy: req.user.userId,
        resolvedAt: new Date().toISOString(),
        responseTimeSeconds,
      });
    }

    await incident.update(updates);
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
