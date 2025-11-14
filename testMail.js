require("dotenv").config();
const nodemailer = require("nodemailer");

async function testMail() {
  try {
    // Create transporter using Gmail service
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Verify connection config
    await transporter.verify();
    console.log("✅ Connected to Gmail SMTP successfully");

    // Send mail
    const info = await transporter.sendMail({
      from: `"Prithvi Exchange" <${process.env.EMAIL_USER}>`,
      to: "shubhamrai2508@gmail.com", // test receiver
      subject: "Test Mail ✔",
      text: "Hello Shubham, this is a test email from Nodemailer using Gmail App Password!",
    });

    console.log("✅ Mail sent successfully:", info.messageId);
  } catch (err) {
    console.error("❌ Mail error:", err);
  }
}

testMail();
