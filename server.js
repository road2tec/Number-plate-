require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/slots', require('./routes/slots'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));

// Catch-all route to serve index.html
app.get('/', (req, res) => {
  console.log('Root route hit!');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Seed initial parking slots if none exist
const ParkingSlot = require('./models/ParkingSlot');
async function seedSlots() {
  const count = await ParkingSlot.countDocuments();
  if (count === 0) {
    const slots = [];
    for (let i = 1; i <= 20; i++) {
      let type = 'available';
      let status = 'available';
      if (i <= 5) { type = 'offline'; status = 'occupied'; }
      else if (i <= 15) { type = 'online'; status = 'occupied'; }
      slots.push({ slotNumber: i, floor: 1, type, status });
    }
    await ParkingSlot.insertMany(slots);
    console.log('✅ 20 parking slots seeded');
  }
}

// Connect MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    await seedSlots();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
