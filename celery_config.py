from celery import Celery
import config

# Create Celery app
celery_app = Celery(
    "file_processor",
    broker=config.CELERY_BROKER_URL,
    backend=config.CELERY_RESULT_BACKEND,
    include=["celery_worker"]  # Include our worker module
)

# Celery configuration
celery_app.conf.update(
    # Task routing for the periodic task
    task_routes={
        "celery_worker.process_pending_files": {"queue": "file_processing"},
    },
    # Worker configuration
    worker_prefetch_multiplier=1,  # Only one task at a time per worker
    task_acks_late=True,
    worker_max_tasks_per_child=config.WORKER_MAX_TASKS_PER_CHILD,
    # Serialization
    task_serializer=config.CELERY_TASK_SERIALIZER,
    result_serializer=config.CELERY_RESULT_SERIALIZER,
    accept_content=config.CELERY_ACCEPT_CONTENT,
    # Result expiration
    result_expires=config.CELERY_RESULT_EXPIRES,
    # Task timeout - increase for file processing
    task_time_limit=config.CELERY_TASK_TIME_LIMIT * 2,  # Double the time limit
    task_soft_time_limit=config.CELERY_TASK_SOFT_TIME_LIMIT * 2,
    # Beat schedule configuration
    beat_schedule={
        'process-pending-files': {
            'task': 'celery_worker.process_pending_files',
            'schedule': 30.0,  # Run every 30 seconds
        },
    },
    timezone='UTC',
)

if __name__ == "__main__":
    celery_app.start() 