from typing import Any, Dict, List, Optional, Tuple
import psycopg
import os
from common import CourseInstance, File, Transaction, User, Vetrina, VetrinaSubscription
from db_errors import UnauthorizedError, NotFoundException, ForbiddenError, AlreadyOwnedError
from dotenv import load_dotenv
import logging
import pandas as pd

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
load_dotenv()

DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")


def connect(autocommit: bool = False, no_dict_row_factory: bool = False) -> psycopg.Connection:
    return psycopg.connect(
        f"dbname={DB_NAME} user={DB_USER} password={DB_PASSWORD}",
        autocommit=autocommit,
        row_factory=psycopg.rows.dict_row if not no_dict_row_factory else None,
    )


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


# ---------------------------------------------
# Subscription management
# ---------------------------------------------


def unsubscribe_from_vetrina(user_id: int, vetrina_id: int) -> None:
    """
    Unsubscribe a user from a vetrina and remove all files associated with this subscription.

    Args:
        user_id: ID of the user unsubscribing
        vetrina_id: ID of the vetrina to unsubscribe from

    Raises:
        NotFoundException: If the subscription doesn't exist
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM vetrina_subscriptions WHERE subscriber_id = %s AND vetrina_id = %s", (user_id, vetrina_id))
            if cursor.rowcount == 0:
                raise NotFoundException("Subscription or vetrina not found")


def get_user_subscriptions(user_id: int) -> List[VetrinaSubscription]:
    """
    Get all vetrina subscriptions for a specific user.

    Args:
        user_id: ID of the user whose subscriptions to retrieve

    Returns:
        List[VetrinaSubscription]: List of VetrinaSubscription objects containing subscription information
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT v.*, vs.*, u.*, ci.*
                FROM vetrina_subscriptions vs
                JOIN vetrina v ON vs.vetrina_id = v.vetrina_id
                JOIN users u ON v.author_id = u.user_id
                JOIN course_instances ci ON v.course_instance_id = ci.instance_id
                WHERE vs.subscriber_id = %s
                """,
                (user_id,),
            )
            subscriptions_data = cursor.fetchall()

            result = []
            for sub_row in subscriptions_data:
                subscription = VetrinaSubscription.from_dict(sub_row)
                result.append(subscription)
            return result


def get_vetrina_subscribers(vetrina_id: int) -> List[User]:
    """
    Get all subscribers for a specific vetrina.

    Args:
        vetrina_id: ID of the vetrina whose subscribers to retrieve

    Returns:
        List[User]: List of User objects containing subscriber information
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT u.*
                FROM vetrina_subscriptions vs
                JOIN users u ON vs.subscriber_id = u.user_id
                WHERE vs.vetrina_id = %s
                """,
                (vetrina_id,),
            )
            subscribers_data = cursor.fetchall()

            return [User.from_dict(user_row) for user_row in subscribers_data]


# ---------------------------------------------
# User management
# ---------------------------------------------


def create_user(username: str, email: str, password: str, name: str, surname: str) -> User:
    """
    Create a new user.

    Args:
        username: The username for the new user
        email: The email address for the new user
        password: The password for the new user
        name: The name for the new user
        surname: The surname for the new user

    Returns:
        User: The newly created user object

    Raises:
        UniqueViolation: If the username or email already exists
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO users (username, email, password, first_name, last_name)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (username, email, password, name, surname),
            )
            user_data = cursor.fetchone()
            conn.commit()

            return User.from_dict(user_data)


def verify_user(email: str, password: str) -> User:
    """
    Verify a user's credentials.

    Args:
        email: The user's email address
        password: The user's password

    Returns:
        User: The user object if the credentials are valid

    Raises:
        UnauthorizedError: If the email or password is invalid
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            user_data = cursor.fetchone()
            if not user_data or password != user_data["password"]:
                raise UnauthorizedError("Invalid email or password")

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


def get_user_by_id(user_id: int) -> User:
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

    # Add file filters (only when files are joined)
    if has_file_filters:
        for param_name, field_name, value, type_ in file_filters:
            if value:
                value = type_(value)
                where_parts.append(f"{field_name} = %s")
                where_params.append(value)

    # Build final query with proper parameter order
    where_clause = " AND ".join(where_parts)
    final_query = f"{base_query} WHERE {where_clause} {order_by_clause} LIMIT 100"

    # Combine parameters in the correct order: base + where + order
    all_params = base_params + where_params + order_params

    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(final_query, tuple(all_params))
            vetrine_data = cursor.fetchall()
            return [Vetrina.from_dict(row) for row in vetrine_data]


def get_vetrina_by_id(vetrina_id: int, user_id: Optional[int] = None) -> Vetrina:
    """
    Get a specific vetrina by ID.

    Args:
        vetrina_id: ID of the vetrina to retrieve
        user_id: Optional ID of the user to check favorite status

    Returns:
        Vetrina: The vetrina object with complete information

    Raises:
        NotFoundException: If the vetrina is not found
    """
    query_params = [vetrina_id]
    
    # Build the query with conditional favorite check
    favorite_select = ""
    if user_id is not None:
        favorite_select = ", EXISTS(SELECT 1 FROM favourite_vetrine WHERE vetrina_id = v.vetrina_id AND user_id = %s) AS is_vetrina_favorite"
        query_params.append(user_id)

    query = f"""
        SELECT v.vetrina_id as v_id, v.name as v_name, v.description, v.course_instance_id,
               u.user_id as u_id, u.username, u.first_name as u_name, u.last_name as u_surname, u.email, u.last_login as u_last_login, u.registration_date as u_created_at,
               ci.instance_id as ci_id, ci.course_code, ci.course_name, ci.faculty_name, ci.course_year, 
               ci.date_year, ci.language, ci.course_semester, ci.canale, ci.professors{favorite_select}
        FROM vetrina v
        JOIN course_instances ci ON v.course_instance_id = ci.instance_id
        JOIN users u ON v.author_id = u.user_id
        WHERE v.vetrina_id = %s
    """

    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, tuple(query_params))
            row = cursor.fetchone()
            
            if not row:
                raise NotFoundException(f"Vetrina with id {vetrina_id} not found")
                
            author = User(
                id=row["u_id"],
                username=row["username"],
                name=row["u_name"],
                surname=row["surname"],
                email=row["email"],
                last_login=row["u_last_login"],
                created_at=row["u_created_at"],
            )
            course_instance = CourseInstance(
                instance_id=row["ci_id"],
                course_code=row["course_code"],
                course_name=row["course_name"],
                faculty_name=row["faculty_name"],
                year=row["course_year"],
                date_year=row["date_year"],
                language=row["language"],
                course_semester=row["course_semester"],
                canale=row["canale"],
                professors=row["professors"],
            )
            vetrina = Vetrina(
                id=row["v_id"],
                name=row["v_name"],
                author=author,
                description=row["description"],
                course_instance=course_instance,
            )
            if user_id is not None:
                vetrina.favorite = row["is_vetrina_favorite"]
                
            return vetrina


def create_vetrina(user_id: int, course_instance_id: int, name: str, description: str) -> Vetrina:
    """
    Create a new vetrina.

    Args:
        user_id: ID of the user creating the vetrina
        course_instance_id: ID of the course instance for the vetrina
        name: Name of the vetrina
        description: Description of the vetrina

    Returns:
        Vetrina: The newly created vetrina object
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                WITH new_vetrina AS (
                    INSERT INTO vetrina (author_id, course_instance_id, name, description) 
                    VALUES (%s, %s, %s, %s) 
                    RETURNING *
                )
                SELECT v.*, u.*, ci.*
                FROM new_vetrina v
                JOIN users u ON v.author_id = u.user_id
                JOIN course_instances ci ON v.course_instance_id = ci.instance_id
                """,
                (user_id, course_instance_id, name, description),
            )
            vetrina_data = cursor.fetchone()

            conn.commit()

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

            return CourseInstance(**course_data)


faculties_courses_cache = None

# ---------------------------------------------
# File management
# ---------------------------------------------


def add_file_to_vetrina(
    requester_id: int, vetrina_id: int, file_name: str, sha256: str, extension: str, price: int = 0, size: int = 0, tag: str | None = None
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
                    "INSERT INTO files (vetrina_id, filename, sha256, price, size, tag, extension) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *",
                    (vetrina_id, file_name, sha256, price, size, tag, extension),
                )
                file_data = cursor.fetchone()

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
                # Query that checks if the user owns the file either directly or through subscription
                # and if the file is favorited by the user
                cursor.execute(
                    """
                    SELECT f.*,
                           (EXISTS(SELECT 1 FROM owned_files WHERE file_id = f.file_id AND owner_id = %s) OR
                            EXISTS(SELECT 1 FROM vetrina_subscriptions WHERE vetrina_id = %s AND subscriber_id = %s)) AS owned,
                           EXISTS(SELECT 1 FROM favourite_file WHERE file_id = f.file_id AND user_id = %s) AS favorite
                    FROM files f
                    WHERE f.vetrina_id = %s
                    """,
                    (user_id, vetrina_id, user_id, user_id, vetrina_id),
                )
            else:
                cursor.execute(
                    """
                    SELECT f.*
                    FROM files 
                    WHERE vetrina_id = %s
                    """,
                    (vetrina_id,),
                )
            files_data = cursor.fetchall()
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
                RETURNING *
            """,
                (file_id, requester_id),
            )
            file_data = cursor.fetchone()
            conn.commit()

            if cursor.rowcount == 0:
                raise NotFoundException("File not found")

            return File.from_dict(file_data)


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
            # First check if the user owns the file
            cursor.execute(
                """
                SELECT 1 FROM owned_files WHERE owner_id = %s AND file_id = %s
                UNION
                SELECT 1 FROM vetrina_subscriptions vs
                JOIN files f ON f.vetrina_id = vs.vetrina_id
                WHERE vs.subscriber_id = %s AND f.file_id = %s
                """,
                (user_id, file_id, user_id, file_id),
            )

            if not cursor.fetchone():
                raise ForbiddenError("You do not have access to this file")

            cursor.execute(
                "SELECT * FROM files WHERE file_id = %s",
                (file_id,),
            )
            file_data = cursor.fetchone()
            file = File.from_dict(file_data)
            file.owned = True
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


def remove_owned_file(user_id: int, file_id: int) -> None:
    """
    Remove a file from the owned files of a user.
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM owned_files WHERE owner_id = %s AND file_id = %s", (user_id, file_id))
            conn.commit()


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
                    UNION
                    SELECT 1 FROM vetrina_subscriptions vs
                    JOIN files f ON f.vetrina_id = vs.vetrina_id
                    WHERE vs.subscriber_id = %s AND f.file_id = %s
                    """,
                    (user_id, file_id, user_id, file_id),
                )

                if cursor.fetchone():
                    raise AlreadyOwnedError("You already own this file")

                cursor.execute(
                    "SELECT * FROM files WHERE file_id = %s",
                    (file_id,),
                )
                file_data = cursor.fetchone()

                if not file_data:
                    raise NotFoundException("File not found")

                file = File.from_dict(file_data)

                cursor.execute(
                    "INSERT INTO transactions (user_id, amount) VALUES (%s, %s) RETURNING *",
                    (user_id, file.price),
                )
                transaction_data = cursor.fetchone()
                transaction = Transaction.from_dict(transaction_data)

                cursor.execute(
                    "INSERT INTO owned_files (owner_id, file_id, transaction_id) VALUES (%s, %s, %s)", (user_id, file_id, transaction.transaction_id)
                )
                cursor.execute("UPDATE files SET download_count = download_count + 1 WHERE file_id = %s", (file_id,))

            return transaction, file


def buy_subscription_transaction(user_id: int, vetrina_id: int, price: int) -> Tuple[Transaction, VetrinaSubscription]:
    """
    Create a new transaction for purchasing a subscription to a vetrina.
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            with conn.transaction():
                # Check if the user is already subscribed to this vetrina
                cursor.execute(
                    "SELECT 1 FROM vetrina_subscriptions WHERE subscriber_id = %s AND vetrina_id = %s",
                    (user_id, vetrina_id),
                )
                if cursor.fetchone():
                    raise AlreadyOwnedError("You are already subscribed to this vetrina")

                cursor.execute(
                    "INSERT INTO transactions (user_id, amount) VALUES (%s, %s) RETURNING *",
                    (user_id, price),
                )
                transaction_data = cursor.fetchone()
                transaction = Transaction.from_dict(transaction_data)

                cursor.execute(
                    "INSERT INTO vetrina_subscriptions (subscriber_id, vetrina_id, transaction_id, price) VALUES (%s, %s, %s, %s)",
                    (user_id, vetrina_id, transaction.transaction_id, price),
                )

                # Fetch the complete subscription data with all required fields for VetrinaSubscription.from_dict
                cursor.execute(
                    """
                    SELECT *
                    FROM vetrina_subscriptions vs
                    JOIN vetrina v ON vs.vetrina_id = v.vetrina_id
                    JOIN users u ON v.author_id = u.user_id
                    JOIN course_instances ci ON v.course_instance_id = ci.instance_id
                    WHERE vs.subscriber_id = %s AND vs.vetrina_id = %s
                    """,
                    (user_id, vetrina_id),
                )
                subscription_data = cursor.fetchone()
                subscription = VetrinaSubscription.from_dict(subscription_data)
                return transaction, subscription


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


def get_vetrine_with_owned_files(user_id: int) -> List[Vetrina]:
    """
    Get all vetrine where the user has ownership access.
    A vetrina is included if the user either has a subscription to it or owns at least one file in it.

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
                    EXISTS(SELECT 1 FROM vetrina_subscriptions WHERE vetrina_id = v.vetrina_id AND subscriber_id = %s) OR
                    EXISTS(SELECT 1 FROM owned_files of JOIN files f ON of.file_id = f.file_id WHERE f.vetrina_id = v.vetrina_id AND of.owner_id = %s)
                )
                ORDER BY v.vetrina_id
                """,
                (user_id, user_id, user_id),
            )
            results = cursor.fetchall()

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
            return [Vetrina.from_dict(row) for row in results]
