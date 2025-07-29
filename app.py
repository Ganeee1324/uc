import base64
import json
from datetime import timedelta
import logging
import time

import random
import traceback

from PIL import Image

from bge import get_sentence_embedding, load_model
from chunker import process_pdf_chunks
import werkzeug
import database
import redact
from flask import Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS
import requests
from dotenv import load_dotenv
import os
import numpy as np
from psycopg.errors import UniqueViolation, ForeignKeyViolation
import hashlib
from db_errors import AlreadyOwnedError, NotFoundException, UnauthorizedError, ForbiddenError

from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import uuid
import pymupdf
from io import BytesIO

logging.basicConfig(level=logging.DEBUG, format="[%(levelname)s] %(message)s", force=True)

load_dotenv()


# Check if JWT secret key exists in environment
jwt_secret_key = os.getenv("JWT_SECRET_KEY")
if not jwt_secret_key:
    # Fallback to a default key for development (not recommended for production)
    jwt_secret_key = "your-fallback-secret-key-here"
    print("Warning: Using default JWT secret key. This is not secure for production.")

app = Flask(__name__)
load_model()

# Enable CORS for all origins (prototype only)
CORS(app, origins="*", allow_headers=["Content-Type", "Authorization"], methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

app.config["JWT_SECRET_KEY"] = jwt_secret_key
app.config["JWT_VERIFY_SUB"] = False
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=30)
jwt = JWTManager(app)

FILES_FOLDER = os.getenv("FILES_FOLDER")
IMAGES_FOLDER = os.getenv("IMAGES_FOLDER")

os.makedirs(FILES_FOLDER, exist_ok=True)
os.makedirs(IMAGES_FOLDER, exist_ok=True)

# Valid file tags
VALID_TAGS = ["dispense", "appunti", "esercizi"]

# ---------------------------------------------
# Error handlers
# ---------------------------------------------


@app.errorhandler(Exception)
def handle_exception(e):
    logging.error(f"Internal server error: {e} {traceback.format_exc()}")
    return jsonify({"error": "internal_server_error", "msg": str(e)}), 500


@app.errorhandler(ForbiddenError)
def forbidden_error(e):
    return jsonify({"error": "forbidden", "msg": str(e)}), 403


@app.errorhandler(NotFoundException)
def not_found_error(e):
    return jsonify({"error": "not_found", "msg": str(e)}), 404


@app.errorhandler(ForeignKeyViolation)
def foreign_key_violation_error(e):
    return jsonify({"error": "foreign_key_violation", "msg": str(e)}), 404


@app.errorhandler(werkzeug.exceptions.MethodNotAllowed)
def method_not_allowed_error(e):
    return jsonify({"error": "method_not_allowed", "msg": str(e)}), 405


@app.errorhandler(werkzeug.exceptions.NotFound)
def not_found_error(e):
    return jsonify({"error": "not_found", "msg": str(e)}), 404


@app.errorhandler(UniqueViolation)
def unique_violation_error(e):
    diag = e.diag
    if diag.constraint_name == "users_email_key":
        return jsonify({"error": "email_already_exists", "msg": "Email already exists"}), 409
    elif diag.constraint_name == "users_username_key":
        return jsonify({"error": "username_already_exists", "msg": "Username already exists"}), 409

    elif diag.constraint_name == "owned_files_pkey":
        return jsonify({"error": "already_owned", "msg": "User already owns this file"}), 409
    else:
        return jsonify({"error": "unique_violation", "msg": f"Unique violation error on constraint {diag.constraint_name}"}), 500


@app.errorhandler(UnauthorizedError)
def unauthorized_error(e):
    return jsonify({"error": "unauthorized", "msg": str(e)}), 401


@app.errorhandler(AlreadyOwnedError)
def already_owned_error(e):
    return jsonify({"error": "already_owned", "msg": str(e)}), 409


@app.errorhandler(ValueError)
def value_error(e):
    return jsonify({"error": "bad_parameter", "msg": str(e)}), 400


# ---------------------------------------------
# Auth routes
# ---------------------------------------------


@app.route("/register", methods=["POST"])
def register():
    data = request.json
    user = database.create_user(
        username=str(data.get("username")),
        email=str(data.get("email")),
        password=str(data.get("password")),
        name=str(data.get("name")),
        surname=str(data.get("surname")),
    )
    access_token = create_access_token(identity=user.user_id)
    return jsonify({"access_token": access_token, "user": user.to_dict()}), 200


@app.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    user = database.verify_user(email, password)
    access_token = create_access_token(identity=user.user_id)
    return jsonify({"access_token": access_token, "user": user.to_dict()}), 200


# ---------------------------------------------
# Vetrina routes
# ---------------------------------------------


@app.route("/vetrine", methods=["POST"])
@jwt_required()
def create_vetrina():
    user_id = get_jwt_identity()
    data = request.json
    course_instance_id = int(data.get("course_instance_id"))
    name = str(data.get("name"))
    description = str(data.get("description"))
    price = float(data.get("price", 0.0))  # Default to 0.0 if not provided
    database.create_vetrina(user_id=user_id, course_instance_id=course_instance_id, name=name, description=description, price=price)
    return jsonify({"msg": "Vetrina created"}), 200


@app.route("/vetrine/<int:vetrina_id>", methods=["DELETE"])
@jwt_required()
def delete_vetrina(vetrina_id):
    user_id = get_jwt_identity()
    database.delete_vetrina(user_id, vetrina_id)
    return jsonify({"msg": "Vetrina deleted"}), 200


@app.route("/vetrine/<int:vetrina_id>", methods=["GET"])
@jwt_required(optional=True)
def get_vetrina(vetrina_id):
    user_id = get_jwt_identity()
    vetrina, files, reviews = database.get_vetrina_by_id(vetrina_id, user_id)
    return jsonify({"vetrina": vetrina.to_dict(), "files": [f.to_dict() for f in files], "reviews": [r.to_dict() for r in reviews]}), 200


@app.route("/vetrine", methods=["GET"])
@jwt_required(optional=True)
def search_vetrine():
    user_id = get_jwt_identity()
    search_params = {}
    for key, value in request.args.items():
        if value and value.strip():
            search_params[key] = value.strip()

    results = database.search_vetrine(search_params, user_id)
    return jsonify({"vetrine": [vetrina.to_dict() for vetrina in results], "count": len(results)}), 200


@app.route("/vetrine/search", methods=["GET"])
@jwt_required(optional=True)
def new_search():
    """
    New semantic + keyword search endpoint using vector embeddings and full-text search.
    Query parameter: 'q' - the search query string
    Additional filter parameters: course_name, faculty, canale, language, date_year, course_year, tag, extension
    """
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "missing_query", "msg": "Query parameter 'q' is required"}), 400

    # Extract filter parameters from request
    filter_params = {}
    filter_keys = ["course_name", "faculty", "canale", "language", "date_year", "course_year", "tag", "extension"]
    for key in filter_keys:
        value = request.args.get(key)
        if value:
            filter_params[key] = value

    query_embedding = get_sentence_embedding(query).squeeze()

    # Get current user ID if authenticated
    current_user_id = get_jwt_identity()

    vetrine, chunks = database.new_search(query, query_embedding, filter_params, current_user_id)
    return (
        jsonify(
            {
                "vetrine": [vetrina.to_dict() for vetrina in vetrine],
                "chunks": {vetrina_id: [chunk.to_dict() for chunk in vetrina_chunks] for vetrina_id, vetrina_chunks in chunks.items()},
                "count": len(vetrine),
                "query": query,
                "filters": filter_params,
            }
        ),
        200,
    )


# ---------------------------------------------
# File routes
# ---------------------------------------------


@app.route("/vetrine/<int:vetrina_id>/files", methods=["POST"])
@jwt_required()
def upload_file(vetrina_id):
    global file_uploaded
    requester_id = get_jwt_identity()

    # Check if file is provided in the request
    if "file" not in request.files:
        return jsonify({"error": "no_file", "msg": "No file provided"}), 400

    file = request.files["file"]

    # Check if filename is empty
    if file.filename == "":
        return jsonify({"error": "no_filename", "msg": "No filename provided"}), 400

    extension = file.filename.split(".")[-1]
    if extension not in ["pdf", "docx", "txt", "xlsx"]:
        return jsonify({"error": "invalid_extension", "msg": "Invalid extension. Valid extensions are: pdf, docx, txt, xlsx"}), 400
    # Get and validate tag if provided
    tag = request.form.get("tag")
    if tag and tag not in VALID_TAGS:
        return jsonify({"error": "invalid_tag", "msg": f"Invalid tag. Valid tags are: {', '.join(VALID_TAGS)}"}), 400

    # Read file content into memory for processing
    file_content = file.read()
    # file_size = len(file_content)

    new_file_name = "-".join([str(uuid.uuid4()), str(requester_id), file.filename])
    new_file_path = os.path.join(FILES_FOLDER, new_file_name)

    if os.path.exists(new_file_path):
        return jsonify({"error": "file_already_exists", "msg": "File already exists"}), 500
    
    display_name = request.form.get("display_name", file.filename[: -len(extension) - 1]).strip()

    db_file = database.add_file_to_processing_queue(
        requester_id=requester_id,
        vetrina_id=vetrina_id,
        file_name=new_file_name,
        extension=extension,
        price=random.uniform(0.5, 1.0),
        tag=tag,
        file_data=file_content,
        display_name=display_name,
    )

    with open(new_file_path, "wb") as f:
        f.write(file_content)

    try:
        file.close()
    except Exception as e:
        logging.error(f"Error closing file: {e}")

    return jsonify({"msg": "File uploaded", "file": db_file.to_dict()}), 200


@app.route("/files/<int:file_id>/download", methods=["GET"])
@jwt_required()
def download_file(file_id):
    user_id = get_jwt_identity()
    file = database.check_file_ownership(user_id, file_id)
    return send_file(os.path.join(FILES_FOLDER, file.filename), as_attachment=True)


@app.route("/files/<int:file_id>/download/redacted", methods=["GET"])
@jwt_required()
def download_file_redacted(file_id):
    file = database.get_file(file_id)
    return send_file(os.path.join(FILES_FOLDER, file.filename.replace(".pdf", "_redacted.pdf")), as_attachment=True)


@app.route("/files/<int:file_id>", methods=["DELETE"])
@jwt_required()
def delete_file(file_id):
    user_id = get_jwt_identity()
    db_file = database.delete_file(user_id, file_id)
    try:
        os.remove(os.path.join(FILES_FOLDER, db_file.filename))
    except Exception as e:
        print(f"Error deleting file: {e}")
    return jsonify({"msg": "File deleted"}), 200


@app.route("/vetrine/<int:vetrina_id>/files", methods=["GET"])
@jwt_required(optional=True)
def get_files_for_vetrina(vetrina_id):
    user_id = get_jwt_identity()
    files = database.get_files_from_vetrina(vetrina_id, user_id)
    return jsonify({"files": [file.to_dict() for file in files]}), 200


@app.route("/files/<int:file_id>", methods=["GET"])
def get_file(file_id):
    file = database.get_file(file_id)
    return jsonify(file.to_dict()), 200


@app.route("/files/<int:file_id>/buy", methods=["POST"])
@jwt_required()
def buy_file(file_id):
    user_id = get_jwt_identity()
    transaction, file = database.buy_file_transaction(user_id, file_id)
    return jsonify({"msg": "File bought", "transaction": transaction.to_dict(), "file": file.to_dict()}), 200


@app.route("/files/<int:file_id>/display-name", methods=["PUT"])
@jwt_required()
def update_file_display_name(file_id):
    user_id = get_jwt_identity()
    data = request.json

    if not data or "display_name" not in data:
        return jsonify({"error": "missing_display_name", "msg": "display_name is required"}), 400

    new_display_name = str(data.get("display_name")).strip()
    if not new_display_name:
        return jsonify({"error": "invalid_display_name", "msg": "display_name cannot be empty"}), 400

    updated_file = database.update_file_display_name(user_id, file_id, new_display_name)
    return jsonify({"msg": "Display name updated", "file": updated_file.to_dict()}), 200


# ---------------------------------------------
# User routes
# ---------------------------------------------


@app.route("/user/favorites/vetrine/<int:vetrina_id>", methods=["POST"])
@jwt_required()
def add_favorite_vetrina(vetrina_id):
    user_id = get_jwt_identity()
    database.add_favorite_vetrina(user_id, vetrina_id)
    return jsonify({"msg": "Vetrina added to favorites"}), 200


@app.route("/user/favorites/vetrine/<int:vetrina_id>", methods=["DELETE"])
@jwt_required()
def remove_favorite_vetrina(vetrina_id):
    user_id = get_jwt_identity()
    database.remove_favorite_vetrina(user_id, vetrina_id)
    return jsonify({"msg": "Vetrina removed from favorites"}), 200


@app.route("/user/favorites/files/<int:file_id>", methods=["POST"])
@jwt_required()
def add_favorite_file(file_id):
    user_id = get_jwt_identity()
    database.add_favorite_file(user_id, file_id)
    return jsonify({"msg": "File added to favorites"}), 200


@app.route("/user/favorites/files/<int:file_id>", methods=["DELETE"])
@jwt_required()
def remove_favorite_file(file_id):
    user_id = get_jwt_identity()
    database.remove_favorite_file(user_id, file_id)
    return jsonify({"msg": "File removed from favorites"}), 200


@app.route("/user/favorites", methods=["GET"])
@jwt_required()
def get_favorites():
    user_id = get_jwt_identity()
    vetrine_with_favorites = database.get_favorites(user_id)
    return jsonify({"vetrine": [vetrina.to_dict() for vetrina in vetrine_with_favorites], "count": len(vetrine_with_favorites)}), 200


# ---------------------------------------------
# Owned files routes
# ---------------------------------------------


@app.route("/user/owned", methods=["GET"])
@jwt_required()
def get_owned_vetrine():
    user_id = get_jwt_identity()
    vetrine_with_owned = database.get_vetrine_with_owned_files(user_id)
    return jsonify({"vetrine": [vetrina.to_dict() for vetrina in vetrine_with_owned], "count": len(vetrine_with_owned)}), 200


# ---------------------------------------------
# Review routes
# ---------------------------------------------


@app.route("/vetrine/<int:vetrina_id>/reviews", methods=["POST"])
@jwt_required()
def add_vetrina_review(vetrina_id):
    user_id = get_jwt_identity()
    data = request.json

    rating = int(data.get("rating"))
    if not 1 <= rating <= 5:
        return jsonify({"error": "invalid_rating", "msg": "Rating must be between 1 and 5"}), 400

    review_text = str(data.get("review_text"))

    review = database.add_vetrina_review(user_id, rating, review_text, vetrina_id)
    return jsonify({"msg": "Review added", "review": review.to_dict()}), 200


@app.route("/files/<int:file_id>/reviews", methods=["POST"])
@jwt_required()
def add_file_review(file_id):
    user_id = get_jwt_identity()
    data = request.json

    rating = int(data.get("rating"))
    if not 1 <= rating <= 5:
        return jsonify({"error": "invalid_rating", "msg": "Rating must be between 1 and 5"}), 400

    review_text = str(data.get("review_text"))
    review = database.add_file_review(user_id, rating, review_text, file_id)
    return jsonify({"msg": "Review added", "review": review.to_dict()}), 200


@app.route("/vetrine/<int:vetrina_id>/reviews", methods=["GET"])
def get_vetrina_reviews(vetrina_id):
    reviews = database.get_vetrina_reviews(vetrina_id)
    return jsonify({"reviews": [review.to_dict() for review in reviews], "count": len(reviews)}), 200


@app.route("/files/<int:file_id>/reviews", methods=["GET"])
def get_file_reviews(file_id):
    reviews = database.get_file_reviews(file_id)
    return jsonify({"reviews": [review.to_dict() for review in reviews], "count": len(reviews)}), 200


@app.route("/vetrine/<int:vetrina_id>/reviews", methods=["DELETE"])
@jwt_required()
def delete_vetrina_review(vetrina_id):
    user_id = get_jwt_identity()
    database.delete_review(user_id, vetrina_id=vetrina_id)
    return jsonify({"msg": "Review deleted"}), 200


@app.route("/files/<int:file_id>/reviews", methods=["DELETE"])
@jwt_required()
def delete_file_review(file_id):
    user_id = get_jwt_identity()
    database.delete_review(user_id, file_id=file_id)
    return jsonify({"msg": "Review deleted"}), 200


@app.route("/users/<int:user_id>/author-reviews", methods=["GET"])
def get_user_author_reviews(user_id):
    """
    Get all reviews for vetrine and files that belong to vetrine authored by a specific user.

    Args:
        user_id: ID of the user whose vetrine and file reviews to retrieve
    """
    reviews = database.get_reviews_for_user_vetrine(user_id)
    return jsonify({"reviews": [review.to_dict() for review in reviews], "count": len(reviews)}), 200


@app.route("/users/<int:user_id>/reviews", methods=["GET"])
def get_user_reviews(user_id):
    """
    Get all reviews authored by a specific user (reviews written by that user).

    Args:
        user_id: ID of the user whose reviews to retrieve
    """
    reviews = database.get_reviews_authored_by_user(user_id)
    return jsonify({"reviews": [review.to_dict() for review in reviews], "count": len(reviews)}), 200


# ---------------------------------------------
# Follow routes
# ---------------------------------------------


@app.route("/users/<int:user_id>/follow", methods=["POST"])
@jwt_required()
def follow(user_id):
    """
    Follow a user.

    Args:
        user_id: ID of the user to follow
    """
    current_user_id = get_jwt_identity()
    follow = database.follow_user(current_user_id, user_id)
    return jsonify({"msg": "User followed successfully", "follow": follow.to_dict()}), 200


@app.route("/users/<int:user_id>/follow", methods=["DELETE"])
@jwt_required()
def unfollow(user_id):
    """
    Unfollow a user.

    Args:
        user_id: ID of the user to unfollow
    """
    current_user_id = get_jwt_identity()
    database.unfollow_user(current_user_id, user_id)
    return jsonify({"msg": "User unfollowed successfully"}), 200


@app.route("/users/<int:user_id>/followers", methods=["GET"])
def get_followers(user_id):
    """
    Get all followers of a user.

    Args:
        user_id: ID of the user whose followers to retrieve
    """
    followers = database.get_user_followers(user_id)
    return jsonify({"followers": [follower.to_dict() for follower in followers], "count": len(followers)}), 200


@app.route("/users/<int:user_id>/following", methods=["GET"])
def get_following(user_id):
    """
    Get all users that a user is following.

    Args:
        user_id: ID of the user whose following list to retrieve
    """
    following = database.get_user_following(user_id)
    return jsonify({"following": [user.to_dict() for user in following], "count": len(following)}), 200


# ---------------------------------------------
# Images routes
# ---------------------------------------------


@app.route("/images/<path:filename>", methods=["GET"])
def serve_image(filename):
    """
    Serve images from the images folder in the script directory.

    Args:
        filename: The name of the image file to serve
    """

    # Check if the requested file exists
    file_path = os.path.join(IMAGES_FOLDER, filename)
    if not os.path.exists(file_path):
        return jsonify({"error": "image_not_found", "msg": f"Image '{filename}' not found"}), 404

    # Check if it's actually a file (not a directory)
    if not os.path.isfile(file_path):
        return jsonify({"error": "not_a_file", "msg": f"'{filename}' is not a file"}), 400

    # Serve the image file
    return send_from_directory(IMAGES_FOLDER, filename)


# ---------------------------------------------
# Courses routes
# ---------------------------------------------


@app.route("/hierarchy", methods=["GET"])
def get_hierarchy():
    if database.faculties_courses_cache is None:
        database.faculties_courses_cache = database.scrape_faculties_courses()
        logging.info(
            f"Added {len(database.faculties_courses_cache)} faculties and {sum(len(courses) for courses in list(database.faculties_courses_cache.values()))} courses to cache"
        )
    else:
        logging.info(
            f"Retrieved {len(database.faculties_courses_cache)} faculties and {sum(len(courses) for courses in list(database.faculties_courses_cache.values()))} courses from cache"
        )
    return jsonify(database.faculties_courses_cache), 200


@app.route("/tags", methods=["GET"])
def get_valid_tags():
    """Get the list of valid file tags."""
    return jsonify({"tags": VALID_TAGS}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)