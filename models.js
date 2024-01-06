const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
  },
  password: {
    type: String,
  },
  name: {
    type: String,
  },
  zealId: {
    type: String,
    unique: true,
  },
  avatar: {
    type: Number,
    enum: [1, 2, 3, 4, 5, 6, 7, 8],
  },
  membersFound: {
    type: Number,
    enum: [1, 2, 3, 0],
  },
  startGame: {
    type: Date,
  },
  gameDuration: {
    type: Number, // Assuming you want to store duration in milliseconds
  },
  latitude: {
    type: Number, // Assuming I want to store latitude as a number
  },
  longitude: {
    type: Number, // Assuming I want to store longitude as a number
  },
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
