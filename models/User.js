const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    required: true
  },
  walletAddress:{
    type: String,
    default: null,
    unique : true,
  },
  age:{
    type:Number,
    required: false,
    default: null
  },
  district:{
    type: String,
    required: false,
    default: null
  },
  country:{
    type: String,
    required: false,
    default: null
  },
  VID:{
    type: String,
    required: false,
    default: null
  }
});

module.exports = mongoose.model('User', userSchema);
