const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { protect } = require('../middleware/auth');
const Booking = require('../models/Booking');
const ParkingSlot = require('../models/ParkingSlot');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// POST /api/bookings/create-order — create Razorpay order
router.post('/create-order', protect, async (req, res) => {
  try {
    const { slotId, duration, vehicleNumber } = req.body;

    const slot = await ParkingSlot.findById(slotId);
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found' });
    if (slot.status !== 'available') return res.status(400).json({ success: false, message: 'Slot not available' });

    const ratePerHour = 30; // ₹30 per hour
    const amount = ratePerHour * duration * 100; // in paise

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: { slotNumber: slot.slotNumber, userId: req.user._id.toString() }
    });

    const booking = await Booking.create({
      user: req.user._id,
      slot: slot._id,
      slotNumber: slot.slotNumber,
      vehicleNumber: vehicleNumber || req.user.vehicleNumber,
      duration,
      amount,
      startTime: new Date(),
      endTime: new Date(Date.now() + duration * 3600000),
      razorpayOrderId: order.id,
      status: 'pending',
      paymentStatus: 'pending',
      bookingType: 'online'
    });

    // Temporarily reserve slot
    slot.status = 'reserved';
    slot.type = 'online';
    slot.bookedBy = req.user._id;
    slot.bookingId = booking._id;
    await slot.save();

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      bookingId: booking._id,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ success: false, message: 'Error creating payment order' });
  }
});

// POST /api/bookings/verify-payment
router.post('/verify-payment', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    booking.razorpayPaymentId = razorpay_payment_id;
    booking.razorpaySignature = razorpay_signature;
    booking.status = 'confirmed';
    booking.paymentStatus = 'paid';
    await booking.save();

    // Confirm slot as occupied
    const slot = await ParkingSlot.findById(booking.slot);
    if (slot) {
      slot.status = 'occupied';
      await slot.save();
    }

    res.json({ success: true, message: 'Payment verified & booking confirmed', booking });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ success: false, message: 'Payment verification error' });
  }
});

// GET /api/bookings/my — user bookings
router.get('/my', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('slot', 'slotNumber floor')
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/bookings/all — admin
router.get('/all', protect, require('../middleware/auth').adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('slot', 'slotNumber floor')
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/bookings/live — open to all authenticated users for live monitoring
router.get('/live', protect, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('slot', 'slotNumber floor')
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/bookings/:id/cancel
router.post('/:id/cancel', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    booking.status = 'cancelled';
    await booking.save();

    const slot = await ParkingSlot.findById(booking.slot);
    if (slot) {
      slot.status = 'available';
      slot.type = 'available';
      slot.bookedBy = null;
      slot.bookingId = null;
      await slot.save();
    }

    res.json({ success: true, message: 'Booking cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
