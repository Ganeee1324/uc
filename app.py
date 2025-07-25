from datetime import timedelta
import logging
import time

# import threading
import random
import traceback

# from bge import get_document_embedding
from chunker import process_pdf_chunks
import werkzeug
import database
import redact
from flask import Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import os
from psycopg.errors import UniqueViolation, ForeignKeyViolation
import hashlib
from db_errors import AlreadyOwnedError, NotFoundException, UnauthorizedError, ForbiddenError

from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import uuid
import pymupdf
from io import BytesIO
import threading

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s", force=True)

load_dotenv()

file_uploaded = False
file_uploaded_lock = threading.Lock()

# Check if JWT secret key exists in environment
jwt_secret_key = os.getenv("JWT_SECRET_KEY")
if not jwt_secret_key:
    # Fallback to a default key for development (not recommended for production)
    jwt_secret_key = "your-fallback-secret-key-here"
    print("Warning: Using default JWT secret key. This is not secure for production.")

app = Flask(__name__)

# Enable CORS for all origins (prototype only)
CORS(app, origins="*", allow_headers=["Content-Type", "Authorization"], methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

app.config["JWT_SECRET_KEY"] = jwt_secret_key
app.config["JWT_VERIFY_SUB"] = False
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=30)
jwt = JWTManager(app)

# file folder
files_folder = os.getenv("FILES_FOLDER")
if not files_folder:
    files_folder = "files"
    print("Warning: Using default files folder. This is not secure for production.")

files_folder_path = os.path.join(os.path.dirname(__file__), files_folder)
os.makedirs(files_folder_path, exist_ok=True)

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

# Email sending configuration (implement with your preferred email service)
# For production, integrate with services like SendGrid, AWS SES, etc.
def send_verification_email(email: str, verification_token: str, verification_code: str):
    """
    Send verification email to user.
    This is a placeholder - implement with your email service.
    """
    # Example verification link
    verification_link = f"https://your-domain.com/verify-email?token={verification_token}"
    
    # Log for development (replace with actual email sending)
    logging.info(f"Sending verification email to {email}")
    logging.info(f"Verification link: {verification_link}")
    logging.info(f"Verification code: {verification_code}")
    
    # TODO: Implement actual email sending
    # email_service.send_verification_email(email, verification_link, verification_code)
    pass


@app.route("/register", methods=["POST"])
def register():
    data = request.json
    email = str(data.get("email"))
    
    # Check if email verification is enabled (default: True)
    require_verification = os.getenv("REQUIRE_EMAIL_VERIFICATION", "true").lower() == "true"
    
    user, verification_token, verification_code = database.create_user(
        username=str(data.get("username")),
        email=email,
        password=str(data.get("password")),
        name=str(data.get("name")),
        surname=str(data.get("surname")),
        require_email_verification=require_verification
    )
    
    if require_verification:
        # Send verification email here (implement email sending service)
        # For now, we'll just log the verification details
        logging.info(f"Email verification required for {email}")
        logging.info(f"Verification token: {verification_token}")
        logging.info(f"Verification code: {verification_code}")
        
        return jsonify({
            "email_verification_required": True,
            "message": "Please check your email and verify your account to complete registration.",
            "user": user.to_dict()
        }), 200
    else:
        # Legacy behavior - direct login
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


@app.route("/verify-email", methods=["GET"])
def verify_email():
    token = request.args.get("token")
    if not token:
        return jsonify({"error": "missing_token", "msg": "Verification token is required"}), 400
    
    try:
        user = database.verify_email_token(token)
        return jsonify({
            "message": "Email verified successfully",
            "user": user.to_dict()
        }), 200
    except UnauthorizedError as e:
        return jsonify({"error": "invalid_token", "msg": str(e)}), 401


@app.route("/verify-email-code", methods=["POST"])
def verify_email_code():
    data = request.json
    email = data.get("email")
    code = data.get("code")
    
    if not email or not code:
        return jsonify({"error": "missing_data", "msg": "Email and code are required"}), 400
    
    try:
        user = database.verify_email_code(email, code)
        access_token = create_access_token(identity=user.user_id)
        return jsonify({
            "message": "Email verified successfully",
            "access_token": access_token,
            "user": user.to_dict()
        }), 200
    except UnauthorizedError as e:
        return jsonify({"error": "invalid_code", "msg": str(e)}), 401


@app.route("/resend-verification", methods=["POST"])
def resend_verification():
    data = request.json
    email = data.get("email")
    
    if not email:
        return jsonify({"error": "missing_email", "msg": "Email is required"}), 400
    
    try:
        verification_token, verification_code = database.resend_verification_email(email)
        
        # Send verification email here (implement email sending service)
        # For now, we'll just log the verification details
        logging.info(f"Resending verification for {email}")
        logging.info(f"New verification token: {verification_token}")
        logging.info(f"New verification code: {verification_code}")
        
        return jsonify({
            "message": "Verification email sent successfully"
        }), 200
    except NotFoundException as e:
        return jsonify({"error": "user_not_found", "msg": str(e)}), 404
    except ValueError as e:
        return jsonify({"error": "already_verified", "msg": str(e)}), 400


@app.route("/resend-verification-code", methods=["POST"])
def resend_verification_code():
    """Alias for resend-verification for code-based verification"""
    return resend_verification()


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

    # Get current user ID if authenticated
    current_user_id = get_jwt_identity()

    vetrine, chunks = database.new_search(query, filter_params, current_user_id)
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

    # Get display_name if provided
    display_name = request.form.get("display_name", file.filename[: -len(extension) - 1]).strip()

    # Read file content into memory for processing
    file_content = file.read()
    file_size = len(file_content)
    file_hash = hashlib.sha256(file_content).hexdigest()

    new_file_name = "-".join([str(uuid.uuid4()), str(requester_id), file.filename])
    new_file_path = os.path.join(files_folder_path, new_file_name)

    if os.path.exists(new_file_path):
        return jsonify({"error": "file_already_exists", "msg": "File already exists"}), 500

    # Get number of pages for PDF files using PyMuPDF from memory
    num_pages = 0
    if extension == "pdf":
        try:
            # Process PDF from memory using BytesIO
            pdf_stream = BytesIO(file_content)
            with pymupdf.open(stream=pdf_stream, filetype="pdf") as doc:
                num_pages = doc.page_count
        except Exception as e:
            logging.error(f"Error processing PDF with PyMuPDF: {e}")
            return jsonify({"error": "pdf_processing_failed", "msg": "Failed to process PDF file"}), 500

    # Add file to database with size and tag
    db_file = database.add_file_to_vetrina(
        requester_id=requester_id,
        vetrina_id=vetrina_id,
        file_name=new_file_name,
        sha256=file_hash,
        extension=extension,
        price=random.uniform(0.5, 1.0),
        size=file_size,
        tag=tag,
        num_pages=num_pages,
        display_name=display_name,
    )

    try:
        # Save file content to disk
        with open(new_file_path, "wb") as f:
            f.write(file_content)

        # Create redacted version for PDFs
        if extension == "pdf":
            redact.blur_pages(new_file_path, [1])

    except Exception as e:
        try:
            os.remove(new_file_path)
        except Exception as e:
            logging.error(f"Error deleting file: {e}")
        try:
            os.remove(new_file_path.replace(".pdf", "_redacted.pdf"))
        except Exception as e:
            logging.error(f"Error deleting redacted file: {e}")
        try:
            database.delete_file(requester_id, db_file.file_id)
        except Exception as e:
            logging.error(f"Error deleting file from database: {e}")
        return jsonify({"error": "redaction_failed", "msg": str(e)}), 500
    try:
        file.close()
    except Exception as e:
        logging.error(f"Error closing file: {e}")

    with file_uploaded_lock:
        file_uploaded = True
        database.insert_embedding_queue(db_file.file_id, vetrina_id)

    return jsonify({"msg": "File uploaded"}), 200


@app.route("/files/<int:file_id>/download", methods=["GET"])
@jwt_required()
def download_file(file_id):
    user_id = get_jwt_identity()
    file = database.check_file_ownership(user_id, file_id)
    return send_file(os.path.join(files_folder_path, file.filename), as_attachment=True)


@app.route("/files/<int:file_id>/download/redacted", methods=["GET"])
@jwt_required()
def download_file_redacted(file_id):
    file = database.get_file(file_id)
    return send_file(os.path.join(files_folder_path, file.filename.replace(".pdf", "_redacted.pdf")), as_attachment=True)


@app.route("/files/<int:file_id>", methods=["DELETE"])
@jwt_required()
def delete_file(file_id):
    user_id = get_jwt_identity()
    db_file = database.delete_file(user_id, file_id)
    try:
        os.remove(os.path.join(files_folder_path, db_file.filename))
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

    # Get the directory where the script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    images_folder = os.path.join(script_dir, "images")

    # Check if the requested file exists
    file_path = os.path.join(images_folder, filename)
    if not os.path.exists(file_path):
        return jsonify({"error": "image_not_found", "msg": f"Image '{filename}' not found"}), 404

    # Check if it's actually a file (not a directory)
    if not os.path.isfile(file_path):
        return jsonify({"error": "not_a_file", "msg": f"'{filename}' is not a file"}), 400

    # Serve the image file
    return send_from_directory(images_folder, filename)


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


def process_embedding_queue():
    global file_uploaded
    while True:
        try:
            time.sleep(10)
            with database.connect() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT eq.file_id, eq.vetrina_id, f.filename, f.display_name, v.name
                        FROM embedding_queue eq
                        JOIN files f ON eq.file_id = f.file_id
                        JOIN vetrina v ON eq.vetrina_id = v.vetrina_id
                        """
                    )
                    rows = cursor.fetchall()
                    if not rows:
                        continue
            logging.info(f"Processing {len(rows)} files from embedding queue.")
            for i, row in enumerate(rows):
                logging.info(f"Generating embeddings for file '{row['display_name']}' (remaining: {len(rows) - i})")
                chunks = process_pdf_chunks(os.path.join(files_folder_path, row["filename"]), row["display_name"], row["name"])
                database.insert_chunk_embeddings(row["vetrina_id"], row["file_id"], chunks)
                logging.info(f"Processed {len(chunks)} chunks for file '{row['display_name']}' in vetrina '{row['name']}'")
                with database.connect() as conn:
                    with conn.cursor() as cursor:
                        cursor.execute("DELETE FROM embedding_queue WHERE file_id = %s AND vetrina_id = %s", (row["file_id"], row["vetrina_id"]))
                        conn.commit()
        except Exception as e:
            logging.error(f"Error processing embedding queue: {e}")
            time.sleep(1)


if __name__ == "__main__":
    threading.Thread(target=process_embedding_queue, daemon=False).start()
    if os.name == "nt":  # Windows
        app.run(host="0.0.0.0", debug=False)
    else:
        import ssl

        # Use Let's Encrypt certificate (copied to local directory)
        cert_path = os.path.join(os.path.dirname(__file__), "certs", "fullchain.pem")
        key_path = os.path.join(os.path.dirname(__file__), "certs", "privkey.pem")

        # Check if certificate files exist
        if os.path.exists(cert_path) and os.path.exists(key_path):
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            context.load_cert_chain(cert_path, key_path)
            print(f"Using Let's Encrypt certificate from {cert_path}")
            ssl_context = context
        else:
            print("Warning: Let's Encrypt certificate files not found, falling back to adhoc SSL")
            ssl_context = "adhoc"

        app.run(host="0.0.0.0", debug=False, ssl_context=ssl_context)
