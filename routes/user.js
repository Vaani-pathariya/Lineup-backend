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
} = require("../controllers/user");

router.post("/signup", signup);
//Login route
router.post("/login", login);
router.post("/store-avatar", authenticateToken, avatarSelection);
router.get("/generate-qr", authenticateToken, qrSelection);
router.post("/scan-qrcode", authenticateToken, scanQr);
router.get("/refresh-location", authenticateToken, refreshLocation);

router.get("/leaderboard", authenticateToken, leaderboard);
module.exports = router;
