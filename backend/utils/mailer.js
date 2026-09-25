const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

const sendInviteEmail = async (toEmail, name, inviteCode) => {
  await transporter.sendMail({
    from: `"Workforce Platform" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your employee invite code",
    text: `Hi ${name},\n\nYour invite code to create your account is: ${inviteCode}\n\nUse this along with your email when signing up.`,
  });
};

module.exports = { sendInviteEmail };
