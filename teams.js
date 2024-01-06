const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  member1: {
    type: ObjectId,
    required: true,
  },
  member2: {
    type: ObjectId,
    required: true,
  },
  member3: {
    type: ObjectId,
    required: true,
  },
  member4: {
    type: ObjectId,
    required: true,
  },
});

const Team = mongoose.model("team", teamSchema);

module.exports = Team;
