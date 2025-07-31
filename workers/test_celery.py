#!/usr/bin/env python3
"""
Test script for Celery setup.
"""

import sys
import time
import numpy as np

def test_redis_connection():
    """Test Redis connection"""
    try:
        import redis
        import workers.config as config
        
        r = redis.from_url(config.REDIS_URL)
        r.ping()
        print("✓ Redis connection successful")
        return True
    except Exception as e:
        print(f"✗ Redis connection failed: {e}")
        return False

def test_celery_import():
    """Test Celery imports"""
    try:
        from workers.celery_config import celery_app
        from workers.celery_worker import get_sentence_embedding_task, enrich_snippets_task
        print("✓ Celery imports successful")
        return True
    except Exception as e:
        print(f"✗ Celery imports failed: {e}")
        return False

def test_sentence_embedding():
    """Test sentence embedding task"""
    try:
        from workers.celery_worker import get_sentence_embedding_task
        
        print("Testing sentence embedding task...")
        print("Note: This requires a running Celery worker")
        
        # Submit task
        result = get_sentence_embedding_task.delay("This is a test sentence")
        print(f"Task submitted with ID: {result.id}")
        
        # Wait for result with timeout
        try:
            embedding = result.get(timeout=300)  # 5 minutes
            embedding_array = np.array(embedding)
            print(f"✓ Sentence embedding successful, shape: {embedding_array.shape}")
            return True
        except Exception as e:
            print(f"✗ Task execution failed: {e}")
            return False
            
    except Exception as e:
        print(f"✗ Sentence embedding test failed: {e}")
        return False

def test_model_paths():
    """Test if model files exist"""
    import os
    import workers.config as config
    
    if os.path.exists(config.MODEL_PATH):
        print(f"✓ Model file found: {config.MODEL_PATH}")
        return True
    else:
        print(f"✗ Model file not found: {config.MODEL_PATH}")
        return False

def main():
    """Run all tests"""
    print("Running Celery setup tests...\n")
    
    tests = [
        ("Redis Connection", test_redis_connection),
        ("Celery Imports", test_celery_import),
        ("Model Files", test_model_paths),
    ]
    
    results = []
    for name, test_func in tests:
        print(f"Running {name} test...")
        success = test_func()
        results.append(success)
        print()
    
    # Only test tasks if basic setup is working
    if all(results):
        print("Basic setup successful. Testing tasks...")
        print("Note: The following test requires a running Celery worker")
        print("Start worker with: python start_celery_worker.py")
        
        response = input("Do you want to test sentence embedding task? (y/n): ")
        if response.lower() == 'y':
            test_sentence_embedding()
    
    print(f"\nTest Summary:")
    for i, (name, _) in enumerate(tests):
        status = "✓ PASS" if results[i] else "✗ FAIL"
        print(f"{name}: {status}")
    
    if all(results):
        print("\n🎉 Basic setup is ready! You can now start the Celery worker.")
    else:
        print("\n❌ Some tests failed. Please check the configuration.")

if __name__ == "__main__":
    main() 