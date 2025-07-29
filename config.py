"""
Simple configuration for Celery and model processing.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://symbia.it:6379/0")

# Model paths
MODEL_PATH = (
    r"C:\Users\fdimo\Downloads\Visualized_m3.pth" 
    if os.name == "nt" 
    else r"/home/ubuntu/Visualized_m3.pth"
)

# Celery configuration
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_TASK_SERIALIZER = "pickle"
CELERY_RESULT_SERIALIZER = "pickle"
CELERY_ACCEPT_CONTENT = ["pickle"]
CELERY_RESULT_EXPIRES = 3600  # 1 hour
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes
CELERY_TASK_SOFT_TIME_LIMIT = 25 * 60  # 25 minutes

# Worker configuration
WORKER_CONCURRENCY = 1  # Single worker to ensure one model in VRAM
WORKER_MAX_TASKS_PER_CHILD = 50  # Restart after 50 tasks
WORKER_POOL = "solo"  # Single-threaded execution

# Model processing configuration
DEFAULT_NUM_WINDOWS = 8
DEFAULT_WINDOW_HEIGHT_PERCENTAGE = 0.35
DEFAULT_EMBEDDING_TIMEOUT = 300  # 5 minutes
DEFAULT_ENRICHMENT_TIMEOUT = 1800  # 30 minutes
DEFAULT_CHUNK_PROCESSING_TIMEOUT = 2400  # 40 minutes

# GPU configuration
CUDA_DEVICE = os.getenv("CUDA_VISIBLE_DEVICES", "0") 