const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const vehicleRoutes = require('./routes/vehicle.routes');
const { connectDB } = require('./config/db');
const { connectQueue, subscribeToEvent } = require('./config/queue');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Make io accessible in controllers
app.set('io', io);

// Routes
app.use('/', vehicleRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'dispatch-service', timestamp: new Date() });
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('subscribe', (data) => {
    const room = `vehicle_${data.vehicleId}`;
    socket.join(room);
    console.log(`Client subscribed to ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3003;

// Simulate vehicle moving towards incident location
const simulateVehicleMovement = async (vehicleId, targetLat, targetLng) => {
  const Vehicle = require('./models/vehicle.model');
  const vehicle = await Vehicle.findByPk(vehicleId);
  if (!vehicle) return;

  let currentLat = parseFloat(vehicle.latitude);
  let currentLng = parseFloat(vehicle.longitude);
  const steps = 10; // number of steps to reach destination
  let step = 0;

  const interval = setInterval(async () => {
    step++;
    // Move a fraction closer each step
    currentLat = currentLat + (targetLat - currentLat) * 0.3;
    currentLng = currentLng + (targetLng - currentLng) * 0.3;
    const speed = Math.floor(60 + Math.random() * 40);

    await Vehicle.update(
      { latitude: currentLat, longitude: currentLng, speed_kmh: speed, last_updated: new Date() },
      { where: { vehicle_id: vehicleId } }
    );

    // Broadcast via WebSocket
    if (io) {
      io.emit('location_update', {
        vehicleId,
        latitude: currentLat,
        longitude: currentLng,
        speed_kmh: speed,
        timestamp: new Date(),
      });
    }

    // Stop when close enough or steps exceeded
    const distance = Math.sqrt(
      Math.pow(currentLat - targetLat, 2) + Math.pow(currentLng - targetLng, 2)
    );

    if (step >= steps || distance < 0.0001) {
      clearInterval(interval);
      // Vehicle has arrived — update to on_scene
      await Vehicle.update(
        { latitude: targetLat, longitude: targetLng, speed_kmh: 0, status: 'on_scene' },
        { where: { vehicle_id: vehicleId } }
      );
      if (io) {
        io.emit('location_update', {
          vehicleId, latitude: targetLat, longitude: targetLng,
          speed_kmh: 0, status: 'on_scene', timestamp: new Date(),
        });
      }
      console.log(`Vehicle ${vehicleId} arrived at incident location`);
    }
  }, 2000); // move every 2 seconds
};

// Export so it can be called from outside
global.simulateVehicleMovement = simulateVehicleMovement;

const start = async () => {
  await connectDB();
  const channel = await connectQueue();

  // Subscribe to incident.created — update vehicle status to dispatched
  if (channel) {
    await subscribeToEvent('incident.created', async (event) => {
  try {
    const Vehicle = require('./models/vehicle.model');
    const { assignedUnitId, incidentId, latitude, longitude } = event.payload;
    if (assignedUnitId) {
      await Vehicle.update(
        { status: 'dispatched', incident_id: incidentId },
        { where: { vehicle_id: assignedUnitId } }
      );
      console.log(`Vehicle ${assignedUnitId} dispatched for incident ${incidentId}`);

      // Start GPS simulation — move vehicle towards incident
      if (latitude && longitude) {
        console.log(`Simulating movement of ${assignedUnitId} to ${latitude}, ${longitude}`);
        simulateVehicleMovement(assignedUnitId, parseFloat(latitude), parseFloat(longitude));
      }
    }
  } catch (err) {
    console.error('Error handling incident.created:', err.message);
  }
});
  }

  server.listen(PORT, () => {
    console.log(`Dispatch Service running on port ${PORT}`);
    console.log(`WebSocket server ready on ws://localhost:${PORT}`);
  });
};

start();

module.exports = app;
