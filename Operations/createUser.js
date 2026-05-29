require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ MongoDB connected');
    return createUser(); // or createUserWithParams('someId', 'somePass', 'role');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });

async function createUser() {
  const userId = 'adminUser';
  const password = 'admin123';
  const role = 'admin';

  try {
    const existing = await User.findOne({ userId });
    if (existing) {
      console.log('⚠️ User already exists');
    } else {
      const user = new User({ userId, password, role });
      await user.save();
      console.log('✅ User created:', userId);
    }
  } catch (err) {
    console.error('❌ Error creating user:', err);
  } finally {
    mongoose.connection.close();
  }
}

async function createUserWithParams(id, pass, role) {
  try {
    const existing = await User.findOne({ userId: id });
    if (existing) {
      console.log('⚠️ User already exists');
    } else {
      const user = new User({ userId: id, password: pass, role });
      await user.save();
      console.log('✅ User created:', user.userId);
    }
  } catch (err) {
    console.error('❌ Error creating user:', err);
  } finally {
    mongoose.connection.close();
  }
}

module.exports = { createUser, createUserWithParams };
