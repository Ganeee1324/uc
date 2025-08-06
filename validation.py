from functools import wraps
from typing import Type, Union, Dict, Any
from flask import request, jsonify
from pydantic import BaseModel, ValidationError
import logging


def validate_json(schema: Type[BaseModel]):
    """
    Decorator for validating JSON request body against a Pydantic schema.
    
    Usage:
        @app.route("/endpoint", methods=["POST"])
        @validate_json(MyRequestSchema)
        def my_endpoint(validated_data: MyRequestSchema):
            # validated_data is now a validated Pydantic model instance
            pass
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Get JSON data from request
                json_data = request.get_json()
                if json_data is None:
                    return jsonify({
                        "error": "invalid_json", 
                        "msg": "Request must contain valid JSON"
                    }), 400
                
                # Validate using Pydantic schema
                validated_data = schema(**json_data)
                
                # Pass validated data to the route function
                return f(validated_data, *args, **kwargs)
                
            except ValidationError as e:
                # Format validation errors nicely
                errors = []
                for error in e.errors():
                    field = " -> ".join(str(loc) for loc in error['loc'])
                    errors.append(f"{field}: {error['msg']}")
                
                return jsonify({
                    "error": "validation_error",
                    "msg": "Request validation failed",
                    "details": errors
                }), 400
            except Exception as e:
                logging.error(f"Validation error: {e}")
                return jsonify({
                    "error": "validation_error",
                    "msg": str(e)
                }), 400
        
        return decorated_function
    return decorator
