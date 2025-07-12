from datetime import timedelta
import logging
# import threading
import traceback

# from bge import get_document_embedding
import werkzeug
import database
import redact
from flask import Flask, jsonify, request, send_file
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

logging.basicConfig(level=logging.DEBUG, format="[%(levelname)s] %(message)s")

load_dotenv()

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
    elif diag.constraint_name == "vetrina_subscriptions_pkey":
        return jsonify({"error": "already_subscribed", "msg": "User already subscribed to this vetrina"}), 409
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
    database.create_vetrina(user_id=user_id, course_instance_id=course_instance_id, name=name, description=description)
    return jsonify({"msg": "Vetrina created"}), 200


@app.route("/vetrine/<int:vetrina_id>", methods=["DELETE"])
@jwt_required()
def delete_vetrina(vetrina_id):
    user_id = get_jwt_identity()
    database.delete_vetrina(user_id, vetrina_id)
    return jsonify({"msg": "Vetrina deleted"}), 200


@app.route("/vetrine/<int:vetrina_id>/subscriptions", methods=["POST"])
@jwt_required()
def subscribe_to_vetrina(vetrina_id):
    user_id = get_jwt_identity()
    transaction, subscription = database.buy_subscription_transaction(user_id, vetrina_id, 100)  # TODO: remove hardcoded price
    return jsonify({"msg": "Subscribed to vetrina", "transaction": transaction.to_dict(), "subscription": subscription.to_dict()}), 200


@app.route("/vetrine/<int:vetrina_id>/subscriptions", methods=["DELETE"])
@jwt_required()
def unsubscribe_from_vetrina(vetrina_id):
    user_id = get_jwt_identity()
    database.unsubscribe_from_vetrina(user_id, vetrina_id)
    return jsonify({"msg": "Unsubscribed from vetrina"}), 200


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


# ---------------------------------------------
# File routes
# ---------------------------------------------


@app.route("/vetrine/<int:vetrina_id>/files", methods=["POST"])
@jwt_required()
def upload_file(vetrina_id):
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
        price=0,
        size=file_size,
        tag=tag,
        num_pages=num_pages,
    )

    try:
        # Save file content to disk
        with open(new_file_path, 'wb') as f:
            f.write(file_content)
        
        # Create redacted version for PDFs
        if extension == "pdf":
            redact.blur_pages(new_file_path, [1])

    except Exception as e:
        try:
            os.remove(new_file_path)
        except Exception as e:
            print(f"Error deleting file: {e}")
        try:
            os.remove(new_file_path.replace(".pdf", "_redacted.pdf"))
        except Exception as e:
            print(f"Error deleting redacted file: {e}")
        try:
            database.delete_file(requester_id, db_file.file_id)
        except Exception as e:
            print(f"Error deleting file from database: {e}")
        return jsonify({"error": "redaction_failed", "msg": str(e)}), 500
    file.close()

    # def thread_function():
    #     embeddings = get_document_embedding(new_file_path)
    #     database.insert_file_embeddings(vetrina_id, db_file.file_id, embeddings)

    # thread = threading.Thread(target=thread_function)
    # thread.start()
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
@jwt_required()
def get_files_for_vetrina(vetrina_id):
    user_id = get_jwt_identity()
    files = database.get_files_from_vetrina(vetrina_id, user_id)
    return jsonify({"files": [file.to_dict() for file in files]}), 200


@app.route("/files/<int:file_id>", methods=["GET"])
@jwt_required()
def get_file(file_id):
    file = database.get_file(file_id)
    return jsonify(file.to_dict()), 200


@app.route("/files/<int:file_id>/buy", methods=["POST"])
@jwt_required()
def buy_file(file_id):
    user_id = get_jwt_identity()
    transaction, file = database.buy_file_transaction(user_id, file_id)
    return jsonify({"msg": "File bought", "transaction": transaction.to_dict(), "file": file.to_dict()}), 200


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
def add_review(vetrina_id):
    user_id = get_jwt_identity()
    data = request.json

    rating = int(data.get("rating"))
    if not 1 <= rating <= 5:
        return jsonify({"error": "invalid_rating", "msg": "Rating must be between 1 and 5"}), 400

    review_text = str(data.get("review_text"))
    review_subject = data.get("review_subject")
    if review_subject:
        review_subject = str(review_subject)

    # Check if user already has a review for this vetrina
    existing_review = None
    reviews = database.get_reviews(vetrina_id)
    for review in reviews:
        if review.user.user_id == user_id:
            existing_review = review
            break

    review = database.add_review(user_id, vetrina_id, rating, review_text, review_subject)
    
    if existing_review:
        return jsonify({"msg": "Review updated", "review": review.to_dict()}), 200
    else:
        return jsonify({"msg": "Review added", "review": review.to_dict()}), 200


@app.route("/vetrine/<int:vetrina_id>/reviews", methods=["GET"])
@jwt_required(optional=True)
def get_reviews(vetrina_id):
    reviews = database.get_reviews(vetrina_id)
    user_id = get_jwt_identity()
    
    # Find current user's review if authenticated
    current_user_review = None
    if user_id:
        for review in reviews:
            if review.user.user_id == user_id:
                current_user_review = review.to_dict()
                break
    
    return jsonify({
        "reviews": [review.to_dict() for review in reviews], 
        "count": len(reviews),
        "user_review": current_user_review
    }), 200


@app.route("/vetrine/<int:vetrina_id>/reviews", methods=["DELETE"])
@jwt_required()
def delete_review(vetrina_id):
    user_id = get_jwt_identity()
    database.delete_review(user_id, vetrina_id)
    return jsonify({"msg": "Review deleted"}), 200


# ---------------------------------------------
# Courses routes
# ---------------------------------------------


@app.route("/hierarchy", methods=["GET"])
def get_hierarchy():
    if database.faculties_courses_cache is None:
        database.faculties_courses_cache = database.scrape_faculties_courses()
        logging.debug(
            f"Added {len(database.faculties_courses_cache)} faculties and {sum(len(courses) for courses in list(database.faculties_courses_cache.values()))} courses to cache"
        )
    else:
        logging.debug(
            f"Retrieved {len(database.faculties_courses_cache)} faculties and {sum(len(courses) for courses in list(database.faculties_courses_cache.values()))} courses from cache"
        )
    return jsonify(database.faculties_courses_cache), 200


@app.route("/tags", methods=["GET"])
def get_valid_tags():
    """Get the list of valid file tags."""
    return jsonify({"tags": VALID_TAGS}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)
