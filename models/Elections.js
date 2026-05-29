// models/Election.js
const mongoose = require('mongoose');

const ElectionSchema = new mongoose.Schema({
    election_id: {
        type: String,
        required: true,
        unique: true,
    },
    cid: {
        type: String,
        required: true,
    },
    resultCID: {
        type: String,
        required: true,
    }
});

module.exports = mongoose.model('Election', ElectionSchema);