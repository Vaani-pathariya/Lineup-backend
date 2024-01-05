const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require("mongoose");
const userModel = require("./models");
const bcrypt = require('bcrypt');
const authenticateToken = require('./authenticateToken');
const jwt = require('jsonwebtoken');
const app = express();
const port = 8000;
const qrcode = require('qrcode');
const qrImage = require('qr-image');
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
//Generating code
const generateCode = () => {
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp.toString();
};
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
        const code = generateCode();
        const membersFound=0;
        // Create a new user
        const newUser = new userModel({
            email,
            password: hashedPassword,
            name,
            zealId,
            code,
            membersFound:0
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
app.post('/store-avatar', authenticateToken, async (req, res) => {
    try {
        const { avatar } = req.body;
        const { userId } = req.user;

        // Find the user by userId
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update the user's name
        user.avatar = avatar;
        await user.save();

        res.status(200).json({ message: 'Avatar stored successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.post('/start-game', authenticateToken, async (req, res) => {
    try {
        //An empty body needs to be sent
        const { userId } = req.user;

        // Find the user by userId
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update the user's name
        user.startGame = new Date();
        await user.save();

        res.status(200).json({ message: 'Game started successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.get('/generate-qr', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;

        // Find the user by userId
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const {code}=user;
        const qrCodeData = { userId: userId , Code:code };
        const qrCodeSVG = await qrcode.toString(JSON.stringify(qrCodeData), { type: 'svg' });
  
        res.status(200).json({qr: `${qrCodeSVG}`});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.post('/scan-qrcode', authenticateToken, async (req, res) => {
    try {
       const { qrCodeData } = req.body;
       const { userIdMain } = req.user;
       // Decode QR Code data
       const decodedData = JSON.parse(qrCodeData);
       const userId=decodedData.userId
       const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const {code}=user;
        console.log(decodedData.Code)
        if (decodedData.code==code){
            const userMain = await userModel.findById(userIdMain);
            const members=userMain.membersFound;
            if (members==3){
                return res.status(404).json({ message: 'You have already completed the game' });
            }
            else if (members==2){
                userMain.membersFound=3;
                const currentDate = new Date();
                const gameDuration = currentDate - userMain.startGame;
                userMain.gameDuration = gameDuration;
                userMain.save()
                return res.status(200).json({ message: 'Congratulations ! You have completed the game'});
            }
            else {
                userMain.membersFound=members+1;
                const currentDate = new Date();
                const gameDuration = currentDate - userMain.startGame;
                userMain.gameDuration = gameDuration;
                userMain.save()
            }
        }
       res.status(200).json({ message: 'QR Code scanned successfully' });
    } catch (error) {
       console.error(error);
       res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.get('/leaderboard', authenticateToken, async (req, res) => {
    try {
        // Find users with membersFound equal to 3 and sort by gameDuration in ascending order
        const usersFound3 = await userModel.find({ membersFound: 3 }).sort({ gameDuration: 1 });

        // Find users with membersFound equal to 2 and sort by gameDuration in ascending order
        const usersFound2 = await userModel.find({ membersFound: 2 }).sort({ gameDuration: 1 });

        // Find users with membersFound equal to 1 and sort by gameDuration in ascending order
        const usersFound1 = await userModel.find({ membersFound: 1 }).sort({ gameDuration: 1 });

        // Concatenate the results of all three queries
        const finalList = [...usersFound3, ...usersFound2, ...usersFound1];

        // Extract names and membersFound values from the final list
        const usersInfo = finalList.map(user => ({
            name: user.name,
            membersFound: user.membersFound,
        }));

        res.status(200).json({ users: usersInfo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.listen(port, () => console.log(`Hello world app listening on port ${port}!`));
