#!/usr/bin/env python3
"""
Simple server entry point for PixGone
This file imports and runs the main server from server_ormbg_only.py
"""

import uvicorn
from server_ormbg_only import app

if __name__ == "__main__":
    print("🚀 Starting PixGone Server...")
    print("📍 Server will be available at: http://localhost:9876")
    print("📖 API docs available at: http://localhost:9876/docs")
    print("🔧 Health check at: http://localhost:9876/health")
    print("")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=9876,
        reload=False,
        log_level="info"
    ) 