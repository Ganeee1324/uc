#!/usr/bin/env python3
"""
Script to start the Celery worker and beat scheduler for file processing.
"""

import os
import sys
import subprocess
import signal
import time
from threading import Thread
from celery_config import celery_app

def start_worker():
    """Start the Celery worker"""
    # Set environment variables for CUDA if needed
    os.environ.setdefault("CUDA_VISIBLE_DEVICES", "0")  # Use first GPU by default
    
    # Start worker with appropriate configuration
    worker_args = [
        "worker",
        "--app=celery_config:celery_app",
        "--loglevel=info",
        "--concurrency=1",  # Only one worker process to ensure single model in VRAM
        "--pool=solo",  # Use solo pool for single-threaded execution
        "--queues=file_processing",
        "--hostname=file_processor@%h",
        "--max-tasks-per-child=10",  # Restart after 10 tasks to prevent memory leaks
        "--without-gossip",
        "--without-mingle",
        "--without-heartbeat"
    ]
    
    print("Starting Celery worker for file processing...")
    print(f"Worker will process tasks from queue: file_processing")
    print(f"Concurrency: 1 (single model in VRAM)")
    
    # Start the worker
    celery_app.worker_main(argv=worker_args)

def start_beat():
    """Start the Celery beat scheduler"""
    beat_args = [
        "beat",
        "--app=celery_config:celery_app",
        "--loglevel=info",
        "--schedule=/tmp/celerybeat-schedule",
        "--pidfile=/tmp/celerybeat.pid"
    ]
    
    print("Starting Celery beat scheduler...")
    print("Beat will trigger periodic file processing every 30 seconds")
    
    # Start the beat scheduler
    celery_app.control.purge()  # Clear any old tasks
    celery_app.start(argv=beat_args)

def start_combined():
    """Start both worker and beat in separate processes"""
    print("Starting Celery file processing system...")
    print("This will start both the worker and beat scheduler")
    print("Press Ctrl+C to stop both processes")
    
    # Start beat scheduler in background
    beat_process = subprocess.Popen([
        sys.executable, "-c",
        "from celery_config import celery_app; "
        "celery_app.start(['beat', '--app=celery_config:celery_app', '--loglevel=info', '--schedule=/tmp/celerybeat-schedule', '--pidfile=/tmp/celerybeat.pid'])"
    ])
    
    try:
        # Give beat a moment to start
        time.sleep(2)
        print(f"Beat scheduler started with PID: {beat_process.pid}")
        
        # Start worker in main process
        start_worker()
        
    except KeyboardInterrupt:
        print("\nShutting down...")
        beat_process.terminate()
        beat_process.wait()
        print("Celery processes stopped")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "worker":
            start_worker()
        elif sys.argv[1] == "beat":
            start_beat()
        else:
            print("Usage: python start_celery_worker.py [worker|beat]")
            print("Or run without arguments to start both")
    else:
        start_combined() 