import nodemailer from "nodemailer"; // Ganti dari require ke import

// Email transporter setup
const createTransporter = () => {
  // pastikan sudah pakai APP PASSWORD 16 karakter di .env
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER / EMAIL_PASS are missing");
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465, // 465 = SSL/TLS
    secure: true, // harus true untuk port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // <-- APP PASSWORD, bukan password biasa
    },
  });
};

export const sendContactEmail = async (req, res) => {
  // Ganti dari 'exports const' ke 'export const'
  try {
    const { name, email, message } = req.body;

    // Validasi input
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const transporter = createTransporter();

    // Email ke Anda (notification)
    const mailOptionsToYou = {
      from: process.env.EMAIL_USER,
      to: process.env.RECIPIENT_EMAIL || process.env.EMAIL_USER,
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

    // Send emails
    await transporter.sendMail(mailOptionsToYou);
    await transporter.sendMail(mailOptionsAutoReply);

    res.status(200).json({
      success: true,
      message: "Message sent successfully!",
    });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message. Please try again later.",
    });
  }
};
