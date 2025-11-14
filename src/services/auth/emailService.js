const transporter = require('../../config/email');

class EmailService {
  /**
   * Send OTP email to user
   * @param {string} to - Recipient email address
   * @param {string} otp - OTP code
   * @returns {Promise<boolean>} - Success status
   */
  async sendOTPEmail(to, otp) {
    console.log(`Sending OTP ${otp} to email: ${to}`);
    
    const mailOptions = {
      from: `"Prithvi Exchange" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: to,
      subject: 'Your OTP Code - Prithvi Exchange',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>OTP Verification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Prithvi Exchange</h1>
                <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0;">Secure OTP Verification</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">Hello,</h2>
                <p>You're just one step away from accessing your Prithvi Exchange account. Use the OTP below to complete your verification:</p>
                
                <div style="text-align: center; margin: 40px 0;">
                    <div style="display: inline-block; background-color: #f8f9fa; padding: 20px 40px; border-radius: 10px; border: 2px dashed #667eea;">
                        <div style="font-size: 42px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                            ${otp}
                        </div>
                    </div>
                </div>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #856404;">
                        <strong>Important:</strong> This OTP is valid for <strong>${process.env.OTP_EXPIRY_MINUTES || 5} minutes</strong>. 
                        Do not share this code with anyone.
                    </p>
                </div>
                
                <p style="color: #666;">If you didn't request this OTP, please ignore this email or contact our support team immediately.</p>
                
                <div style="border-top: 1px solid #e0e0e0; margin-top: 30px; padding-top: 20px;">
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        This is an automated message. Please do not reply to this email.<br>
                        &copy; ${new Date().getFullYear()} Prithvi Exchange. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
      `
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error(`Failed to send OTP email: ${error.message}`);
    }
  }

  /**
   * Send password reset email with reset link
   * @param {string} email - User email address
   * @param {string} resetUrl - Password reset URL
   * @returns {Promise<void>}
   */
  async sendPasswordResetEmail(email, resetUrl) {
    const mailOptions = {
      from: `"Prithvi Exchange" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request - Prithvi Exchange',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Prithvi Exchange</h1>
                <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0;">Password Reset Request</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">Need to reset your password?</h2>
                <p>We received a request to reset the password for your Prithvi Exchange account. Click the button below to create a new password:</p>
                
                <div style="text-align: center; margin: 40px 0;">
                    <a href="${resetUrl}" 
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                              color: white; 
                              padding: 16px 32px; 
                              text-decoration: none; 
                              border-radius: 8px; 
                              display: inline-block;
                              font-weight: bold; 
                              font-size: 16px;
                              box-shadow: 0 4px 15px 0 rgba(102, 126, 234, 0.3);
                              transition: all 0.3s ease;">
                        Reset Your Password
                    </a>
                </div>
                
                <p style="color: #666; text-align: center;">
                    Or copy and paste this link into your browser:<br>
                    <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
                </p>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #856404;">
                        <strong>Security Notice:</strong> This link will expire in 
                        <strong>${process.env.PASSWORD_RESET_EXPIRES_MINUTES || 10} minutes</strong>. 
                        If you didn't request this reset, please ignore this email and ensure your account is secure.
                    </p>
                </div>
                
                <div style="border-top: 1px solid #e0e0e0; margin-top: 30px; padding-top: 20px;">
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        For your security, this password reset link can only be used once.<br>
                        &copy; ${new Date().getFullYear()} Prithvi Exchange. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
      `
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Password reset email sent successfully. Message ID:', info.messageId);
    } catch (error) {
      console.error('Password reset email failed:', error);
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }
  }

  /**
   * Send password reset confirmation email
   * @param {string} email - User email address
   * @returns {Promise<void>}
   */
  async sendPasswordResetConfirmation(email) {
    const mailOptions = {
      from: `"Prithvi Exchange" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Successful - Prithvi Exchange',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset Successful</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Prithvi Exchange</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Password Reset Confirmation</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <div style="text-align: center; margin: 20px 0;">
                    <div style="background-color: #d4edda; border: 2px solid #c3e6cb; border-radius: 50%; width: 80px; height: 80px; display: inline-flex; align-items: center; justify-content: center;">
                        <span style="font-size: 36px; color: #155724;">✓</span>
                    </div>
                </div>
                
                <h2 style="color: #155724; text-align: center; margin-top: 0;">Password Reset Successful!</h2>
                
                <p style="text-align: center;">Your Prithvi Exchange account password has been successfully reset.</p>
                
                <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="color: #333; margin-top: 0;">Security Recommendations:</h3>
                    <ul style="color: #666; padding-left: 20px;">
                        <li>Use a strong, unique password that you don't use for other accounts</li>
                        <li>Enable two-factor authentication for added security</li>
                        <li>Regularly update your password</li>
                        <li>Never share your login credentials with anyone</li>
                    </ul>
                </div>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #856404; text-align: center;">
                        <strong>Important:</strong> If you did not perform this password reset, 
                        please contact our support team immediately.
                    </p>
                </div>
                
                <div style="border-top: 1px solid #e0e0e0; margin-top: 30px; padding-top: 20px;">
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        Thank you for helping us keep your account secure.<br>
                        &copy; ${new Date().getFullYear()} Prithvi Exchange. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
      `
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Password reset confirmation sent successfully. Message ID:', info.messageId);
    } catch (error) {
      console.error('Password reset confirmation email failed:', error);
      throw new Error(`Failed to send confirmation email: ${error.message}`);
    }
  }

  /**
   * Send welcome email to new users
   * @param {string} email - User email address
   * @param {string} userName - User's name
   * @returns {Promise<void>}
   */
  async sendWelcomeEmail(email, userName) {
    const mailOptions = {
      from: `"Prithvi Exchange" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Prithvi Exchange!',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Prithvi Exchange</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Prithvi Exchange!</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Your journey begins here</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">Hello ${userName},</h2>
                
                <p>Welcome to Prithvi Exchange! We're thrilled to have you on board and excited to help you with all your foreign exchange needs.</p>
                
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
                    <h3 style="color: #333; margin-top: 0;">Getting Started:</h3>
                    <ul style="color: #666; padding-left: 20px;">
                        <li>Complete your profile verification</li>
                        <li>Explore our competitive exchange rates</li>
                        <li>Set up your preferred payment methods</li>
                        <li>Start your first transaction</li>
                    </ul>
                </div>
                
                <p>If you have any questions or need assistance, our support team is here to help you every step of the way.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL}" 
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                              color: white; 
                              padding: 12px 24px; 
                              text-decoration: none; 
                              border-radius: 6px; 
                              display: inline-block;
                              font-weight: bold;">
                        Start Exploring
                    </a>
                </div>
                
                <div style="border-top: 1px solid #e0e0e0; margin-top: 30px; padding-top: 20px;">
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        Thank you for choosing Prithvi Exchange.<br>
                        &copy; ${new Date().getFullYear()} Prithvi Exchange. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
      `
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Welcome email sent successfully. Message ID:', info.messageId);
    } catch (error) {
      console.error('Welcome email failed:', error);
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }
  }
}

module.exports = new EmailService();