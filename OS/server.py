#!/usr/bin/env python3
"""
Simple HTTP server for TXT OS
Run this instead of opening the HTML file directly to avoid CORS issues.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow cross-origin requests
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_GET(self):
        # Redirect root to index-modern.html
        if self.path == '/' or self.path == '':
            self.path = '/index-modern.html'
        return super().do_GET()

def main():
    # Change to the script directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    handler = MyHTTPRequestHandler
    
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"🚀 TXT OS Server starting...")
        print(f"📍 Serving at: http://localhost:{PORT}")
        print(f"🎯 Main app: http://localhost:{PORT}/index-modern.html")
        print(f"⚙️  Settings: Press Ctrl+C to stop server")
        print("-" * 50)
        
        # Try to open browser automatically
        try:
            webbrowser.open(f'http://localhost:{PORT}')
            print("🌐 Opened browser automatically")
        except:
            print("❗ Please open http://localhost:8000 in your browser")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped by user")
            sys.exit(0)

if __name__ == "__main__":
    main()