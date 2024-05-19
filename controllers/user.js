const userModel = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();
const { ObjectId } = require("mongodb");
const logData=(status,functionName,user_data)=>{
  console.log(status ,":",functionName, ", user: ",user_data)
}
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers

  return distance;
};
function calculateInitialBearing(lat1, lon1, lat2, lon2) {
  const radiansLat1 = (lat1 * Math.PI) / 180;
  const radiansLon1 = (lon1 * Math.PI) / 180;
  const radiansLat2 = (lat2 * Math.PI) / 180;
  const radiansLon2 = (lon2 * Math.PI) / 180;

  const lonDiff = radiansLon2 - radiansLon1;

  const x = Math.sin(lonDiff) * Math.cos(radiansLat2);
  const y =
    Math.cos(radiansLat1) * Math.sin(radiansLat2) -
    Math.sin(radiansLat1) * Math.cos(radiansLat2) * Math.cos(lonDiff);

  let initialBearing = Math.atan2(x, y);
  initialBearing = (initialBearing * 180) / Math.PI;

  // Convert initial bearing to a compass direction (N, NE, E, SE, S, SW, W, NW)
  const compassDirection = compassDirectionFromBearing(initialBearing);

  return compassDirection;
}
function compassDirectionFromBearing(bearing) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(bearing / 45);
  return directions[((index % 8) + 8) % 8];
}
const signup = async (req, res) => {
  try {
    const { email, password, name, zealId } = req.body;

    // Check if the email is already registered
    const existingUser = await userModel.findOne({ zealId });
    if (existingUser) {
      logData("Failure","Signup : zealId already registered ",{
        "id": existingUser._id,
        "name":existingUser.name,
        "email":existingUser.email,
        "zealId":existingUser.zealId
      });
      return res.status(400).json({ message: "ZealId is already registered" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create a new user
    const newUser = new userModel({
      email,
      password: hashedPassword,
      name,
      zealId,
      membersFound: 0,
      locationUpdate: new Date()
    });

    let user = await newUser.save();
    logData("Success","Signup ",{
      "id":user._id,
      "name":user.name,
      "email":user.email,
      "zealId":user.zealId
    });
    const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY);
    res.status(201).json({ message: "Signup successful", token: token ,scannedCodes:[]});
  } catch (error) {
    console.log("Failure : Signup , Internal Server Error")
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
const login = async (req, res) => {
  try {
    const { zealId, password } = req.body;

    // Find the user by email

    const user = await userModel.findOne({ zealId });
    if (!user) {
      console.log("Failure , Login : Invalid zeal Id or password, zealId :" , zealId)
      return res.status(401).json({ message: "Invalid zeal Id or password" });
    }

    // Compare the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log("Failure , Login : Invalid zeal Id or password , zealId :",zealId )
      return res.status(401).json({ message: "Invalid zeal Id or password" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY);
    user.locationUpdate = new Date();
    await user.save();
    logData("Success","Login ",{
      "id":user._id,
      "name":user.name,
      "email":user.email,
      "zealId":user.zealId
    });
    res.status(201).json({
      message: "Login successful",
      token: token,
      scannedCodes: user.scannedCodes,
      name: user.name,
    });
  } catch (error) {
    console.error(error);
    console.log("Failure , Login : Internal Server Error")
    res.status(500).json({ message: "Internal Server Error" });
  }
};
const avatarSelection = async (req, res) => {
  try {
    const { avatar } = req.body;
    const { userId } = req.user;

    // Find the user by userId
    const user = await userModel.findById(userId);
    if (!user) {
      console.log("Failure : Avatar Selection , user not found , userId :", userId)
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user's avatar
    user.avatar = avatar;
    await user.save();
    logData("Success","Avatar Stored ",{
      "id":user._id,
      "name":user.name,
      "email":user.email,
      "zealId":user.zealId
    });
    res.status(200).json({ message: "Avatar stored successfully" });
  } catch (error) {
    console.error(error);
    console.log("Failure , Avatar selection , Internal Server Error")
    res.status(500).json({ message: "Internal Server Error" });
  }
};
const qrSelection = async (req, res) => {
  try {
    const { userId } = req.user;

    // Find the user by userId
    const user = await userModel.findById(userId);
    if (!user) {
      console.log("Failure : Qr code generation : User not found with userId : ",userId)
      return res.status(404).json({ message: "User not found" });
    }
    logData("Success","Qr code generated ",{
      "id":user._id,
      "name":user.name,
      "email":user.email,
      "zealId":user.zealId
    });
    res.status(200).json({ code: userId });
  } catch (error) {
    console.error(error);
    console.log("Failure , Qr code generation , Internal Server Error")
    res.status(500).json({ message: "Internal Server Error" });
  }
};
const scanQr = async (req, res) => {
  try {
    const { userId } = req.user;
    const user = await userModel.findById(userId);
    const endDate = new Date(`2024-05-${process.env.EndDate}T${process.env.EndHours}:${process.env.EndMinutes}:00`);
    const currentTime = new Date();
    if (currentTime >= endDate) {
      logData("Failure","Qr code scanning : Time Up ",{
        "id":user._id,
        "name":user.name,
        "email":user.email,
        "zealId":user.zealId
      });
  
      return res.status(200).json({ message: "Time Up",scannedCodes:user.scannedCodes });
    }
    const { code } = req.body;
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(code);
    if (!isValidObjectId) {
      logData("Failure","Qr code scanning : Invalid QR code format ",{
        "id":user._id,
        "name":user.name,
        "email":user.email,
        "zealId":user.zealId
      });
      return res.status(200).json({ message: "Invalid QR code format",scannedCodes:user.scannedCodes});
    }
    const scannedId = new ObjectId(code);
    const scannedUser = await userModel.findById(scannedId);

    if (!scannedUser) {
      logData("Failure","Qr code scanning : Scanned User not found ",{
        "id":user._id,
        "name":user.name,
        "email":user.email,
        "zealId":user.zealId
      });
      return res.status(200).json({ message: "User not found",scannedCodes:user.scannedCodes});
    }

    if (scannedId.equals(userId)) {
      logData("Failure","Qr code scanning : Don't scan your own QR code ",{
        "id":user._id,
        "name":user.name,
        "email":user.email,
        "zealId":user.zealId
      });
      return res.status(200).json({ message: "Don't scan your own QR code",scannedCodes:user.scannedCodes});
    }

    // Calculate gameDuration as the difference between the present time and startGame
    if (user.started) {
      const currentTime = new Date();
      const gameDuration = currentTime - user.startGame;
      user.gameDuration = gameDuration;
    }
    else {
      user.startGame= new Date();
      user.started=true;
    }

    // Increment membersFound for the user who scanned the QR code
    user.membersFound += 1;
    user.scannedCodes.push(scannedId);
    // Save the updated user document to the database
    await user.save();
    logData("Success","Qr code scanned",{
      "id":user._id,
      "name":user.name,
      "email":user.email,
      "zealId":user.zealId
    });
    res.status(200).json({ message: "QR Code scanned successfully",scannedCodes:user.scannedCodes});
  } catch (error) {
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      console.error("Validation Error:", validationErrors);
      res
        .status(400)
        .json({ message: "Validation Error", errors: validationErrors });
    } else {
      console.error(error);
      console.log("Failure , Qr code scanning : Interval Server Error")
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
};
const refreshLocation = async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await userModel.findById(userId);
    if (user.latitude === 0 && user.longitude === 0) {
      return res.status(200).json({ nearestUsers: [] });
    }
    // Calculate distance and initial bearing to the three nearest people
    let query = {
      _id: { $ne: userId }, // Exclude the current user
    };

    if (user.scannedCodes && user.scannedCodes.length > 0) {
      query._id.$nin = user.scannedCodes; // Exclude users in scannedCodes list
    }
    const users = await userModel.find(query);
    
    // Filter out users whose locationUpdate values are within the last 10 minutes

    // const currentTime = new Date(new Date().toUTCString());
    const validUsers = users.filter(user => {
      // Check if latitude and longitude are both not equal to 0
      const isValidLocation = user.latitude !== 0 && user.longitude !== 0;

      // Convert locationUpdate to IST and calculate time difference
      // const locationUpdateIST = user.locationUpdate;
      // const timeDifference = currentTime - locationUpdateIST;

      // Return true if location is valid and time difference is less than or equal to 10 minutes (600000 milliseconds)
      return isValidLocation ;
    });

    // Sort valid users by distance to the current user
    validUsers.sort((a, b) => {
      const distanceA = calculateDistance(
        user.latitude,
        user.longitude,
        a.latitude,
        a.longitude
      );
      const distanceB = calculateDistance(
        user.latitude,
        user.longitude,
        b.latitude,
        b.longitude
      );
      return distanceA - distanceB;
    });

    // Take the three nearest valid users
    const nearestUsers = validUsers.slice(0, 3);

    // Calculate distance and initial bearing for each nearest user
    const nearestUsersInfo = nearestUsers.map((nearestUser) => ({
      name: nearestUser.name,
      distance: calculateDistance(
        user.latitude,
        user.longitude,
        nearestUser.latitude,
        nearestUser.longitude
      ),
      direction: calculateInitialBearing(
        user.latitude,
        user.longitude,
        nearestUser.latitude,
        nearestUser.longitude
      ),
      avatar: nearestUser.avatar,
    }));
    
    if (user.started == false) {
      user.started = true;
      user.startGame = new Date();
      await user.save();
    }
    logData("Success","Location refresh request",{
      "id":user._id,
      "name":user.name,
      "email":user.email,
      "zealId":user.zealId
    });
    res.status(200).json({ nearestUsers: nearestUsersInfo });
  } catch (error) {
    console.error(error);
    console.log("Failure : Refresh location : Internal Server Error")
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const leaderboard = async (req, res) => {
  try {
    // Find users and sort them by membersFound in descending order, then by gameDuration in ascending orde
    const { userId } = req.user;
    const user = await userModel.findById(userId);
    const users = await userModel
      .find({ membersFound: { $gt: 0 } })
      .sort({ membersFound: -1, gameDuration: 1 });

    // Extract names, membersFound, and avatar values from the sorted list
    const usersInfo = users.map((user) => ({
      name: user.name,
      membersFound: user.membersFound,
      avatar: user.avatar,
    }));
    const usersWithoutMembers = await userModel
      .find({ membersFound: 0 })
      .select("name membersFound avatar");
    usersInfo.push(...usersWithoutMembers);
    logData("Success","Leaderboard request",{
      "id":user._id,
      "name":user.name,
      "email":user.email,
      "zealId":user.zealId
    });
    res.status(200).json({ users: usersInfo });
  } catch (error) {
    console.error(error);
    console.log("Failure , Leaderboard Request : Internal Server Error")
    res.status(500).json({ message: "Internal Server Error" });
  }
};
const avatarGet = async (req, res) => {
  try {
    const { userId } = req.user;

    // Find the user by userId
    const user = await userModel.findById(userId);
    if (!user) {
      console.log("Failure , Get Avatar request , User Not Found with userId: ",userId)
      return res.status(404).json({ message: "User not found" });
    }
    logData("Success","Avatar request",{
      "id":user._id,
      "name":user.name,
      "email":user.email,
      "zealId":user.zealId
    });
    res.status(200).json({ avatar: user.avatar });
  } catch (error) {
    console.error(error);
    console.log("Failure , Get Avatar : Internal Server Error")
    res.status(500).json({ message: "Internal Server Error" });
  }
};
const timer = async (req, res) => {
  try {
    const currentDate = new Date();
    const targetDate = new Date(`2024-05-${process.env.StartDate}T${process.env.StartHours}:${process.env.StartMinutes}:00`);
    const timeDifference = targetDate - currentDate;

    if (timeDifference > 0) {
      res.status(200).json({
        message: "The Game will start in some time",
        startGame: false,
        remainingTimeInMilliseconds: timeDifference,
      });
    } else {
      res
        .status(200)
        .json({
          message: "The game has already started",
          startGame: true,
          remainingTimeInMilliseconds: 0,
        });
    }
  } catch (error) {
    console.error(error);
    console.log("Failure : Timing request , Internal Server Error")
    res.status(500).json({ message: "Internal Server Error" });
  }
};
module.exports = {
  signup,
  login,
  avatarSelection,
  qrSelection,
  scanQr,
  refreshLocation,
  leaderboard,
  avatarGet,
  timer,
  logData
};
