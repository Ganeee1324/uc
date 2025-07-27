import random
from typing import Any, Dict, List, Optional, Tuple
import psycopg
import os
from pgvector.psycopg import register_vector

# from bge import get_document_embedding
from bge import get_sentence_embedding
from common import Chunk, CourseInstance, File, Review, Transaction, User, Vetrina
from db_errors import UnauthorizedError, NotFoundException, ForbiddenError, AlreadyOwnedError
from dotenv import load_dotenv
import logging
import pandas as pd
import numpy as np
from langdetect import detect
import json
import secrets
import string
from datetime import datetime, timedelta

load_dotenv()

DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")


def connect(autocommit: bool = False, no_dict_row_factory: bool = False, vector: bool = False) -> psycopg.Connection:
    conn = psycopg.connect(
        f"dbname={DB_NAME} user={DB_USER} password={DB_PASSWORD}",
        autocommit=autocommit,
        row_factory=psycopg.rows.dict_row if not no_dict_row_factory else None,
    )
    # Register vector extension for this connection
    if vector:
        register_vector(conn)
    return conn


def create_tables(debug: bool = False) -> None:
    with open("schema.sql", "r") as f:
        with connect(no_dict_row_factory=True) as conn:
            with conn.cursor() as cursor:
                cursor.execute(f.read())
                conn.commit()
                if debug:
                    # get all tables
                    cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
                    tables = cursor.fetchall()
                    logging.info(f"Tables created successfully: {tables}")


def fill_courses(debug: bool = False) -> None:
    df = pd.read_csv("data/courses.csv", encoding="latin1")
    with connect() as conn:
        with conn.cursor() as cursor:
            for _, row in df.iterrows():
                # canale,date_year,year,language,course_id,course_name,semester,professors
                _, canale, date_year, year, language, course_id, course_name, semester, professors, faculty = row
                cursor.execute(
                    "INSERT INTO course_instances (course_code, faculty_name, course_year, date_year, course_semester, canale, professors, language, course_name) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT DO NOTHING",
                    (course_id, faculty, year, date_year, semester, canale, professors.split(" / "), language, course_name),
                )

                conn.commit()

            if debug:
                cursor.execute("SELECT * FROM course_instances")
                course_instances = cursor.fetchall()
                logging.info(f"Course instances loaded successfully: {len(course_instances)}")


def insert_embedding_queue(file_id: int, vetrina_id: int) -> None:
    with connect(vector=True) as conn:
        with conn.cursor() as cursor:
            cursor.execute("INSERT INTO embedding_queue (file_id, vetrina_id) VALUES (%s, %s)", (file_id, vetrina_id))
            conn.commit()


# ---------------------------------------------
# User management
# ---------------------------------------------


def create_user(username: str, email: str, password: str, name: str, surname: str, require_email_verification: bool = True) -> Tuple[User, Optional[str], Optional[str]]:
    """
    Create a new user with optional email verification.

    Args:
        username: The username for the new user
        email: The email address for the new user
        password: The password for the new user
        name: The name for the new user
        surname: The surname for the new user
        require_email_verification: Whether to require email verification

    Returns:
        Tuple[User, Optional[str], Optional[str]]: The newly created user object, verification token, and verification code

    Raises:
        UniqueViolation: If the username or email already exists
    """
    verification_token = None
    verification_code = None
    
    if require_email_verification:
        verification_token = secrets.token_urlsafe(32)
        verification_code = ''.join(random.choices(string.digits, k=6))
        expires_at = datetime.utcnow() + timedelta(hours=24)
    else:
        expires_at = None
    
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO users (username, email, password, first_name, last_name, email_verified, email_verification_token, email_verification_code, email_verification_expires)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (username, email, password, name, surname, not require_email_verification, verification_token, verification_code, expires_at),
            )
            user_data = cursor.fetchone()
            conn.commit()
            logging.info(f"User {user_data['user_id']} created with email verification: {require_email_verification}")

            return User.from_dict(user_data), verification_token, verification_code


def verify_user(email: str, password: str) -> User:
    """
    Verify a user's credentials.

    Args:
        email: The user's email address
        password: The user's password

    Returns:
        User: The user object if the credentials are valid

    Raises:
        UnauthorizedError: If the email or password is invalid or email not verified
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            user_data = cursor.fetchone()
            if not user_data or password != user_data["password"]:
                raise UnauthorizedError("Invalid email or password")
            if not user_data.get("email_verified", True):  # Default to True for backward compatibility
                raise UnauthorizedError("Email not verified. Please check your email and verify your account.")
            logging.info(f"User {user_data['user_id']} verified")
            return User.from_dict(user_data)


def delete_user(user_id: int) -> None:
    """
    Delete a user account.

    Args:
        user_id: ID of the user to delete
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
            conn.commit()
            logging.info(f"User {user_id} deleted")


def get_user_by_id(user_id: int) -> Optional[User]:
    """
    Get a user by their ID.

    Args:
        user_id: The ID of the user to retrieve

    Returns:
        User: The user object if found, None otherwise
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM users WHERE user_id = %s",
                (user_id,),
            )
            user_data = cursor.fetchone()
            logging.info(f"User {user_id} retrieved")
            return User.from_dict(user_data) if user_data else None


# ---------------------------------------------
# Vetrina management
# ---------------------------------------------


def search_vetrine(params: Dict[str, Any], user_id: Optional[int] = None) -> List[Vetrina]:
    """
    Search for vetrine based on provided parameters using a two-stage filtering approach.

    Args:
        params: Dictionary containing search parameters
                Vetrina filters: text, course_name, faculty, canale, date_year, course_year, language
                File filters: tag
        user_id: Optional ID of the user to check favorite status for vetrine

    Returns:
        List[Vetrina]: List of Vetrina objects matching the search criteria, with favorite information if user_id is provided
        Results are ordered by text match priority: vetrina name, vetrina description, course name, faculty name
    """
    # Separate parameter lists to avoid order issues
    base_params = []
    where_params = []
    order_params = []

    # Build the base query with conditional favorite check
    favorite_select = ""
    if user_id is not None:
        favorite_select = ", EXISTS(SELECT 1 FROM favourite_vetrine WHERE vetrina_id = v.vetrina_id AND user_id = %s) AS favorite"
        base_params.append(user_id)

    # Add vetrina filters - course instance related filters (exact matches)
    vetrina_filters = [
        ("course_name", "ci.course_name", params.get("course_name"), str),  # nome corso
        ("faculty", "ci.faculty_name", params.get("faculty"), str),  # nome facoltà
        ("canale", "ci.canale", params.get("canale"), str),
        ("language", "ci.language", params.get("language"), str),
        ("date_year", "ci.date_year", params.get("date_year"), int),  # anno di inizio corso
        ("course_year", "ci.course_year", params.get("course_year"), int),  # anno accademico
    ]
    file_filters = [
        ("tag", "f.tag", params.get("tag"), str),  # tag del file (es. "esame", "esercizi", "appunti"...)
        ("extension", "f.extension", params.get("extension"), str),  # estensione del file (es. "pdf", "docx", "txt"...)
    ]

    # Determine if we need to join with files for file filters
    has_file_filters = any(value for param_name, field_name, value, type_ in file_filters if value)

    if has_file_filters:
        # Two-stage filtering: first filter vetrine, then filter by files
        base_query = f"""
            SELECT DISTINCT v.*, u.*, ci.*{favorite_select}
            FROM vetrina v
            JOIN course_instances ci ON v.course_instance_id = ci.instance_id
            JOIN users u ON v.author_id = u.user_id
            JOIN files f ON f.vetrina_id = v.vetrina_id
        """
    else:
        # Simple vetrina filtering without file join
        base_query = f"""
            SELECT v.*, u.*, ci.*{favorite_select}
            FROM vetrina v
            JOIN course_instances ci ON v.course_instance_id = ci.instance_id
            JOIN users u ON v.author_id = u.user_id
        """

    # Build WHERE clause and ORDER BY clause
    where_parts = ["1=1"]
    order_by_clause = ""

    # Handle text search with optimized ordering
    if "text" in params and params["text"]:
        text_search = f"%{params['text']}%"
        where_parts.append(
            "(v.name ILIKE %s OR v.description ILIKE %s OR ci.course_name ILIKE %s OR ci.faculty_name ILIKE %s OR u.username ILIKE %s OR CONCAT(u.first_name, ' ', u.last_name) ILIKE %s)"
        )
        where_params.extend([text_search] * 6)

        # Optimized ORDER BY using a single CASE statement
        order_by_clause = "ORDER BY CASE WHEN v.name ILIKE %s THEN 1 WHEN v.description ILIKE %s THEN 2 WHEN ci.course_name ILIKE %s THEN 3 WHEN ci.faculty_name ILIKE %s THEN 4 WHEN u.username ILIKE %s THEN 5 WHEN CONCAT(u.first_name, ' ', u.last_name) ILIKE %s THEN 6 ELSE 7 END"
        order_params.extend([text_search] * 6)

    # Add vetrina filters (always applied)
    for param_name, field_name, value, type_ in vetrina_filters:
        if value:
            value = type_(value)
            where_parts.append(f"{field_name} = %s")
            where_params.append(value)
            logging.info(f"Added vetrina filter {param_name} = {value} to query")

    # Add file filters (only when files are joined)
    if has_file_filters:
        for param_name, field_name, value, type_ in file_filters:
            if value:
                value = type_(value)
                where_parts.append(f"{field_name} = %s")
                where_params.append(value)
                logging.info(f"Added file filter {param_name} = {value} to query")

    # Build final query with proper parameter order
    where_clause = " AND ".join(where_parts)
    final_query = f"{base_query} WHERE {where_clause} {order_by_clause} LIMIT 100"

    # Combine parameters in the correct order: base + where + order
    all_params = base_params + where_params + order_params

    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(final_query, tuple(all_params))
            vetrine_data = cursor.fetchall()
            logging.info(f"Retrieved {len(vetrine_data)} vetrine for user {user_id}")
            return [Vetrina.from_dict(row) for row in vetrine_data]


def new_search(query: str, params: Dict[str, Any] = {}, user_id: Optional[int] = None) -> Tuple[List[Vetrina], Dict[int, List[Chunk]]]:
    with connect(vector=True) as conn:
        with conn.cursor() as cursor:
            try:
                lang = detect(query)
                if lang not in ["it", "en"]:
                    lang = "en"
            except:
                lang = "en"  # Default to English if detection fails

            tsquery_config = "english" if lang == "en" else "italian"

            # --- 1. Build Base Query and Filters ---
            base_from_clause = """
            FROM chunk_embeddings ce
            JOIN vetrina v ON ce.vetrina_id = v.vetrina_id
            JOIN course_instances ci ON v.course_instance_id = ci.instance_id
            """

            filter_conditions = ["1=1"]
            filter_params = []

            # Define filter metadata (name, db_field, type)
            vetrina_filter_defs = [
                ("course_name", "ci.course_name", str),
                ("faculty", "ci.faculty_name", str),
                ("canale", "ci.canale", str),
                ("language", "ci.language", str),
                ("date_year", "ci.date_year", int),
                ("course_year", "ci.course_year", int),
            ]

            file_filter_defs = [
                ("tag", "f.tag", str),
                ("extension", "f.extension", str),
            ]

            # Process Vetrina/Course filters
            for name, field, type_ in vetrina_filter_defs:
                value = params.get(name)
                if value is not None:
                    filter_conditions.append(f"{field} = %s")
                    filter_params.append(type_(value))

            # **FIXED SECTION**: Process File filters
            # First, determine if we need to join the files table
            has_file_filters = any(params.get(name) is not None for name, _, _ in file_filter_defs)

            if has_file_filters:
                base_from_clause += " JOIN files f ON ce.file_id = f.file_id "
                for name, field, type_ in file_filter_defs:
                    value = params.get(name)
                    if value is not None:
                        filter_conditions.append(f"{field} = %s")
                        filter_params.append(type_(value))

            where_clause = " AND ".join(filter_conditions)

            # --- 2. Prepare Embeddings and Parameters ---
            embedding = get_sentence_embedding(query).squeeze()
            k = 60  # Reciprocal rank constant

            # --- 3. Construct the Main SQL Query (No changes here) ---
            sql_query = f"""
            WITH combined_results AS (
                (
                    -- Semantic Search
                    SELECT
                        ce.vetrina_id,
                        ce.file_id,
                        ce.page_number,
                        ce.description, -- Pass description through for grouping
                        1.0 / (%s::integer + RANK() OVER (ORDER BY ce.embedding <#> %s)) AS semantic_score,
                        0.0 AS keyword_score
                    {base_from_clause}
                    WHERE {where_clause}
                    ORDER BY ce.embedding <#> %s
                    LIMIT 50
                )

                UNION ALL

                (
                    -- Keyword Search
                    SELECT
                        ce.vetrina_id,
                        ce.file_id,
                        ce.page_number,
                        ce.description, -- Pass description through for grouping
                        0.0 AS semantic_score,
                        1.0 / (%s::integer + RANK() OVER (ORDER BY ts_rank_cd(
                            CASE WHEN v.language = 'en' THEN to_tsvector('english', ce.description) ELSE to_tsvector('italian', ce.description) END,
                            plainto_tsquery('{tsquery_config}', %s::text)
                        ) DESC)) AS keyword_score
                    {base_from_clause}
                    WHERE {where_clause} AND
                        (CASE WHEN v.language = 'en' THEN to_tsvector('english', ce.description) ELSE to_tsvector('italian', ce.description) END) @@ plainto_tsquery('{tsquery_config}', %s::text)
                    LIMIT 50
                )
            ),
            ranked_results AS (
                -- Aggregate scores for unique chunks (now including description)
                SELECT
                    vetrina_id,
                    file_id,
                    page_number,
                    description, -- Keep description for the final join/select
                    SUM(semantic_score) as semantic_score,
                    SUM(keyword_score) as keyword_score,
                    (SUM(semantic_score) + SUM(keyword_score)) as score
                FROM combined_results
                GROUP BY vetrina_id, file_id, page_number, description -- Correctly group by the full chunk key
            )
            -- Final Selection with Late Joins
            SELECT
                r.score,
                r.semantic_score,
                r.keyword_score,
                r.description as chunk_description, -- Get description from our ranked results
                r.page_number,
                v.*, u.*, f.*, ci.*
            FROM ranked_results r
            JOIN vetrina v ON r.vetrina_id = v.vetrina_id
            JOIN users u ON v.author_id = u.user_id
            JOIN files f ON r.file_id = f.file_id
            JOIN course_instances ci ON v.course_instance_id = ci.instance_id
            ORDER BY r.score DESC
            LIMIT 15
            """

            # --- 4. Assemble Parameters and Execute ---
            semantic_params = [k, embedding] + filter_params + [embedding]
            keyword_params = [k, query] + filter_params + [query]
            all_params = semantic_params + keyword_params

            cursor.execute(sql_query, all_params)
            final_results_raw = cursor.fetchall()

            print(f"----------------------------------")
            vetrine = list()
            chunks = dict()

            for row in final_results_raw:
                vetrina = Vetrina.from_dict(row)
                file = File.from_dict(row)
                chunk = Chunk.from_dict(row)
                if vetrina not in vetrine:
                    vetrine.append(vetrina)
                chunks.setdefault(vetrina.vetrina_id, []).append(chunk)
                logging.info(
                    f"{chunk.chunk_description[:min(len(chunk.chunk_description), 120)]}..., [{file.display_name} (p. {chunk.page_number})], score: {round(row['score'], 4)} (sem: {round(row['semantic_score'], 4)}, key: {round(row['keyword_score'], 4)})"
                )
            print(f"----------------------------------")
            return vetrine, chunks


def create_vetrina(user_id: int, course_instance_id: int, name: str, description: str, price: float = 0.0) -> Vetrina:
    """
    Create a new vetrina.

    Args:
        user_id: ID of the user creating the vetrina
        course_instance_id: ID of the course instance for the vetrina
        name: Name of the vetrina
        description: Description of the vetrina
        price: Price of the vetrina (default: 0.0)

    Returns:
        Vetrina: The newly created vetrina object
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                WITH new_vetrina AS (
                    INSERT INTO vetrina (author_id, course_instance_id, name, description, price) 
                    VALUES (%s, %s, %s, %s, %s) 
                    RETURNING *
                )
                SELECT v.*, u.*, ci.*
                FROM new_vetrina v
                JOIN users u ON v.author_id = u.user_id
                JOIN course_instances ci ON v.course_instance_id = ci.instance_id
                """,
                (user_id, course_instance_id, name, description, price),
            )
            vetrina_data = cursor.fetchone()
            conn.commit()
            logging.info(f"Vetrina {vetrina_data['vetrina_id']} created by user {user_id} with price {price}")

            return Vetrina.from_dict(vetrina_data)


def delete_vetrina(user_id: int, vetrina_id: int) -> None:
    """
    Delete a vetrina.

    Args:
        vetrina_id: ID of the vetrina to delete
        user_id: ID of the user deleting the vetrina

    Raises:
        NotFoundException: If the vetrina is not found
        ForbiddenError: If the user is not the author of the vetrina
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM vetrina WHERE vetrina_id = %s AND author_id = %s", (vetrina_id, user_id))
            conn.commit()
            logging.info(f"Vetrina {vetrina_id} deleted by user {user_id}")


def get_vetrina_by_id(vetrina_id: int, user_id: int | None = None) -> Tuple[Vetrina, List[File], List[Review]]:
    """
    Get a vetrina by its ID.
    If user_id is provided, it will also check if the vetrina is in the user's favorites.
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            favorite_select = ""
            params = [vetrina_id]
            
            if user_id is not None:
                favorite_select = ", EXISTS(SELECT 1 FROM favourite_vetrine WHERE vetrina_id = v.vetrina_id AND user_id = %s) AS favorite"
                params.insert(0, user_id)
            
            cursor.execute(
                f"""
                SELECT v.*, u.*, ci.*{favorite_select}
                FROM vetrina v
                JOIN users u ON v.author_id = u.user_id
                JOIN course_instances ci ON v.course_instance_id = ci.instance_id
                WHERE v.vetrina_id = %s
                LIMIT 1
                """,
                params,
            )
            vetrina_data = cursor.fetchone()
            if not vetrina_data:
                raise NotFoundException("Vetrina not found")
            vetrina = Vetrina.from_dict(vetrina_data)
            
            cursor.execute("SELECT * FROM files WHERE vetrina_id = %s", (vetrina_id,))
            files_data = cursor.fetchall()
            files = [File.from_dict(file_data) for file_data in files_data]

            cursor.execute("SELECT * FROM review WHERE vetrina_id = %s", (vetrina_id,))
            reviews_data = cursor.fetchall()
            reviews = [Review.from_dict(review_data) for review_data in reviews_data]

            return vetrina, files, reviews
            
# ---------------------------------------------
# Course management
# ---------------------------------------------


def scrape_faculties_courses() -> Dict[str, List[Tuple[str, str]]]:
    """
    Scrape courses from the database, avoiding duplicates by course_code and faculty_name.

    Returns:
        Dict[str, List[Tuple[str, str]]]: Dictionary of faculties with their courses (course_code, course_name)
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT DISTINCT course_code, course_name, faculty_name FROM course_instances")
            courses = cursor.fetchall()
            faculties = {}

            for course in courses:
                if course["faculty_name"] not in faculties:
                    faculties[course["faculty_name"]] = []
                faculties[course["faculty_name"]].append((course["course_code"], course["course_name"]))

            return faculties


def get_course_by_id(course_id: int) -> CourseInstance:
    """
    Get a course by its ID.

    Args:
        course_id: ID of the course to retrieve

    Returns:
        CourseInstance: The course instance object

    Raises:
        NotFoundException: If the course is not found
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT instance_id, course_code, course_name, faculty_name, course_year, date_year, language, course_semester, canale, professors FROM course_instances WHERE instance_id = %s",
                (course_id,),
            )
            course_data = cursor.fetchone()

            if not course_data:
                raise NotFoundException("Course not found")

            logging.info(f"Course {course_id} retrieved")
            return CourseInstance(**course_data)


faculties_courses_cache = None

# ---------------------------------------------
# File management
# ---------------------------------------------


def add_file_to_vetrina(
    requester_id: int,
    vetrina_id: int,
    file_name: str,
    sha256: str,
    extension: str,
    price: int = 0,
    size: int = 0,
    tag: str | None = None,
    language: str = "it",
    num_pages: int = 0,
    display_name: str | None = None,
) -> File:
    """
    Add a file to a vetrina.

    Args:
        requester_id: ID of the user making the request
        vetrina_id: ID of the vetrina to add the file to
        file_name: Name of the file
        sha256: SHA256 hash of the file
        extension: Extension of the file
        price: Price of the file
        size: Size of the file in bytes
        tag: Tag for the file
        language: Language of the file
        num_pages: Number of pages in the file
        display_name: Display name for the file (if None, uses original filename without path)
    Raises:
        NotFoundException: If the vetrina doesn't exist
        ForbiddenError: If the requester is not the author of the vetrina
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            with conn.transaction():

                # First check if the vetrina exists
                cursor.execute("SELECT author_id FROM vetrina WHERE vetrina_id = %s", (vetrina_id,))
                vetrina = cursor.fetchone()

                if not vetrina:
                    raise NotFoundException("Vetrina not found")

                # Then check if the requester is the author
                if vetrina["author_id"] != requester_id:
                    raise ForbiddenError("Only the author can add files to this vetrina")

                # If all checks pass, insert the file
                cursor.execute(
                    "INSERT INTO files (vetrina_id, filename, display_name, sha256, price, size, tag, extension, language, num_pages) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *",
                    (vetrina_id, file_name, display_name, sha256, price, size, tag, extension, language, num_pages),
                )
                file_data = cursor.fetchone()
                file = File.from_dict(file_data)

                logging.info(f'File "{file_name}" added to vetrina {vetrina_id} by user {requester_id}, display_name: {display_name}, tag: {tag}')
            return File.from_dict(file_data)


def insert_chunk_embeddings(vetrina_id: int, file_id: int, chunks: list[dict[str, str | int | np.ndarray]]) -> None:
    """Insert chunk embeddings into the database"""
    with connect(vector=True) as conn:
        with conn.cursor() as cursor:
            for chunk in chunks:
                page_number = chunk["page_number"]
                description = chunk["description"]
                embedding = chunk["embedding"]

                pg_vector_data = embedding.squeeze()
                cursor.execute(
                    """INSERT INTO chunk_embeddings 
                       (vetrina_id, file_id, page_number, description, embedding) 
                       VALUES (%s, %s, %s, %s, %s)""",
                    (vetrina_id, file_id, page_number, description, pg_vector_data),
                )
                conn.commit()
            logging.info(f"Inserted {len(chunks)} chunk embeddings")


def update_file_display_name(user_id: int, file_id: int, new_display_name: str) -> File:
    """
    Update the display name of a file owned by the user.

    Args:
        user_id: ID of the user updating the file
        file_id: ID of the file to update
        new_display_name: New display name for the file

    Returns:
        File: The updated file object

    Raises:
        NotFoundException: If the file doesn't exist or the user doesn't own it
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            # Update the display name only if the user owns the file (through vetrina authorship)
            cursor.execute(
                """
                UPDATE files 
                SET display_name = %s 
                FROM vetrina v 
                WHERE files.file_id = %s 
                AND files.vetrina_id = v.vetrina_id 
                AND v.author_id = %s
                RETURNING *
                """,
                (new_display_name, file_id, user_id),
            )
            if cursor.rowcount == 0:
                raise NotFoundException("File not found or you don't have permission to update it")
            file_data = cursor.fetchone()
            logging.info(f"File {file_id} display name updated to '{new_display_name}' by user {user_id}")
            return File.from_dict(file_data)


def get_files_from_vetrina(vetrina_id: int, user_id: int | None = None) -> List[File]:
    """
    Get all files from a vetrina.

    Args:
        vetrina_id: ID of the vetrina whose files to retrieve
        user_id: Optional ID of the user to check file ownership and favorites

    Returns:
        List[File]: List of File objects in the vetrina, with ownership and favorite information if user_id is provided
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            if user_id is not None:
                # Query that checks if the user owns the file
                # and if the file is favorited by the user
                cursor.execute(
                    """
                    SELECT f.*,
                           EXISTS(SELECT 1 FROM owned_files WHERE file_id = f.file_id AND owner_id = %s) AS owned,
                           EXISTS(SELECT 1 FROM favourite_file WHERE file_id = f.file_id AND user_id = %s) AS favorite
                    FROM files f
                    WHERE f.vetrina_id = %s
                    """,
                    (user_id, user_id, vetrina_id),
                )
            else:
                cursor.execute(
                    """
                    SELECT f.*
                    FROM files f
                    WHERE f.vetrina_id = %s
                    """,
                    (vetrina_id,),
                )
            files_data = cursor.fetchall()
            # logging.info(f"Retrieved {len(files_data)} files for vetrina {vetrina_id}, user {user_id}")
            return [File.from_dict(data) for data in files_data]


def delete_file(requester_id: int, file_id: int) -> File:
    """
    Delete a file to which the requester has access.

    Args:
        requester_id: ID of the user making the request
        file_id: ID of the file to delete

    Returns:
        File: The deleted file object

    Raises:
        NotFoundException: If the file is not found or the user doesn't have access
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM files 
                WHERE file_id = %s 
                AND vetrina_id IN (
                    SELECT v.vetrina_id 
                    FROM vetrina v 
                    WHERE v.author_id = %s
                )
            """,
                (file_id, requester_id),
            )
            conn.commit()
            logging.info(f"File {file_id} deleted by user {requester_id}")


def get_file(file_id: int) -> File:
    """
    Get a file.

    Args:
        file_id: ID of the file to retrieve

    Returns:
        File: The file object

    Raises:
        NotFoundException: If the file is not found
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM files WHERE file_id = %s",
                (file_id,),
            )
            file_data = cursor.fetchone()

            if not file_data:
                raise NotFoundException("File not found")
            return File.from_dict(file_data)


def check_file_ownership(user_id: int, file_id: int) -> File:
    """
    Check if a user owns a file.

    Args:
        user_id: ID of the user to check
        file_id: ID of the file to check

    Returns:
        File: The file object if the user owns it, None otherwise
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            # Single query that returns file data only if user has ownership access
            cursor.execute(
                """
                SELECT f.* FROM files f
                WHERE f.file_id = %s 
                AND EXISTS(SELECT 1 FROM owned_files WHERE owner_id = %s AND file_id = %s)
                """,
                (file_id, user_id, file_id),
            )

            file_data = cursor.fetchone()
            if not file_data:
                raise ForbiddenError("You do not have access to this file")

            file = File.from_dict(file_data)
            file.owned = True
            logging.info(f"File {file_id} is owned by user {user_id}")
            return file


# ---------------------------------------------
# File ownership management
# ---------------------------------------------


def add_owned_file(user_id: int, file_id: int) -> None:
    """
    Add a file to the owned files of a user.
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("INSERT INTO owned_files (owner_id, file_id) VALUES (%s, %s)", (user_id, file_id))
            conn.commit()
            logging.info(f"File {file_id} added to owned files of user {user_id}")


def remove_owned_file(user_id: int, file_id: int) -> None:
    """
    Remove a file from the owned files of a user.
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM owned_files WHERE owner_id = %s AND file_id = %s", (user_id, file_id))
            conn.commit()
            logging.info(f"File {file_id} removed from owned files of user {user_id}")


# ---------------------------------------------
# Transaction management
# ---------------------------------------------


def buy_file_transaction(user_id: int, file_id: int) -> Tuple[Transaction, File]:
    """
    Create a new transaction for purchasing a file.

    Args:
        user_id: ID of the user making the purchase
        file_id: ID of the file being purchased

    Returns:
        Transaction: The created transaction object

    Raises:
        NotFoundException: If the file is not found
        AlreadyOwnedError: If the user already owns the file
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            with conn.transaction():
                cursor.execute(
                    """
                    SELECT 1 FROM owned_files WHERE owner_id = %s AND file_id = %s
                    """,
                    (user_id, file_id),
                )

                if cursor.fetchone():
                    raise AlreadyOwnedError("You already own this file")

                logging.info(f"File {file_id} not owned by user {user_id}")

                cursor.execute(
                    "SELECT * FROM files WHERE file_id = %s",
                    (file_id,),
                )
                file_data = cursor.fetchone()

                logging.info(f"File {file_id} retrieved for transaction")

                if not file_data:
                    raise NotFoundException("File not found")

                file = File.from_dict(file_data)

                cursor.execute(
                    "INSERT INTO transactions (user_id, amount) VALUES (%s, %s) RETURNING *",
                    (user_id, file.price),
                )
                transaction_data = cursor.fetchone()
                transaction = Transaction.from_dict(transaction_data)
                logging.info(f"Transaction {transaction.transaction_id} created for file {file_id} bought by user {user_id}")

                cursor.execute(
                    "INSERT INTO owned_files (owner_id, file_id, transaction_id) VALUES (%s, %s, %s)", (user_id, file_id, transaction.transaction_id)
                )
                cursor.execute("UPDATE files SET download_count = download_count + 1 WHERE file_id = %s", (file_id,))
                logging.info(f"File {file_id} bought by user {user_id} with transaction {transaction.transaction_id}")
            return transaction, file


# ---------------------------------------------
# Favorite management
# ---------------------------------------------


def add_favorite_vetrina(user_id: int, vetrina_id: int) -> None:
    """
    Add a vetrina to user's favorites.

    Args:
        user_id: ID of the user
        vetrina_id: ID of the vetrina to add to favorites

    Raises:
        NotFoundException: If the vetrina doesn't exist
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("INSERT INTO favourite_vetrine (user_id, vetrina_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (user_id, vetrina_id))
            conn.commit()
            logging.info(f"Vetrina {vetrina_id} added to favorites of user {user_id}")


def remove_favorite_vetrina(user_id: int, vetrina_id: int) -> None:
    """
    Remove a vetrina from user's favorites.

    Args:
        user_id: ID of the user
        vetrina_id: ID of the vetrina to remove from favorites

    Raises:
        NotFoundException: If the favorite doesn't exist
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM favourite_vetrine WHERE user_id = %s AND vetrina_id = %s", (user_id, vetrina_id))
            if cursor.rowcount == 0:
                raise NotFoundException("Favorite vetrina not found")
            conn.commit()
            logging.info(f"Vetrina {vetrina_id} removed from favorites of user {user_id}")


def add_favorite_file(user_id: int, file_id: int) -> None:
    """
    Add a file to user's favorites.

    Args:
        user_id: ID of the user
        file_id: ID of the file to add to favorites

    Raises:
        NotFoundException: If the file doesn't exist
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("INSERT INTO favourite_file (user_id, file_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (user_id, file_id))
            conn.commit()
            logging.info(f"File {file_id} added to favorites of user {user_id}")


def remove_favorite_file(user_id: int, file_id: int) -> None:
    """
    Remove a file from user's favorites.

    Args:
        user_id: ID of the user
        file_id: ID of the file to remove from favorites

    Raises:
        NotFoundException: If the favorite doesn't exist
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM favourite_file WHERE user_id = %s AND file_id = %s", (user_id, file_id))
            if cursor.rowcount == 0:
                raise NotFoundException("Favorite file not found")
            conn.commit()
            logging.info(f"File {file_id} removed from favorites of user {user_id}")


def get_vetrine_with_owned_files(user_id: int) -> List[Vetrina]:
    """
    Get all vetrine where the user has ownership access.
    A vetrina is included if the user owns at least one file in it.

    Args:
        user_id: ID of the user whose accessible vetrine to retrieve

    Returns:
        List[Vetrina]: List of Vetrina objects (without files)
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT DISTINCT
                    v.*, u.*, ci.*,
                    EXISTS(SELECT 1 FROM favourite_vetrine WHERE vetrina_id = v.vetrina_id AND user_id = %s) AS favorite
                FROM vetrina v
                JOIN users u ON v.author_id = u.user_id
                JOIN course_instances ci ON v.course_instance_id = ci.instance_id
                WHERE (
                    EXISTS(SELECT 1 FROM owned_files of JOIN files f ON of.file_id = f.file_id WHERE f.vetrina_id = v.vetrina_id AND of.owner_id = %s)
                )
                ORDER BY v.vetrina_id
                """,
                (user_id, user_id),
            )
            results = cursor.fetchall()
            logging.info(f"Retrieved {len(results)} vetrine with owned files for user {user_id}")
            return [Vetrina.from_dict(row) for row in results]


def get_favorites(user_id: int) -> List[Vetrina]:
    """
    Get all vetrine that are either favorited or contain favorite files for a user.

    Args:
        user_id: ID of the user whose favorite vetrine to retrieve

    Returns:
        List[Vetrina]: List of Vetrina objects (without files) with favorite=True if the vetrina itself is favorited
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT DISTINCT
                    v.*, u.*, ci.*,
                    EXISTS(SELECT 1 FROM favourite_vetrine WHERE vetrina_id = v.vetrina_id AND user_id = %s) AS favorite
                FROM vetrina v
                JOIN users u ON v.author_id = u.user_id
                JOIN course_instances ci ON v.course_instance_id = ci.instance_id
                WHERE (
                    EXISTS(SELECT 1 FROM favourite_vetrine WHERE vetrina_id = v.vetrina_id AND user_id = %s) OR
                    EXISTS(SELECT 1 FROM favourite_file ff JOIN files f ON ff.file_id = f.file_id WHERE f.vetrina_id = v.vetrina_id AND ff.user_id = %s)
                )
                ORDER BY v.vetrina_id
                """,
                (user_id, user_id, user_id),
            )
            results = cursor.fetchall()
            logging.info(f"Retrieved {len(results)} vetrine with favorite files for user {user_id}")
            return [Vetrina.from_dict(row) for row in results]


# ---------------------------------------------
# Review management
# ---------------------------------------------


def get_reviews_for_user_vetrine(user_id: int) -> List[Review]:
    """
    Get all reviews for vetrine and files that belong to vetrine authored by a specific user.

    Args:
        user_id: ID of the user whose vetrine reviews to retrieve

    Returns:
        List[Review]: List of Review objects for vetrine and files authored by the user
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT r.*, u.*, v.name as vetrina_name, f.display_name as file_name
                FROM review r
                JOIN users u ON r.user_id = u.user_id
                JOIN vetrina v ON r.vetrina_id = v.vetrina_id
                LEFT JOIN files f ON r.file_id = f.file_id
                WHERE v.author_id = %s
                ORDER BY r.review_date DESC
                """,
                (user_id,),
            )
            reviews_data = cursor.fetchall()
            logging.info(f"Retrieved {len(reviews_data)} reviews for vetrine and files authored by user {user_id}")
            return [Review.from_dict(row) for row in reviews_data]


def get_reviews_authored_by_user(user_id: int) -> List[Review]:
    """
    Get all reviews authored by a specific user (reviews written by that user).

    Args:
        user_id: ID of the user whose reviews to retrieve

    Returns:
        List[Review]: List of Review objects authored by the user
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT r.*, u.*, v.name as vetrina_name, f.display_name as file_name
                FROM review r
                JOIN users u ON r.user_id = u.user_id
                JOIN vetrina v ON r.vetrina_id = v.vetrina_id
                LEFT JOIN files f ON r.file_id = f.file_id
                WHERE r.user_id = %s
                ORDER BY r.review_date DESC
                """,
                (user_id,),
            )
            reviews_data = cursor.fetchall()
            logging.info(f"Retrieved {len(reviews_data)} reviews authored by user {user_id}")
            return [Review.from_dict(row) for row in reviews_data]


def add_vetrina_review(user_id: int, rating: int, review_text: str, vetrina_id: int) -> Review:
    """
    Add a review to a vetrina.

    Args:
        user_id: ID of the user adding the review
        rating: Rating (1-5)
        review_text: Text of the review
        vetrina_id: ID of the vetrina to review

    Returns:
        Review: The created review object
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                WITH new_review AS (
                    INSERT INTO review (user_id, vetrina_id, file_id, rating, review_text) 
                    VALUES (%s, %s, NULL, %s, %s) 
                    RETURNING *
                )
                SELECT r.*, u.*, v.name as vetrina_name, NULL as file_name
                FROM new_review r
                JOIN users u ON r.user_id = u.user_id
                JOIN vetrina v ON r.vetrina_id = v.vetrina_id
                """,
                (user_id, vetrina_id, rating, review_text),
            )
            review_data = cursor.fetchone()
            review = Review.from_dict(review_data)
            logging.info(f"Review added by user {user_id} for vetrina {vetrina_id}")
            return review


def add_file_review(user_id: int, rating: int, review_text: str, file_id: int) -> Review:
    """
    Add a review to a file.

    Args:
        user_id: ID of the user adding the review
        rating: Rating (1-5)
        review_text: Text of the review
        file_id: ID of the file to review

    Returns:
        Review: The created review object
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                WITH new_review AS (
                    INSERT INTO review (user_id, vetrina_id, file_id, rating, review_text) 
                    SELECT %s, f.vetrina_id, %s, %s, %s
                    FROM files f
                    WHERE f.file_id = %s
                    RETURNING *
                )
                SELECT r.*, u.*, NULL as vetrina_name, f.display_name as file_name
                FROM new_review r
                JOIN users u ON r.user_id = u.user_id
                JOIN files f ON r.file_id = f.file_id
                """,
                (user_id, file_id, rating, review_text, file_id),
            )
            review_data = cursor.fetchone()
            review = Review.from_dict(review_data)
            logging.info(f"Review added by user {user_id} for file {file_id}")
            return review


def get_vetrina_reviews(vetrina_id: int) -> List[Review]:
    """
    Get all reviews for a vetrina.
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT r.*, u.*, v.name as vetrina_name, NULL as file_name
                FROM review r
                JOIN users u ON r.user_id = u.user_id
                JOIN vetrina v ON r.vetrina_id = v.vetrina_id
                WHERE r.vetrina_id = %s AND r.file_id IS NULL
                ORDER BY r.review_date DESC
                """,
                (vetrina_id,),
            )
            reviews_data = cursor.fetchall()
            logging.info(f"Retrieved {len(reviews_data)} reviews for vetrina {vetrina_id}")
            return [Review.from_dict(row) for row in reviews_data]


def get_file_reviews(file_id: int) -> List[Review]:
    """
    Get all reviews for a file.
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT r.*, u.*, NULL as vetrina_name, f.display_name as file_name
                FROM review r
                JOIN users u ON r.user_id = u.user_id
                JOIN files f ON r.file_id = f.file_id
                WHERE r.file_id = %s
                ORDER BY r.review_date DESC
                """,
                (file_id,),
            )
            reviews_data = cursor.fetchall()
            logging.info(f"Retrieved {len(reviews_data)} reviews for file {file_id}")
            return [Review.from_dict(row) for row in reviews_data]


def delete_review(user_id: int, file_id: int | None = None, vetrina_id: int | None = None) -> None:
    """
    Delete a review from a vetrina or file.

    Args:
        user_id: ID of the user deleting the review
        file_id: ID of the file to delete the review from (optional, for file-specific reviews)
        vetrina_id: ID of the vetrina to delete the review from (optional, for vetrina-specific reviews)

    Raises:
        ValueError: If neither file_id nor vetrina_id is provided
        NotFoundException: If the review doesn't exist
        ForbiddenError: If the user is not the author of the review
    """
    if file_id is None and vetrina_id is None:
        raise ValueError("Either file_id or vetrina_id must be provided")

    with connect() as conn:
        with conn.cursor() as cursor:
            if file_id is not None:
                # Delete file review
                cursor.execute("DELETE FROM review WHERE user_id = %s AND file_id = %s", (user_id, file_id))
            else:
                # Delete vetrina review
                cursor.execute("DELETE FROM review WHERE user_id = %s AND vetrina_id = %s AND file_id IS NULL", (user_id, vetrina_id))

            if cursor.rowcount == 0:
                raise NotFoundException("Review not found")
            conn.commit()
            logging.info(f"Review deleted by user {user_id} for {'file' if file_id else 'vetrina'} {file_id or vetrina_id}")


# ---------------------------------------------
# Follow management
# ---------------------------------------------


def follow_user(user_id: int, followed_user_id: int) -> None:
    """
    Follow a user.

    Args:
        user_id: ID of the user doing the following
        followed_user_id: ID of the user to follow

    Raises:
        NotFoundException: If the user to follow doesn't exist
        ValueError: If user tries to follow themselves
    """
    if user_id == followed_user_id:
        raise ValueError("Users cannot follow themselves")

    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO follow (user_id, followed_user_id) VALUES (%s, %s) RETURNING *",
                (user_id, followed_user_id),
            )
            conn.commit()
            logging.info(f"User {user_id} started following user {followed_user_id}")


def unfollow_user(user_id: int, followed_user_id: int) -> None:
    """
    Unfollow a user.

    Args:
        user_id: ID of the user doing the unfollowing
        followed_user_id: ID of the user to unfollow

    Raises:
        NotFoundException: If the follow relationship doesn't exist
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM follow WHERE user_id = %s AND followed_user_id = %s", (user_id, followed_user_id))
            conn.commit()
            logging.info(f"User {user_id} unfollowed user {followed_user_id}")


def get_user_followers(user_id: int) -> List[User]:
    """
    Get all followers of a user.

    Args:
        user_id: ID of the user whose followers to retrieve

    Returns:
        List[User]: List of User objects containing follower information
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT u.*
                FROM follow f
                JOIN users u ON f.user_id = u.user_id
                WHERE f.followed_user_id = %s
                ORDER BY u.username
                """,
                (user_id,),
            )
            followers_data = cursor.fetchall()
            logging.info(f"Found {len(followers_data)} followers for user {user_id}")

            return [User.from_dict(follower_row) for follower_row in followers_data]


def get_user_following(user_id: int) -> List[User]:
    """
    Get all users that a user is following.

    Args:
        user_id: ID of the user whose following list to retrieve

    Returns:
        List[User]: List of User objects containing followed user information
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT u.*
                FROM follow f
                JOIN users u ON f.followed_user_id = u.user_id
                WHERE f.user_id = %s
                ORDER BY u.username
                """,
                (user_id,),
            )
            following_data = cursor.fetchall()
            logging.info(f"Found {len(following_data)} users that user {user_id} is following")

            return [User.from_dict(following_row) for following_row in following_data]


# ---------------------------------------------
# Email verification management
# ---------------------------------------------


def verify_email_token(token: str) -> User:
    """
    Verify an email verification token and activate the user account.

    Args:
        token: The email verification token

    Returns:
        User: The verified user object

    Raises:
        UnauthorizedError: If the token is invalid or expired
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT * FROM users 
                WHERE email_verification_token = %s 
                AND email_verification_expires > %s
                AND email_verified = FALSE
                """,
                (token, datetime.utcnow())
            )
            user_data = cursor.fetchone()
            
            if not user_data:
                raise UnauthorizedError("Invalid or expired verification token")
            
            # Mark email as verified and clear verification data
            cursor.execute(
                """
                UPDATE users 
                SET email_verified = TRUE, 
                    email_verification_token = NULL, 
                    email_verification_code = NULL,
                    email_verification_expires = NULL
                WHERE user_id = %s
                RETURNING *
                """,
                (user_data['user_id'],)
            )
            
            updated_user_data = cursor.fetchone()
            conn.commit()
            logging.info(f"Email verified for user {user_data['user_id']}")
            
            return User.from_dict(updated_user_data)


def verify_email_code(email: str, code: str) -> User:
    """
    Verify an email verification code and activate the user account.

    Args:
        email: The user's email address
        code: The 6-digit verification code

    Returns:
        User: The verified user object

    Raises:
        UnauthorizedError: If the code is invalid or expired
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT * FROM users 
                WHERE email = %s 
                AND email_verification_code = %s 
                AND email_verification_expires > %s
                AND email_verified = FALSE
                """,
                (email, code, datetime.utcnow())
            )
            user_data = cursor.fetchone()
            
            if not user_data:
                raise UnauthorizedError("Invalid or expired verification code")
            
            # Mark email as verified and clear verification data
            cursor.execute(
                """
                UPDATE users 
                SET email_verified = TRUE, 
                    email_verification_token = NULL, 
                    email_verification_code = NULL,
                    email_verification_expires = NULL
                WHERE user_id = %s
                RETURNING *
                """,
                (user_data['user_id'],)
            )
            
            updated_user_data = cursor.fetchone()
            conn.commit()
            logging.info(f"Email verified with code for user {user_data['user_id']}")
            
            return User.from_dict(updated_user_data)


def resend_verification_email(email: str) -> Tuple[str, str]:
    """
    Generate and store new verification token and code for a user.

    Args:
        email: The user's email address

    Returns:
        Tuple[str, str]: New verification token and code

    Raises:
        NotFoundException: If the user doesn't exist
        ValueError: If the email is already verified
    """
    verification_token = secrets.token_urlsafe(32)
    verification_code = ''.join(random.choices(string.digits, k=6))
    expires_at = datetime.utcnow() + timedelta(hours=24)
    
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT user_id, email_verified FROM users WHERE email = %s", (email,))
            user_data = cursor.fetchone()
            
            if not user_data:
                raise NotFoundException("User not found")
            
            if user_data['email_verified']:
                raise ValueError("Email already verified")
            
            cursor.execute(
                """
                UPDATE users 
                SET email_verification_token = %s, 
                    email_verification_code = %s,
                    email_verification_expires = %s
                WHERE user_id = %s
                """,
                (verification_token, verification_code, expires_at, user_data['user_id'])
            )
            
            conn.commit()
            logging.info(f"Verification email resent for user {user_data['user_id']}")
            
            return verification_token, verification_code


def get_user_by_email(email: str) -> Optional[User]:
    """
    Get a user by their email address.

    Args:
        email: The email address to search for

    Returns:
        User: The user object if found, None otherwise
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            user_data = cursor.fetchone()
            return User.from_dict(user_data) if user_data else None
