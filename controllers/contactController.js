import nodemailer from "nodemailer";

// Email transporter setup
const createTransporter = () => {
  // Debug logging
  console.log("Creating transporter with:", {
    hasEmailUser: !!process.env.EMAIL_USER,
    hasEmailPass: !!process.env.EMAIL_PASS,
    emailUser: process.env.EMAIL_USER // Log actual email (safe to log email address)
  });

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(`EMAIL_USER or EMAIL_PASS missing. EMAIL_USER exists: ${!!process.env.EMAIL_USER}, EMAIL_PASS exists: ${!!process.env.EMAIL_PASS}`);
  }

  return nodemailer.createTransporter({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    debug: true, // Enable debug output
    logger: true // Log to console
  });
};

export const sendContactEmail = async (req, res) => {
  console.log("Contact email endpoint hit");
  console.log("Request body:", req.body);
  console.log("Environment variables loaded:", {
    EMAIL_USER: !!process.env.EMAIL_USER,
    EMAIL_PASS: !!process.env.EMAIL_PASS,
    RECIPIENT_EMAIL: process.env.RECIPIENT_EMAIL || "Not set, using EMAIL_USER"
  });

  try {
    const { name, email, message } = req.body;

    // Validasi input
    if (!name || !email || !message) {
      console.log("Validation failed: missing fields");
      return res.status(400).json({
        success: false,
        message: "All fields are required",
        received: { name: !!name, email: !!email, message: !!message }
      });
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("Validation failed: invalid email format");
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    console.log("Creating transporter...");
    let transporter;
    try {
      transporter = createTransporter();
      console.log("Transporter created successfully");
    } catch (error) {
      console.error("Failed to create transporter:", error.message);
      return res.status(500).json({
        success: false,
        message: "Email configuration error. Please contact administrator.",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    // Test connection
    try {
      console.log("Verifying transporter connection...");
      await transporter.verify();
      console.log("Transporter verified successfully");
    } catch (error) {
      console.error("Transporter verification failed:", error);
      return res.status(500).json({
        success: false,
        message: "Email service connection failed. Please try again later.",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    const recipientEmail = process.env.RECIPIENT_EMAIL || process.env.EMAIL_USER;
    console.log("Sending to:", recipientEmail);

    // Email ke Anda (notification)
    const mailOptionsToYou = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: `New Contact Form Submission - ${name}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #8B5CF6; border-bottom: 2px solid #8B5CF6; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <div style="background: white; padding: 15px; border-left: 4px solid #8B5CF6; margin-top: 10px;">
              ${message.replace(/\n/g, "<br>")}
            </div>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background: #e0f2fe; border-radius: 8px;">
            <p style="margin: 0; color: #666;">
              <strong>Reply to:</strong> ${email}
            </p>
          </div>
          
          <footer style="margin-top: 20px; text-align: center; color: #666; font-size: 14px;">
            Sent from Jefta Portfolio Contact Form
          </footer>
        </div>
      `,
    };

    // Auto-reply ke sender
    const mailOptionsAutoReply = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Thank you for contacting me!",
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #8B5CF6;">Hi ${name}!</h2>
          
          <p>Thank you for reaching out through my portfolio contact form.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Your message:</h3>
            <p style="font-style: italic;">"${message}"</p>
          </div>
          
          <p>I've received your message and will get back to you as soon as possible, usually within 24-48 hours.</p>
          
          <div style="margin: 20px 0; padding: 15px; background: linear-gradient(135deg, #8B5CF6, #EC4899); border-radius: 8px;">
            <p style="color: white; margin: 0; text-align: center;">
              <strong>Looking forward to connecting with you!</strong>
            </p>
          </div>
          
          <footer style="margin-top: 20px; color: #666; font-size: 14px;">
            Best regards,<br>
            <strong>Jefta</strong><br>
            <a href="mailto:${process.env.EMAIL_USER}" style="color: #8B5CF6;">${process.env.EMAIL_USER}</a>
          </footer>
        </div>
      `,
    };

    // Send emails with better error handling
    try {
      console.log("Sending notification email...");
      const info1 = await transporter.sendMail(mailOptionsToYou);
      console.log("Notification email sent:", info1.messageId);
      
      console.log("Sending auto-reply email...");
      const info2 = await transporter.sendMail(mailOptionsAutoReply);
      console.log("Auto-reply email sent:", info2.messageId);

      res.status(200).json({
        success: true,
        message: "Message sent successfully!",
      });
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      
      // Check for common Gmail errors
      if (emailError.code === 'EAUTH') {
        return res.status(500).json({
          success: false,
          message: "Email authentication failed. Please check your email configuration.",
          hint: "Make sure you're using an App Password, not your regular Gmail password"
        });
      }
      
      throw emailError; // Re-throw to be caught by outer catch
    }

  } catch (error) {
    console.error("Contact email error:", error);
    console.error("Error stack:", error.stack);
    
    res.status(500).json({
      success: false,
      message: "Failed to send message. Please try again later.",
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code,
        command: error.command
      } : undefined
    });
  }
};