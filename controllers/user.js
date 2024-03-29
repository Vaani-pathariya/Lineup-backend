const userModel = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
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
    });

    let user = await newUser.save();
    const token = jwt.sign({ userId: user._id }, "your-secret-key");
    res.status(201).json({ message: "Signup successful", token: token });
  } catch (error) {
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
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Compare the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, "your-secret-key");

    res
      .status(201)
      .json({
        message: "Login successful",
        token: token,
        scannedCodes: user.scannedCodes,
      });
  } catch (error) {
    console.error(error);
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
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user's avatar
    user.avatar = avatar;
    await user.save();

    res.status(200).json({ message: "Avatar stored successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
const qrSelection = async (req, res) => {
  try {
    const { userId } = req.user;

    // Find the user by userId
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ code: userId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
const scanQr = async (req, res) => {
  try {
    const { code } = req.body;
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(code);
    if (!isValidObjectId) {
      console.log("invalid");
      return res.status(400).json({ message: "Invalid QR code format" });
    }
    const { userId } = req.user;
    const scannedId = new ObjectId(code);
    const scannedUser = await userModel.findById(scannedId);

    if (!scannedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (scannedId.equals(userId)) {
      return res.status(403).json({ message: "Don't scan your own QR code" });
    }

    // Calculate gameDuration as the difference between the present time and startGame
    const user = await userModel.findById(userId);
    if (user.startGame) {
      const currentTime = new Date();
      const gameDuration = currentTime - user.startGame;
      user.gameDuration = gameDuration;
    }

    // Increment membersFound for the user who scanned the QR code
    user.membersFound += 1;
    user.scannedCodes.push(scannedId);
    // Save the updated user document to the database
    await user.save();
    console.log("scanned");
    res.status(200).json({ message: "QR Code scanned successfully" });
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
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
};
const refreshLocation = async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await userModel.findById(userId);

    // Calculate distance and initial bearing to the three nearest people
    let query = {
      _id: { $ne: userId }, // Exclude the current user
    };

    if (user.scannedCodes && user.scannedCodes.length > 0) {
      query._id.$nin = user.scannedCodes; // Exclude users in scannedCodes list
    }
    const users = await userModel.find(query);
    // Sort users by distance to the current user
    users.sort((a, b) => {
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

    // Take the three nearest users
    const nearestUsers = users
      .filter((nearestUser) => nearestUser._id !== userId)
      .slice(0, 3);

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
      avatar:nearestUser.avatar
    }));
    if (user.started == false) {
      user.started = true;
      user.startGame = new Date();
      await user.save();
    }
    res.status(200).json({ nearestUsers: nearestUsersInfo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
const leaderboard = async (req, res) => {
  try {
    // Find users and sort them by membersFound in descending order, then by gameDuration in ascending order
    const users = await userModel
      .find({ membersFound: { $gt: 0 } })
      .sort({ membersFound: -1, gameDuration: 1 });

    // Extract names, membersFound, and avatar values from the sorted list
    const usersInfo = users.map((user) => ({
      name: user.name,
      membersFound: user.membersFound,
      avatar: user.avatar,
    }));
    const usersWithoutMembers = await userModel.find({ membersFound: 0 }).select("name membersFound avatar");
    usersInfo.push(...usersWithoutMembers);
    res.status(200).json({ users: usersInfo });
  } catch (error) {
    console.error(error);
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
};
