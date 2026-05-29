require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const { nanoid } = require('nanoid');
const Citizen = require('./models/Citizen'); // existing model

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Gov DB connected'))
  .catch(err => console.error('❌ Gov DB connection error:', err));

// Login route for citizen verification
// app.post('/api/citizens/login', async (req, res) => {
//   const { idNumber, password } = req.body;

//   try {
//     const citizen = await Citizen.findOne({ idNumber });

//     if (!citizen || citizen.password !== password) {
//       return res.status(401).json({ message: 'Invalid ID or password' });
//     }

//     // Generate VID if not set yet
//     if (!citizen.VID) {
//       citizen.VID = `VID-${nanoid(6)}`;
//       await citizen.save();
//     }

//     // Prepare eligibility data
//     const eligibilityData = {
//       VID: citizen.VID,
//       age: citizen.age,
//       district: citizen.district,
//       country: citizen.country
//     };

//     // Send eligibility data to VoteChain server
//     await axios.post('http://localhost:5000/api/eligibility/receive', eligibilityData);

//     res.status(200).json({
//       message: 'Verification successful, eligibility data sent to VoteChain server',
//       eligibilityData
//     });

//   } catch (err) {
//     console.error('Verification error:', err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// 1. GOVERNMENT SERVER - Keep this mostly the same but include callback URL
app.post('/api/citizens/login', async (req, res) => {
  const { idNumber, password, callbackUrl } = req.body;

  try {
    const citizen = await Citizen.findOne({ idNumber });

    // Check if citizen exists and password matches
    if (!citizen || citizen.password !== password) {
      return res.status(401).json({ message: 'Invalid ID or password' });
    }

    // Check if citizen already has a VID (meaning they've registered before)
    if (citizen.VID) {
      return res.status(409).json({ 
        message: 'This account has already been registered for voting. Each citizen can only register once.',
        alreadyRegistered: true
      });
    }

    // Generate new VID for first-time registration
    citizen.VID = `VID-${nanoid(6)}`;
    await citizen.save();

    // Prepare eligibility data
    const eligibilityData = {
      VID: citizen.VID,
      age: citizen.age,
      district: citizen.district,
      country: citizen.country
    };

    // Return the data to client
    res.status(200).json({
      message: 'Verification successful',
      eligibilityData
    });

  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Government server running on port ${PORT}`);
});
