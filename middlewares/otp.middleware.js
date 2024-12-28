const Otp = require('../models/otp.model.js');

module.exports.checkOtpExpiration = async (req, res, next) => {
  const { email,phone,otp: enteredOtp } = req.body;

  try {
    
    const otpRecord = await Otp.findOne({
      $or: [
        { email: email },
        { phone: phone }
      ]
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP not found' });
    }

    const currentTime = new Date(); 
    const expirationTime = new Date(otpRecord.expiration);


    if (currentTime.getTime() > expirationTime.getTime()) {
      return res.status(400).json({ message: 'OTP has expired',
        debug: {
          currentTime: currentTime.toISOString(),
          expirationTime: expirationTime.toISOString(),
          timeDifferenceMinutes: (expirationTime - currentTime) / (1000 * 60)
        }
       });
    }

    if (otpRecord.otp !== parseInt(enteredOtp)) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    req.otpRecord = otpRecord;

    next();
  } catch (err) {
    console.error('OTP Validation Error:',err);
    res.status(500).json({ message: 'Error checking OTP expiration' });
  }
};
