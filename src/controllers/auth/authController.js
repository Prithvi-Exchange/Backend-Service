const { validationResult } = require('express-validator');
const authService = require('../../services/auth/authService');

exports.signup = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phoneNumber, password } = req.body;
    const result = await authService.signup(name, email, phoneNumber, password);
    res.json(result);
  } catch (error) {
    console.log("Signup error:", error);
    res.status(400).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, phoneNumber, password } = req.body;
    console.log("Login request:", { email, phoneNumber, password });
    const result = await authService.login(email, phoneNumber, password);
      console.log("Login result:", result);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;
    const result = await authService.verifyOtp(email, otp);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};