#!/usr/bin/env python3
"""
Script to start the Celery worker and beat scheduler for file processing.
"""

import os
import sys
import time
import tempfile
from threading import Thread
from workers.celery_config import celery_app

# Explicitly import the celery_worker module to register tasks
import workers.celery_worker as celery_worker

def ensure_temp_dir():
    """Ensure the temporary directory exists for PID files"""
    temp_dir = os.path.join(tempfile.gettempdir(), "celery")
    os.makedirs(temp_dir, exist_ok=True)
    
    # Clean up old PID files to avoid conflicts
    pid_file = os.path.join(temp_dir, "celerybeat.pid")
    schedule_file = os.path.join(temp_dir, "celerybeat-schedule")
    
    try:
        if os.path.exists(pid_file):
            os.remove(pid_file)
            print(f"Removed old PID file: {pid_file}")
    except:
        pass
        
    try:
        if os.path.exists(schedule_file):
            os.remove(schedule_file)
            print(f"Removed old schedule file: {schedule_file}")
    except:
        pass
    
    return temp_dir

def start_worker():
    """Start the Celery worker"""
    # Set environment variables for CUDA if needed
    os.environ.setdefault("CUDA_VISIBLE_DEVICES", "0")  # Use first GPU by default
    
    # Start worker with appropriate configuration
    worker_args = [
        "worker",
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
    
    # Start the worker using the celery_app directly
    celery_app.worker_main(argv=worker_args)

def start_beat():
    """Start the Celery beat scheduler"""
    temp_dir = ensure_temp_dir()
    beat_args = [
        "beat",
        "--loglevel=info",
        f"--schedule={os.path.join(temp_dir, 'celerybeat-schedule')}",
        f"--pidfile={os.path.join(temp_dir, 'celerybeat.pid')}"
    ]
    
    print("Starting Celery beat scheduler...")
    print("Beat will trigger periodic file processing every 30 seconds")
    
    # Start the beat scheduler using the celery_app directly
    celery_app.control.purge()  # Clear any old tasks
    celery_app.start(argv=beat_args)

def run_beat_in_thread():
    """Run the beat scheduler in a separate thread"""
    temp_dir = ensure_temp_dir()
    beat_args = [
        "beat",
        "--loglevel=info",
        f"--schedule={os.path.join(temp_dir, 'celerybeat-schedule')}",
        f"--pidfile={os.path.join(temp_dir, 'celerybeat.pid')}"
    ]
    
    print("Starting Celery beat scheduler in background thread...")
    print(f"Beat schedule file: {os.path.join(temp_dir, 'celerybeat-schedule')}")
    print(f"Beat PID file: {os.path.join(temp_dir, 'celerybeat.pid')}")
    
    try:
        celery_app.control.purge()  # Clear any old tasks
        print("Cleared any old tasks from queue")
        celery_app.start(argv=beat_args)
    except Exception as e:
        print(f"Error starting beat scheduler: {e}")

def start_combined():
    """Start both worker and beat in separate processes"""
    print("Starting Celery file processing system...")
    print("This will start both the worker and beat scheduler")
    print("Press Ctrl+C to stop both processes")
    
    # Start beat scheduler in a separate thread
    beat_thread = Thread(target=run_beat_in_thread, daemon=True)
    beat_thread.start()
    
    try:
        # Give beat a moment to start
        time.sleep(3)
        print("Beat scheduler started in background thread")
        print("Checking if tasks are scheduled...")
        
        # Check registered tasks
        registered_tasks = list(celery_app.tasks.keys())
        print(f"Registered tasks: {registered_tasks}")
        
        # Start worker in main process
        start_worker()
        
    except KeyboardInterrupt:
        print("\nShutting down...")
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