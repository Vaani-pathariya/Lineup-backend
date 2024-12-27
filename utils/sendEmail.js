const { Resend } = require('resend');
const resend = new Resend('re_WSSXqiFY_GhRPG5tC91VFSnmPmHBR6Hd1'); // Replace with your Resend API key

const sendEmail = async (email, otp) => {
  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev', // Replace with your verified sender
      to: email,
      subject: 'Your OTP Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>OTP Verification</h2>
          <p>Your verification code is:</p>
          <h1 style="color: #4F46E5; font-size: 32px; letter-spacing: 4px;">${otp}</h1>
          <p>This code will expire in 5 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `
    });

    return { success: true, data };
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Failed to send email: ' + error.message);
  }
};

module.exports = sendEmail;