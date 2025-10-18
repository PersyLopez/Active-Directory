// Vercel serverless function for handling service requests
const nodemailer = require('nodemailer');

// Simple in-memory storage (in production, use a database like Supabase, PlanetScale, or MongoDB)
let serviceRequests = [];

// Email configuration (using Gmail SMTP - free tier)
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // Set in Vercel environment variables
      pass: process.env.EMAIL_PASS  // Set in Vercel environment variables
    }
  });
};

// Send email notification
async function sendServiceRequestEmail(requestData) {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER, // Admin email
      subject: `🚨 New Service Request - ${requestData.service}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">🚨 New Service Request</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Service Details</h3>
            <p><strong>Service Type:</strong> ${requestData.service}</p>
            <p><strong>Request ID:</strong> ${requestData.id}</p>
            <p><strong>Timestamp:</strong> ${new Date(requestData.timestamp).toLocaleString()}</p>
          </div>
          
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${requestData.name}</p>
            <p><strong>Phone:</strong> <a href="tel:${requestData.phone}">${requestData.phone}</a></p>
            <p><strong>Email:</strong> ${requestData.email || 'Not provided'}</p>
          </div>
          
          <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Vehicle Information</h3>
            <p><strong>Year:</strong> ${requestData.vehicleYear || 'Not specified'}</p>
            <p><strong>Make:</strong> ${requestData.vehicleMake || 'Not specified'}</p>
            <p><strong>Model:</strong> ${requestData.vehicleModel || 'Not specified'}</p>
          </div>
          
          <div style="background: #f3e5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Problem Description</h3>
            <p>${requestData.problemDescription || 'No description provided'}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="tel:${requestData.phone}" 
               style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              📞 Call Customer Now
            </a>
          </div>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log('✅ Service request email sent successfully');
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    // Don't throw error - email failure shouldn't break the request
  }
}

// Send confirmation email to customer
async function sendCustomerConfirmation(requestData) {
  try {
    if (!requestData.email) return; // Skip if no email provided
    
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: requestData.email,
      subject: '✅ Service Request Confirmed - Fix&Go Mobile Tire Service',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">✅ Service Request Confirmed</h2>
          
          <p>Dear ${requestData.name},</p>
          
          <p>Thank you for choosing Fix&Go Mobile Tire Service! We've received your service request and will contact you shortly.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Request Details</h3>
            <p><strong>Service:</strong> ${requestData.service}</p>
            <p><strong>Request ID:</strong> ${requestData.id}</p>
            <p><strong>Submitted:</strong> ${new Date(requestData.timestamp).toLocaleString()}</p>
          </div>
          
          <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>🚨 Emergency Contact</h3>
            <p>If you need immediate assistance, please call us at:</p>
            <p style="font-size: 24px; font-weight: bold; color: #dc3545;">
              <a href="tel:5551234567">(555) 123-4567</a>
            </p>
          </div>
          
          <p>We'll be in touch soon to confirm your service appointment.</p>
          
          <p>Best regards,<br>Fix&Go Mobile Tire Service Team</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log('✅ Customer confirmation email sent');
    
  } catch (error) {
    console.error('❌ Error sending customer confirmation:', error);
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }
  
  try {
    const requestData = {
      id: `FG${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...req.body,
      status: 'pending'
    };
    
    // Store the request (in production, save to database)
    serviceRequests.push(requestData);
    
    // Send email notifications
    await Promise.all([
      sendServiceRequestEmail(requestData),
      sendCustomerConfirmation(requestData)
    ]);
    
    console.log('✅ Service request processed:', requestData.id);
    
    res.status(200).json({
      success: true,
      message: 'Service request submitted successfully',
      requestId: requestData.id,
      timestamp: requestData.timestamp
    });
    
  } catch (error) {
    console.error('❌ Error processing service request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process service request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
