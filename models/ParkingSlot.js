const mongoose = require('mongoose');

const parkingSlotSchema = new mongoose.Schema({
  slotNumber: { type: Number, required: true, unique: true },
  floor: { type: Number, default: 1 },
  type: { type: String, enum: ['offline', 'online', 'available'], default: 'available' },
  status: { type: String, enum: ['available', 'occupied', 'reserved'], default: 'available' },
  bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ParkingSlot', parkingSlotSchema);
