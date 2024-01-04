const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require("mongoose");
const userModel = require("./models");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const port = 8000;

app.use(cors());

mongoose.connect('mongodb+srv://vaani:vaani@cluster0.7uf5zvr.mongodb.net/Lineup?retryWrites=true&w=majority',
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
    console.log("Connected successfully");
});

// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// basic get request 
app.get('/', async (req, res) => {
    const user = await userModel.find({});
    res.send(user);
});
//signup route
app.post('/signup', async (req, res) => {
    try {
        const { email, password,name,zealId} = req.body;

        // Check if the email is already registered
        const existingUser = await userModel.findOne({ zealId });
        if (existingUser) {
            return res.status(400).json({ message: 'ZealId is already registered' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser = new userModel({
            email,
            password: hashedPassword,
            name,
            zealId
        });

        let user = await newUser.save();
        const token = jwt.sign({ userId: user._id }, 'your-secret-key',{ expiresIn: '1h' });
        res.status(201).json({ message: 'Signup successful',token:token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
//Login route
app.post('/login', async (req, res) => {
    try {
        const { zealId, password } = req.body;

        // Find the user by email
        const user = await userModel.findOne({ zealId });
        if (!user) {
            return res.status(401).json({ message: 'Invalid zealId or password' });
        }

        // Compare the password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid zealId or password' });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, 'your-secret-key', { expiresIn: '1h' });

        res.json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.listen(port, () => console.log(`Hello world app listening on port ${port}!`));
