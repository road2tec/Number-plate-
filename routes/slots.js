const express = require('express');
const router = express.Router();
const ParkingSlot = require('../models/ParkingSlot');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/slots — all slots (public)
router.get('/', async (req, res) => {
  try {
    const slots = await ParkingSlot.find().sort('slotNumber').populate('bookedBy', 'name vehicleNumber');
    res.json({ success: true, slots });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/slots/stats
router.get('/stats', async (req, res) => {
  try {
    const total = await ParkingSlot.countDocuments();
    const available = await ParkingSlot.countDocuments({ status: 'available' });
    const occupied = await ParkingSlot.countDocuments({ status: 'occupied' });
    const reserved = await ParkingSlot.countDocuments({ status: 'reserved' });
    const offlineBooked = await ParkingSlot.countDocuments({ type: 'offline' });
    const onlineBooked = await ParkingSlot.countDocuments({ type: 'online' });
    res.json({ success: true, stats: { total, available, occupied, reserved, offlineBooked, onlineBooked } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/slots/seed — seed 20 slots (admin)
router.post('/seed', protect, adminOnly, async (req, res) => {
  try {
    await ParkingSlot.deleteMany({});
    const slots = [];
    for (let i = 1; i <= 20; i++) {
      let type = 'available';
      if (i <= 5) type = 'offline';
      else if (i <= 15) type = 'online';
      slots.push({
        slotNumber: i,
        floor: 1,
        type,
        status: type === 'available' ? 'available' : (i <= 15 ? 'occupied' : 'available')
      });
    }
    await ParkingSlot.insertMany(slots);
    res.json({ success: true, message: '20 parking slots seeded' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
