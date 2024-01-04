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
    }
});

const User = mongoose.model("User", UserSchema);

module.exports = User;