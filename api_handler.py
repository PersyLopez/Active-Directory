#!/usr/bin/env python3
"""
Simple Python backend for Fix&Go Mobile Tire Service
Handles service requests and email notifications
"""

import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

# In-memory storage (in production, use a database)
service_requests = []

class APIHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_POST(self):
        """Handle service request submissions"""
        if self.path == '/api/service-request':
            self.handle_service_request()
        else:
            self.send_error(404)
    
    def do_GET(self):
        """Handle admin requests"""
        if self.path == '/api/requests':
            self.handle_get_requests()
        else:
            self.send_error(404)
    
    def handle_service_request(self):
        """Process service request submission"""
        try:
            # Read request data
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_data = json.loads(post_data.decode('utf-8'))
            
            # Add metadata
            request_data['id'] = f"FG{int(datetime.now().timestamp())}"
            request_data['timestamp'] = datetime.now().isoformat()
            request_data['status'] = 'pending'
            
            # Store request
            service_requests.append(request_data)
            
            # Send email notifications (simulated)
            self.send_email_notification(request_data)
            
            # Send success response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                'success': True,
                'message': 'Service request submitted successfully',
                'requestId': request_data['id'],
                'timestamp': request_data['timestamp']
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
            print(f"✅ Service request processed: {request_data['id']}")
            
        except Exception as e:
            print(f"❌ Error processing service request: {e}")
            self.send_error(500, f"Internal server error: {str(e)}")
    
    def handle_get_requests(self):
        """Return all service requests (admin endpoint)"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response = {
            'success': True,
            'requests': service_requests,
            'count': len(service_requests)
        }
        self.wfile.write(json.dumps(response).encode('utf-8'))
    
    def send_email_notification(self, request_data):
        """Send email notification (simulated)"""
        try:
            print(f"📧 Email notification for request {request_data['id']}")
            print(f"   Service: {request_data.get('service', 'Unknown')}")
            print(f"   Customer: {request_data.get('name', 'Unknown')}")
            print(f"   Phone: {request_data.get('phone', 'Unknown')}")
            print(f"   Email: {request_data.get('email', 'Not provided')}")
            print(f"   Vehicle: {request_data.get('vehicleYear', '')} {request_data.get('vehicleMake', '')} {request_data.get('vehicleModel', '')}")
            print(f"   Problem: {request_data.get('problemDescription', 'No description')}")
            print("   📞 Emergency Line: (555) 123-4567")
            print("   ✅ Email sent successfully (simulated)")
            
        except Exception as e:
            print(f"❌ Error sending email: {e}")

def run_api_server(port=8081):
    """Start the API server"""
    server = HTTPServer(('0.0.0.0', port), APIHandler)
    print(f"🚀 Fix&Go API server running on port {port}")
    print(f"📱 Access from iPad: http://192.168.1.29:{port}")
    print(f"🔧 API endpoints:")
    print(f"   POST /api/service-request - Submit service request")
    print(f"   GET  /api/requests - Get all requests (admin)")
    server.serve_forever()

if __name__ == '__main__':
    run_api_server()
