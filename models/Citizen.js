const mongoose = require('mongoose');

const citizenSchema = new mongoose.Schema({
  idNumber: {
    type: String,
    required: true,
    unique: true
  },
  age: {
    type: Number,
    required: true,
  },
  district: {
    type: String,
    required: true
  },
  password:{
    type: String,
    required: true
  },
  country:{
    type: String, 
    required: true
  },
  VID:{
    type: String,
    required: false,
    unique: true
  }
});

module.exports = mongoose.model('Citizen', citizenSchema);
