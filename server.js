require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // Make sure this is at the top
const User = require('./models/User');
const Citizen = require('./models/Citizen');
const Election = require('./models/Elections');


const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes

// Login Route
app.post('/api/auth/login', async (req, res) => {
  const { userId, password } = req.body;

  try {
    const user = await User.findOne({ userId });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // 🔑 Create JWT token
    const token = jwt.sign(
      {
        id: user._id,
        userId: user.userId,
        role: user.role,
        walletAddress: user.walletAddress || null
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      role: user.role,
      walletAddress: user.walletAddress || null
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// // Register a new user
// app.post('/api/auth/register', async (req, res) => {
//   try {
//     let { userId, password, role } = req.body;

//     // 🔎 Basic input validation
//     if (!userId || !password || !role) {
//       return res.status(400).json({
//         message: 'All fields are required: userId, password, and role',
//       });
//     }

//     // 🧼 Clean up input
//     userId = userId.trim();

//     // 🚫 Validate role value
//     const validRoles = ['admin', 'user'];
//     if (!validRoles.includes(role)) {
//       return res.status(400).json({ message: 'Invalid role specified' });
//     }

//     // 🛡️ Check if userId already exists
//     const existingUser = await User.findOne({ userId });
//     if (existingUser) {
//       return res.status(409).json({ message: 'User already exists' });
//     }

//     // 📝 Create and save new user
//     const newUser = new User({ userId, password, role });
//     await newUser.save();

//     // ✅ Success response
//     res.status(201).json({ message: 'User registered successfully' });

//   } catch (err) {
//     // ❌ Handle unexpected errors
//     console.error('Registration error:', err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

app.post('/api/auth/register', async (req, res) => {
  try {
    let { userId, password, role, walletAddress } = req.body;

    // 🔎 Basic input validation
    if (!userId || !password || !role || !walletAddress) {
      return res.status(400).json({
        message: 'All fields are required: userId, password, role, and walletAddress',
      });
    }

    // 🧼 Clean up input
    userId = userId.trim();
    walletAddress = walletAddress.trim();

    // 🚫 Validate role value
    const validRoles = ['admin', 'user'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    // 🛡️ Check if userId already exists
    const existingUser = await User.findOne({ userId });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // 🛡️ Check if wallet address already exists
    const existingWallet = await User.findOne({ walletAddress });
    if (existingWallet) {
      return res.status(409).json({ message: 'Wallet address already registered' });
    }

    // 📝 Create and save new user
    const newUser = new User({ userId, password, role, walletAddress });
    await newUser.save();

    // ✅ Success response
    res.status(201).json({ message: 'User registered successfully' });

  } catch (err) {
    // ❌ Handle unexpected errors
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Wallet-based authentication (MetaMask)
app.post('/api/auth/wallet-login', async (req, res) => {
  const { walletAddress, signedMessage, originalMessage } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ message: 'Wallet address is required' });
  }

  try {
    // Check if wallet address exists in the database
    const user = await User.findOne({ walletAddress });

    if (!user) {
      return res.status(401).json({
        message: 'This wallet address is not registered with any account',
        registered: false
      });
    }

    // If we implement signature verification later, it would go here
    // For now, we're just checking if the wallet exists in our database

    // Create JWT token
    const token = jwt.sign(
      {
        id: user._id,
        userId: user.userId,
        role: user.role,
        walletAddress: user.walletAddress
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Return successful authentication response
    return res.status(200).json({
      message: 'Authentication successful',
      token,
      role: user.role,
      userId: user.userId,
      walletAddress: user.walletAddress
    });

  } catch (err) {
    console.error('Wallet authentication error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Verify wallet for protected routes
app.post('/api/auth/verify-wallet', async (req, res) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    const { walletAddress } = req.body;

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address is required' });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if the wallet address in the token matches the one provided
    if (decoded.walletAddress?.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ message: 'Wallet address mismatch' });
    }

    // Find the user in the database to ensure they still exist
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // All verification passed
    return res.status(200).json({
      message: 'Wallet verification successful',
      valid: true
    });

  } catch (err) {
    console.error('Wallet verification error:', err);

    // Check if it's a token verification error
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
});

// Wallet linking for USER model
app.post('/api/users/link-wallet', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { walletAddress } = req.body;

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.walletAddress) {
      return res.status(400).json({ message: 'Wallet already linked' });
    }

    user.walletAddress = walletAddress;
    await user.save();

    res.status(200).json({ message: 'Wallet linked successfully', walletAddress });

  } catch (err) {
    console.error(err);
    res.status(403).json({ message: 'Invalid or expired token' });
  }
});

app.get('/api/users/check-wallet', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token Provided' });

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decode.id);

    if (!user) {
      return res.status(404).json({ message: 'User not Found' });
    }

    res.status(200).json({
      walletAddress: user.walletAddress || null
    });
  } catch (err) {
    console.error('Error checking wallet: ', err);
    res.status(403).json({ message: 'invalid or expired token' });
  }
});

// Get country by wallet address
app.get('/api/users/:walletAddress/country', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address is required' });
    }

    // Find user by wallet address in your database
    const user = await User.findOne({ walletAddress }).select('country');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`[GET /api/users/${walletAddress}/country] Country found: ${user.country}`);
    res.status(200).json({ country: user.country });
  } catch (err) {
    console.error(`[GET /api/users/:walletAddress/country] Error:`, err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get age by wallet address
app.get('/api/users/:walletAddress/age', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address is required' });
    }

    // Find user by wallet address in your database
    const user = await User.findOne({ walletAddress }).select('age');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`[GET /api/users/${walletAddress}/age] Age found: ${user.age}`);
    res.status(200).json({ age: user.age });
  } catch (err) {
    console.error(`[GET /api/users/:walletAddress/age] Error:`, err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get User VID by wallet address
app.get('/api/users/:walletAddress/VID', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address is required' });
    }

    // Find user by wallet address in your database
    const user = await User.findOne({ walletAddress }).select('VID');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`[GET /api/users/${walletAddress}/VID] VID found: ${user.VID}`);
    res.status(200).json({ VID: user.VID });
  } catch (err) {
    console.error(`[GET /api/users/:walletAddress/VID] Error:`, err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user information route
app.get('/api/users/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json(user);
  } catch (err) {
    res.status(403).json({ message: 'Invalid token' });
  }
});

// Get user information by userId
app.get('/api/users/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findOne({ userId }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Convert Mongoose document to plain object
    const userObject = user.toObject();

    // Define all expected fields to normalize output
    const allFields = ['userId', 'role', 'walletAddress', 'age', 'district', 'country', 'VID'];

    // Ensure all expected fields are present, filling in null if needed
    const normalizedUser = allFields.reduce((acc, field) => {
      acc[field] = userObject[field] !== undefined ? userObject[field] : null;
      return acc;
    }, {});

    console.log(`[GET /api/users/${userId}] User info:`, normalizedUser);

    res.status(200).json(normalizedUser);
  } catch (err) {
    console.error(`[GET /api/users/:userId] Error:`, err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's country by user ID
app.get('/api/users/:userId/country', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId }).select('country');

    if (!user) {
      return res.status(404).json({ message: 'User not found', country: null });
    }

    res.status(200).json({ country: user.country || null });
  } catch (err) {
    console.error('[GET /api/users/:userId/country] Error:', err);
    res.status(500).json({ message: 'Server error', country: null });
  }
});

// Get Election CIDs by ID
app.get('/api/elections/:id', async (req, res) => {
  const { id } = req.params;
  console.log('🧪 Election model loaded:', typeof Election); // should be 'function'

  try {
    const election = await Election.findOne({ election_id: id });

    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    res.status(200).json({ cid: election.cid });
  } catch (err) {
    console.error('❌ Error fetching election:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Election Result CIDs by ID
app.get('/api/elections/:id/results', async (req, res) => {
  const { id } = req.params;

  try {
    const election = await Election.findOne({ election_id: id });

    if (!election) {
      return res.status(404).json({ error: 'Election not found' });
    }

    if (!election.resultCID) {
      return res.status(400).json({ error: 'Result CID not available for this election' });
    }

    res.status(200).json({ resultCID: election.resultCID });
  } catch (err) {
    console.error('❌ Error fetching election results:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete ALL Citizens
app.delete('/api/delete/citizens', async (req, res) => {
  try {
    await Citizen.deleteMany({});
    res.json({ message: 'All citizens deleted successfully' });
  } catch (error) {
    console.error('Error deleting all citizens: ', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Receive eligibility info from gov portal and assign to the currently logged in user
// app.post('/api/eligibility/receive', async (req, res) => {
//   const { VID, age, district, country } = req.body;

//   try {
//     // You could change this logic to use JWT or session in the future
//     // For now, we find the first user without a VID
//     const user = await User.findOne({ VID: null });

//     if (!user) {
//       return res.status(404).json({ message: 'No user found to assign eligibility data' });
//     }

//     user.VID = VID;
//     user.age = age;
//     user.district = district;
//     user.country = country;
//     await user.save();

//     res.status(200).json({
//       message: 'Eligibility data saved and linked to user',
//       userId: user.userId,
//       VID: user.VID,
//       age: user.age,
//       district: user.district,
//       country: user.country
//     });

//   } catch (error) {
//     console.error('Error saving eligibility data:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// Modified endpoint to receive eligibility data
app.post('/api/eligibility/receive', async (req, res) => {
  const { VID, age, district, country, verificationToken } = req.body;

  try {
    let user;

    // If token is provided, use it to find the user
    if (verificationToken) {
      user = await User.findOne({
        verificationToken,
        verificationTokenExpiry: { $gt: new Date() } // Token must not be expired
      });

      if (!user) {
        return res.status(404).json({
          message: 'No matching user found or verification token expired'
        });
      }
    } else {
      // Fallback to the original behavior for backward compatibility
      // Find the first user without a VID
      user = await User.findOne({ VID: null });

      if (!user) {
        return res.status(404).json({ message: 'No user found to assign eligibility data' });
      }
    }

    // Update user with eligibility data
    user.VID = VID;
    user.age = age;
    user.district = district;
    user.country = country;

    // Clear verification token if it exists
    if (user.verificationToken) {
      user.verificationToken = null;
      user.verificationTokenExpiry = null;
    }

    await user.save();

    res.status(200).json({
      message: 'Eligibility data saved and linked to user',
      userId: user._id,
      VID: user.VID,
      age: user.age,
      district: user.district,
      country: user.country
    });

  } catch (error) {
    console.error('Error saving eligibility data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// endpoint to handle eligibility updates
app.post('/api/users/update-eligibility', async (req, res) => {
  const { walletAddress, eligibilityData } = req.body;
  const { VID, age, district, country } = eligibilityData;

  if (!walletAddress) {
    return res.status(400).json({ message: 'Wallet address is required' });
  }

  try {
    // Find user by wallet address
    const user = await User.findOne({ walletAddress });

    if (!user) {
      return res.status(404).json({
        message: 'No user found with the provided wallet address',
        walletAddress
      });
    }

    // Update user with eligibility data
    user.VID = VID;
    user.age = age;
    user.district = district;
    user.country = country;
    user.isVerified = true; // Optional: Add a flag to indicate verification is complete

    await user.save();

    console.log(`✅ Updated eligibility data for user: ${user._id} with wallet: ${walletAddress}`);

    res.status(200).json({
      message: 'Eligibility data saved and linked to user',
      userId: user._id,
      walletAddress: user.walletAddress,
      VID: user.VID,
      isVerified: user.isVerified
    });

  } catch (error) {
    console.error('Error saving eligibility data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});





// cast aways
// First, create a new endpoint to generate a temporary token before redirecting to gov portal
// app.post('/api/eligibility/request-verification', authenticateToken, async (req, res) => {
//   try {
//     // Get user from JWT token
//     const userId = req.user.id;

//     // Generate a temporary verification token
//     const verificationToken = nanoid(12);

//     // Store this token with the user
//     await User.findByIdAndUpdate(userId, {
//       verificationToken,
//       verificationTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiry
//     });

//     // Return the token to be used in the redirect URL
//     res.status(200).json({
//       verificationToken,
//       redirectUrl: `http://localhost:5001/gov-portal?token=${verificationToken}`
//     });

//   } catch (error) {
//     console.error('Error creating verification request:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });