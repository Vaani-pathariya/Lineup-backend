const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares");
const {
  signup,
  login,
  avatarSelection,
  qrSelection,
  scanQr,
  refreshLocation,
  leaderboard,
  avatarGet,
  timer
} = require("../controllers/user");
//Signup route 
router.post("/signup", signup);
//Login route
router.post("/login", login);
//Store avatar
router.post("/store-avatar", authenticateToken, avatarSelection);
//Generate Qr
router.get("/generate-qr", authenticateToken, qrSelection);
//Scan Qr
router.post("/scan-qrcode", authenticateToken, scanQr);
//Refresh location route 
router.get("/refresh-location", authenticateToken, refreshLocation);
//Access leaderboard values 
router.get("/leaderboard", authenticateToken, leaderboard);
//Get avatar of the user 
router.get("/get-avatar",authenticateToken, avatarGet )
//send timer details 
router.get("/timer",authenticateToken,timer)
module.exports = router;
