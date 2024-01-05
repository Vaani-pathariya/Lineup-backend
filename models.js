const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
    },
    password: {
        type: String,
    },
    name:{
        type: String,
    },
    zealId:{
        type: Number,
        unique: true,
    },
    avatar:{
        type: Number,
        enum:[1,2,3,4,5,6,7,8]
    },
    code :{
        type: Number,
    },
    membersFound:{
        type: Number,
        enum:[1,2,3,0],
    },
    startGame:{
        type: Date,
    },
    gameDuration: {
        type: Number, // Assuming you want to store duration in milliseconds
    },

});

const User = mongoose.model("User", UserSchema);

module.exports = User;