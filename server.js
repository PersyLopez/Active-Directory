const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Store service requests in memory (in production, use a database)
const serviceRequests = [];

// API Routes
app.post('/api/service-request', (req, res) => {
  try {
    const requestData = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...req.body,
      status: 'pending'
    };
    
    // Store the request
    serviceRequests.push(requestData);
    
    // Log the request (in production, save to database)
    console.log('New service request:', requestData);
    
    // Send confirmation email (simulated)
    sendConfirmationEmail(requestData);
    
    res.json({
      success: true,
      message: 'Service request submitted successfully',
      requestId: requestData.id
    });
    
  } catch (error) {
    console.error('Error processing service request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process service request'
    });
  }
});

// Get all service requests (admin endpoint)
app.get('/api/service-requests', (req, res) => {
  res.json({
    success: true,
    requests: serviceRequests
  });
});

// Update request status
app.put('/api/service-request/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const request = serviceRequests.find(r => r.id === id);
  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Service request not found'
    });
  }
  
  request.status = status;
  request.updatedAt = new Date().toISOString();
  
  res.json({
    success: true,
    message: 'Status updated successfully',
    request
  });
});

// Simulate email sending
function sendConfirmationEmail(requestData) {
  console.log('📧 Sending confirmation email to:', requestData.email || requestData.phone);
  console.log('📧 Email content:');
  console.log(`   Service: ${requestData.service}`);
  console.log(`   Customer: ${requestData.name}`);
  console.log(`   Phone: ${requestData.phone}`);
  console.log(`   Vehicle: ${requestData.vehicleYear} ${requestData.vehicleMake} ${requestData.vehicleModel}`);
  console.log(`   Problem: ${requestData.problemDescription}`);
  
  // In production, integrate with email service like SendGrid, AWS SES, etc.
  // For now, just log the email content
}

// Serve the main website
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Fix&Go server running on http://0.0.0.0:${PORT}`);
  console.log(`📱 Access from iPad: http://192.168.1.29:${PORT}`);
  console.log(`🔧 API endpoints:`);
  console.log(`   POST /api/service-request - Submit service request`);
  console.log(`   GET  /api/service-requests - Get all requests (admin)`);
  console.log(`   PUT  /api/service-request/:id/status - Update request status`);
});

module.exports = app;
