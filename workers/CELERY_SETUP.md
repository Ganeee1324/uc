# Celery Setup for Model Processing

This document explains how to set up and use Celery for distributed model processing, replacing the previous model server architecture.

## Overview

The Celery implementation provides the same functionality as the previous model server but with better scalability and resource management:

- **Single Model in VRAM**: Only one model (embedder or reranker) is loaded at a time to optimize memory usage
- **Automatic Model Switching**: Models are automatically loaded/unloaded as needed
- **Task Queuing**: Tasks are queued and processed sequentially to prevent resource conflicts
- **Fault Tolerance**: Failed tasks are automatically retried with exponential backoff

## Architecture

### Components

1. **celery_config.py**: Celery application configuration with Redis as broker
2. **celery_worker.py**: Worker implementation with model management
3. **bge.py**: Updated to use Celery tasks for embeddings
4. **app.py**: Updated to use Celery tasks for snippet enrichment

### Key Features

- **Model Management**: Automatic loading/unloading ensures only one model in VRAM
- **Task Types**:
  - `enrich_snippets_task`: Processes PDF snippets with images and embeddings
  - `get_sentence_embedding_task`: Generates sentence embeddings
- **Error Handling**: Automatic retries with configurable timeouts
- **Resource Optimization**: Worker restarts after 50 tasks to prevent memory leaks

## Prerequisites

1. **Redis Server**: Required as message broker
   ```bash
   # Ubuntu/Debian
   sudo apt-get install redis-server
   sudo systemctl start redis-server
   
   # macOS
   brew install redis
   brew services start redis
   
   # Windows
   # Download and install Redis from: https://github.com/microsoftarchive/redis/releases
   ```

2. **Python Dependencies**: Install required packages
   ```bash
   pip install -r requirements.txt
   ```

## Configuration

### Environment Variables

Create a `.env` file or set environment variables:

```env
# Redis configuration
REDIS_URL=redis://localhost:6379/0

# CUDA configuration (optional)
CUDA_VISIBLE_DEVICES=0
```

### Celery Configuration

The Celery app is configured in `celery_config.py` with:
- Redis as broker and result backend
- Pickle serialization for complex objects (PIL Images, numpy arrays)
- Single worker concurrency to ensure one model in VRAM
- Task timeouts and retry policies

## Starting the System

### 1. Start Redis

Make sure Redis is running in systemctl.

### 2. Start Celery Worker

```bash
python start_celery_worker.py
```
### 3. Start Flask Application

```bash
python app.py
```

### Snippet Enrichment
This happens automatically during file upload in the Flask app.

## Monitoring

### Check Worker Status
```bash
celery -A celery_config:celery_app status
```

### Monitor Tasks
```bash
celery -A celery_config:celery_app events
```

### Flower (Web-based monitoring)
```bash
pip install flower
celery -A celery_config:celery_app flower
# Open http://localhost:5555
```

## Troubleshooting

### Common Issues

1. **Redis Connection Error**
   - Ensure Redis is running: `redis-cli ping`
   - Check REDIS_URL in configuration

2. **Model Loading Issues**
   - Verify model files exist at specified paths
   - Check CUDA availability: `python -c "import torch; print(torch.cuda.is_available())"`
   - Ensure sufficient GPU memory

3. **Task Timeouts**
   - Increase timeout values in celery_config.py
   - Monitor worker logs for bottlenecks

4. **Memory Issues**
   - Reduce max-tasks-per-child value
   - Monitor GPU memory usage
   - Ensure proper model unloading

### Logs

- Worker logs: `celery_worker.log`
- Flask app logs: Standard output
- Redis logs: Usually in `/var/log/redis/`

## Performance Tuning

### Single Model Optimization
- Only one model loaded at a time saves ~8-12GB VRAM
- Model switching adds ~10-30 seconds overhead
- Consider task batching for efficiency

### Scaling Options
- **Horizontal**: Run multiple workers on different GPUs
- **Vertical**: Increase worker memory/GPU resources
- **Hybrid**: Dedicated workers for different model types

### Configuration Tuning
```python
# In celery_config.py
celery_app.conf.update(
    task_time_limit=1800,  # 30 minutes
    task_soft_time_limit=1500,  # 25 minutes
    worker_max_tasks_per_child=25,  # Restart more frequently
)
```

## Migration from Model Server

The previous model server (`model_server.py`) can be completely replaced:

1. Stop the model server
2. Start Redis and Celery worker
3. The Flask app will automatically use Celery tasks

All functionality remains the same with improved resource management and scalability.

## Development

### Adding New Tasks
1. Define task in `celery_worker.py`
2. Add to task_routes in `celery_config.py`
3. Update client code to call the task

### Testing
```python
# Test individual tasks
from celery_worker import get_sentence_embedding_task
result = get_sentence_embedding_task.delay("test")
print(result.get())
``` 