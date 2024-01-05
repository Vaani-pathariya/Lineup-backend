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
        const finish=false;
        // Create a new user
        const newUser = new userModel({
            email,
            password: hashedPassword,
            name,
            zealId,
            code,
            finish
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
            if (userMain.finish==true){
                res.status(404).json({ message: 'You have already completed the game' });
            }
            else {
                const members=userMain.membersFound
                if (members==2){
                    userMain.membersFound=3;
                    userMain.finish=true;
                    await userMain.save();
                }
                else {
                    userMain.membersFound=members+1;
                    await userMain.save();
                }
            }
        }
       res.status(200).json({ message: 'QR Code scanned successfully' });
    } catch (error) {
       console.error(error);
       res.status(500).json({ message: 'Internal Server Error' });
    }
 });
app.listen(port, () => console.log(`Hello world app listening on port ${port}!`));
