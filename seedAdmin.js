require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    const adminEmail = 'admin@smartpark.com';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log('⚠️ Admin user already exists!');
      process.exit();
    }

    const adminUser = new User({
      name: 'Admin',
      email: adminEmail,
      password: 'adminpassword123',
      role: 'admin',
      phone: '1234567890'
    });

    await adminUser.save();
    console.log('✅ Admin seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
