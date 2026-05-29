require('dotenv').config();
const mongoose = require('mongoose');
const Citizen = require('../models/Citizen');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => {
        console.log('✅ MongoDB connected');
        return createCitizens();
    })
    .catch(err => console.error('❌ Connection error:', err));

// await Citizen.deleteMany({});


