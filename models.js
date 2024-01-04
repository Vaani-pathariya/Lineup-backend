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
    },
    avatar:{
        type: Number,
        enum:[1,2,3,4,5,6,7,8]
    }
});

const User = mongoose.model("User", UserSchema);

module.exports = User;