const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const userModel = require("./models/user");

const otpRoutes = require('./routes/otp.routes.js');

const jwt = require("jsonwebtoken");
const app = express();
require("dotenv").config();
const userRouter = require("./routes/user");
const { logData } = require("./controllers/user");
const http = require("http");
const socketIO = require("socket.io");
const server = http.createServer(app);
const { connectMongoDb } = require("./connection");
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
const port = 8001;
app.use(cors());

connectMongoDb(process.env.MONGO_URI);

// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use("/user", userRouter);

app.use('/api/otp', otpRoutes);

// basic get request
app.get("/", async (req, res) => {
  res.json({ message: "Working" });
});
//signup route
io.on("connection", (socket) => {
  console.log("User connected");
  socket.on("locationChange", async (data) => {
    try {
      const userId = jwt.verify(data.token, process.env.SECRET_KEY).userId;
      const user = await userModel.findById(userId);
      if (!user) {
        console.log("Failure: Location not saved , User not found with id :" ,userId )
        return res.status(404).json({ message: "User not found" });
      }
      user.latitude = data.latitude;
      user.longitude = data.longitude;
      user.locationUpdate = new Date();
      user.save();
      logData("Success", "Location Saved", {
        id: user._id,
        name: user.name,
        email: user.email,
        zealId: user.zealId,
      });
    } catch (error) {
      console.error(error.message);
    }
  });
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});
server.listen(port, () => {
  console.log(`Hello world app listening on port ${port}!`);
});
