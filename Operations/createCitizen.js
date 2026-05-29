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

async function createCitizens() {
    const citizens = [
        {
            idNumber: 'CIT001',
            age: 34,
            district: 'Kadıköy',
            country: 'Turkey',
            password: 'password'
        },
        {
            idNumber: 'CIT002',
            age: 45,
            district: 'Üsküdar',
            country: 'Turkey',
            password: 'password'
        },
        {
            idNumber: 'CIT003',
            age: 29,
            district: 'Beşiktaş',
            country: 'Turkey',
            password: 'password'
        },
        {
            idNumber: 'CIT004',
            age: 52,
            district: 'Bakırköy',
            country: 'Turkey',
            password: 'password'
        },
        {
            idNumber: 'CIT005',
            age: 21,
            district: 'Sarıyer',
            country: 'Turkey',
            password: 'password'
        },
        {
            idNumber: 'CIT006',
            age: 39,
            district: 'Maltepe',
            country: 'Turkey',
            password: 'password'
        },
        {
            idNumber: 'CIT007',
            age: 60,
            district: 'Fatih',
            country: 'Turkey',
            password: 'password'
        },
        {
            idNumber: 'CIT008',
            age: 27,
            district: 'Ataşehir',
            country: 'Turkey',
            password: 'password'
        },
        {
            idNumber: 'CIT009',
            age: 33,
            district: 'Şişli',
            country: 'Turkey',
            password: 'password'
        },
        {
            idNumber: 'CIT010',
            age: 48,
            district: 'Beyoğlu',
            country: 'Turkey',
            password: 'password'
        },
        {
            idNumber: 'CIT011',
            age: 26,
            district: 'Kadıköy',
            country: 'Turkey',
            password: 'password'
        },
        {
            idNumber: 'CIT012',
            age: 50,
            district: 'Üsküdar',
            country: 'Turkey',
            password: 'password'
        },
        {
            idNumber: 'CIT013',
            age: 31,
            district: 'Bakırköy',
            country: 'Turkey',
            password: 'password'
        },
        {
            idNumber: 'CIT014',
            age: 38,
            district: 'Şişli',
            country: 'Turkey',
            password: 'password'
        },
        {
            idNumber: 'CIT015',
            age: 44,
            district: 'Beşiktaş',
            country: 'Turkey',
            password: 'password'
        },
        {
            idNumber: 'CIT016',
            age: 23,
            district: 'Kadıköy',
            country: 'Turkey',
            password: 'password'
        },
        {
            idNumber: 'CIT017',
            age: 36,
            district: 'Maltepe',
            country: 'Turkey',
            password: 'password'
        },
        {
            idNumber: 'CIT018',
            age: 41,
            district: 'Fatih',
            country: 'Turkey',
            password: 'password'
        },
        {
            idNumber: 'CIT019',
            age: 30,
            district: 'Ataşehir',
            country: 'Turkey',
            password: 'password'
        },
        {
            idNumber: 'CIT020',
            age: 55,
            district: 'Sarıyer',
            country: 'Turkey',
            password: 'password'
        }
    ];

    try {
        for (let citizenData of citizens) {
            const exists = await Citizen.findOne({ idNumber: citizenData.idNumber });
            if (!exists) {
                const newCitizen = new Citizen(citizenData);
                await newCitizen.save();
                console.log(`✅ Added citizen with ID: ${citizenData.idNumber}`);
            } else {
                console.log(`⚠️ Citizen with ID ${citizenData.idNumber} already exists`);
            }
        }
    } catch (err) {
        console.error('❌ Error creating citizens:', err);
    } finally {
        mongoose.connection.close();
    }
}

module.exports = createCitizens;