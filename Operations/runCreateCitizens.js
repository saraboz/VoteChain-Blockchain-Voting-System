// runSeed.js

require('dotenv').config(); // To load environment variables (if you are using them)
const mongoose = require('mongoose');
const createCitizens = require('./createCitizen'); // Adjust path if needed

// Replace with your MongoDB connection string from .env or hardcoded
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/your-database-name';

// Connect to MongoDB
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        // Call the function to create citizens
        await createCitizens();
    })
    .catch(err => {
        console.error('❌ Failed to connect to MongoDB:', err);
    })
    .finally(() => {
        // Close the MongoDB connection after the task is done
        mongoose.connection.close();
    });
