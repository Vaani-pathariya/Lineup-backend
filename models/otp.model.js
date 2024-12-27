const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { 
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'],
   },
  phone: { 
    type: String ,
    trim: true,
    match: [/^\+?[\d\s-]{10,}$/, 'Please enter a valid phone number'],
   },
  otp: {
     type: Number, 
     required: true
   },
  expiration: {
     type: Date,
        required: true,
      },
  attempts: {
     type: Number,
     default: 0,
     max: 3
      },
  createdAt: {
     type: Date,
        default: Date.now,
        expires: 300 
      }
}, {
  timestamps: true  
}
);

otpSchema.index({ email: 1, createdAt: -1 });
otpSchema.index({ phone: 1, createdAt: -1 });



const Otp = mongoose.model('Otp', otpSchema);

module.exports = Otp;
