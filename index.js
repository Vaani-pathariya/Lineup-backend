const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const userModel = require("./models");
const bcrypt = require("bcrypt");
const authenticateToken = require("./authenticateToken");
const jwt = require("jsonwebtoken");
const app = express();
const teamModel = require("./teams");
const http = require("http");
const socketIO = require("socket.io");
const server = http.createServer(app);
const { ObjectId } = require("mongodb");
const io = socketIO(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check if the origin is allowed
      const allowedOrigins = ["http://localhost:3000"];
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});
const port = 8000;
app.use(cors());

mongoose.connect(
  "mongodb+srv://vaani:vaani@cluster0.7uf5zvr.mongodb.net/Lineup?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
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
  
    return { initialBearing, compassDirection };
  }
  function compassDirectionFromBearing(bearing) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45);
    return directions[(index % 8 + 8) % 8];
  }
app.get("/", async (req, res) => {
  const user = await userModel.find({});
  res.send(user);
});
//signup route
app.post("/signup", async (req, res) => {
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
    const token = jwt.sign({ userId: user._id }, "your-secret-key", {
      expiresIn: "1h",
    });
    res.status(201).json({ message: "Signup successful", token: token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
//Login route
app.post("/login", async (req, res) => {
  try {
    const { zealId, password } = req.body;

    // Find the user by email
    const user = await userModel.findOne({ zealId });
    if (!user) {
      return res.status(401).json({ message: "Invalid zealId or password" });
    }

    // Compare the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid zealId or password" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, "your-secret-key", {
      expiresIn: "1h",
    });

    res.json({ message: "Signup successful", token:token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.post("/store-avatar", authenticateToken, async (req, res) => {
  try {
    const { avatar } = req.body;
    const { userId } = req.user;

    // Find the user by userId
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user's name
    user.avatar = avatar;
    await user.save();

    res.status(200).json({ message: "Avatar stored successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.get("/generate-qr", authenticateToken, async (req, res) => {
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
});
app.post("/scan-qrcode", authenticateToken, async (req, res) => {
  try {
    const { scannedCode, teamIdStr } = req.body;
    const teamId = new ObjectId(teamIdStr);
    const { userId } = req.user;
    const scannedId = new ObjectId(scannedCode);
    const team = await teamModel.findById(teamId);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Check if the scanned ID is one of the team members
    if (
      ![team.member1, team.member2, team.member3, team.member4].some(
        (memberId) => memberId.equals(scannedId)
      )
    ) {
      return res
        .status(403)
        .json({ message: "Scanned ID does not match any team member" });
    }

    const scannedUser = await userModel.findById(scannedId);

    if (!scannedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (scannedId.equals(userId)) {
      return res.status(403).json({ message: "Don't scan your own QR code" });
    }

    const userMain = await userModel.findById(userId);
    const { membersFound } = userMain;
    if (membersFound === 3) {
      return res
        .status(404)
        .json({ message: "You have already completed the game" });
    } else if (membersFound === 2) {
      userMain.membersFound += 1; // Increase the value of members
      const currentDate = new Date();
      const gameDuration = currentDate - userMain.startGame;
      userMain.gameDuration = gameDuration;
      userMain.save();
      return res
        .status(200)
        .json({ message: "Congratulations! You have completed the game" });
    } else if (membersFound < 2) {
      userMain.membersFound = membersFound + 1;
      const currentDate = new Date();
      const gameDuration = currentDate - userMain.startGame;
      userMain.gameDuration = gameDuration;
      userMain.save();
    }
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
});

app.get("/leaderboard", authenticateToken, async (req, res) => {
  try {
    // Find users with membersFound equal to 3 and sort by gameDuration in ascending order
    const usersFound3 = await userModel
      .find({ membersFound: 3 })
      .sort({ gameDuration: 1 });

    // Find users with membersFound equal to 2 and sort by gameDuration in ascending order
    const usersFound2 = await userModel
      .find({ membersFound: 2 })
      .sort({ gameDuration: 1 });

    // Find users with membersFound equal to 1 and sort by gameDuration in ascending order
    const usersFound1 = await userModel
      .find({ membersFound: 1 })
      .sort({ gameDuration: 1 });

    // Concatenate the results of all three queries
    const finalList = [...usersFound3, ...usersFound2, ...usersFound1];

    // Extract names and membersFound values from the final list
    const usersInfo = finalList.map((user) => ({
      name: user.name,
      membersFound: user.membersFound,
    }));

    res.status(200).json({ users: usersInfo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
const usersPlaying = [];
const running = false;
io.on("connection", (socket) => {
  console.log("connected");
  socket.on("authenticate", (token) => {
    try {
      const decoded = jwt.verify(token, "your-secret-key");
      console.log("Auth done");
      socket.join(decoded.userId);
    } catch (error) {
      console.error("Authentication failed:", error.message);
    }
  });
  // This will be used when the user is moving , but what if the user is stationary,
  socket.on("locationChange", async (data) => {
    try {
      const userId = jwt.verify(data.userToken, "your-secret-key").userId;
      const teamId = new ObjectId(data.teamId);
      const team = await userModel.findById(teamId);
      const user = await userModel.findById(userId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (
        ![team.member1, team.member2, team.member3, team.member4].some(
          (memberId) => memberId.equals(userId)
        )
      ) {
        return res
          .status(403)
          .json({ message: "UserId does not match any team member" });
      }
      (user.latitude = data.latitude), (user.longitude = data.longitude);
      user.save();
      const locationData = [];
      [team.member1, team.member2, team.member3, team.member4].forEach(
        async (memberId) => {
          if (!memberId.equals(userId)) {
            const member = await userModel.findById(memberId);
            if (member) {
              const distance = calculateDistance(
                user.latitude,
                user.longitude,
                member.latitude,
                member.longitude
              );
              const directions = calculateInitialBearing(
                user.latitude,
                user.longitude,
                member.latitude,
                member.longitude
              );
              locationData.push({ userId: member._id, distance: distance, directions:directions });
              io.to(member._id).emit("MemberLocationChange", {userId,distance,directions});
            }
          }
        }
      );
      socket.emit("LocationData", { locationData });
    } catch (error) {
      console.error(error.message);
    }
  });
  socket.on("startGame", async (data) => {
    try {
      const userId = jwt.verify(data.userToken, "your-secret-key").userId;
      const user = await userModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      user.startGame = new Date();
      user.save();
    } catch (error) {
      console.error(error.message);
    }
  });
  socket.on("assignTeams", async (data) => {
    try {
      const userId = jwt.verify(data.userToken, "your-secret-key").userId;
      const user = await userModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      usersPlaying.push(userId);
      if (usersPlaying.length >= 4 && !running) {
        running = true;

        while (usersPlaying.length >= 4) {
          const teamMembers = usersPlaying.splice(0, 4);
          const newTeam = await createTeam(teamMembers);
          emitTeamInformation(teamMembers, newTeam._id);
        }

        running = false;
      }
    } catch (error) {
      console.error(error.message);
    }
  });
  const createTeam = async (teamMembers) => {
    const newTeam = new teamModel({
      member1: teamMembers[0],
      member2: teamMembers[1],
      member3: teamMembers[2],
      member4: teamMembers[3],
    });

    return await newTeam.save();
  };

  const emitTeamInformation = (teamMembers, teamId) => {
    // Emit team information to each team member
    teamMembers.forEach((memberId) => {
      io.to(memberId).emit("teamInformation", { teamId, teamMembers });
    });
  };
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});
server.listen(port, () => {
  console.log(`Hello world app listening on port ${port}!`);
});
