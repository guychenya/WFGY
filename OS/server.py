#!/usr/bin/env python3
"""
Simple HTTP server for TXT OS
Run this instead of opening the HTML file directly to avoid CORS issues.
It also acts as a proxy for the Ollama server to avoid CORS issues.
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import json
import requests

PORT = 8000
OLLAMA_API_BASE = "http://127.0.0.1:11434/api"

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow cross-origin requests
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/ollama/'):
            self.proxy_to_ollama()
        else:
            if self.path == '/' or self.path == '':
                self.path = '/index.html'
            return super().do_GET()

    def do_POST(self):
        if self.path.startswith('/ollama/'):
            self.proxy_to_ollama()
        else:
            self.send_response(404)
            self.end_headers()

    def proxy_to_ollama(self):
        try:
            ollama_url = f"{OLLAMA_API_BASE}{self.path[len('/ollama'):]}"
            
            headers = dict(self.headers)
            # The Host header will be for our proxy server, so we remove it
            # and requests will fill it in with the correct host for the ollama server.
            if 'Host' in headers:
                del headers['Host']

            if self.command == 'POST':
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                resp = requests.post(ollama_url, headers=headers, data=body, stream=True)
            else: # GET
                resp = requests.get(ollama_url, headers=headers, stream=True)

            self.send_response(resp.status_code)
            for key, value in resp.headers.items():
                # We are already sending our own CORS headers
                if key.lower() not in ['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers']:
                    self.send_header(key, value)
            self.end_headers()
            
            for chunk in resp.iter_content(chunk_size=8192):
                self.wfile.write(chunk)

        except Exception as e:
            self.send_error(500, f"Proxy Error: {e}")


def main():
    # Change to the script directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    handler = MyHTTPRequestHandler
    
    with socketserver.TCPServer(('', PORT), handler) as httpd:
        print(f"🚀 TXT OS Server starting...")
        print(f"📍 Serving at: http://localhost:{PORT}")
        print(f"🎯 Main app: http://localhost:{PORT}/index.html")
        print(f"⚡️ Proxying /ollama/ to {OLLAMA_API_BASE}")
        print(f"⚙️  Settings: Press Ctrl+C to stop server")
        print("-" * 50)
        
        # Try to open browser automatically
        try:
            webbrowser.open(f'http://localhost:{PORT}/test-connection.html')
            print("🌐 Opened browser automatically")
        except:
            print("❗ Please open http://localhost:8000/test-connection.html in your browser")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped by user")
            sys.exit(0)

if __name__ == "__main__":
    main()
