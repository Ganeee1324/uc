#!/usr/bin/env python3
"""
Manual test script to trigger the file processing task
"""

from workers.celery_config import celery_app
import workers.celery_worker as celery_worker

def test_task():
    """Test the file processing task manually"""
    print("Testing manual task execution...")
    print(f"Available tasks: {list(celery_app.tasks.keys())}")
    
    # Try to call the task directly
    try:
        result = celery_worker.process_pending_files()
        print(f"Direct call result: {result}")
    except Exception as e:
        print(f"Direct call error: {e}")
    
    # Try to call via Celery
    try:
        task = celery_app.send_task('celery_worker.process_pending_files')
        print(f"Celery task sent: {task}")
        print(f"Task ID: {task.id}")
        
        # Wait for result (with timeout)
        try:
            result = task.get(timeout=10)
            print(f"Task result: {result}")
        except Exception as e:
            print(f"Task execution error: {e}")
            
    except Exception as e:
        print(f"Error sending task: {e}")

if __name__ == "__main__":
    test_task() 