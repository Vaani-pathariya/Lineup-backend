const express = require('express');

const { generateOtp, verifyOtp ,clearOtpDatabase} = require('../controllers/otp.controller.js');

const { authenticateToken } = require('../middlewares/index.js');
const { checkOtpExpiration } = require('../middlewares/otp.middleware.js');

const router = express.Router();

router.post('/generate-otp', generateOtp);
router.post('/verify-otp',  checkOtpExpiration,verifyOtp);

// remove in end
router.post('/clear-database', clearOtpDatabase);

module.exports = router;
