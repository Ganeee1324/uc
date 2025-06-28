from typing import Any, Dict, List, Tuple
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


def connect(autocommit: bool = False) -> psycopg.Connection:
    return psycopg.connect(f"dbname={DB_NAME} user={DB_USER} password={DB_PASSWORD}", autocommit=autocommit)


def create_tables(debug: bool = False) -> None:
    with open("schema.sql", "r") as f:
        with connect() as conn:
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
            cursor.execute("DELETE FROM vetrina_subscriptions WHERE user_id = %s AND vetrina_id = %s", (user_id, vetrina_id))
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
                SELECT v.id, v.name, v.description, v.course_instance_id, vs.price, vs.created_at, vs.user_id,
                       u.id, u.username, u.name, u.surname, u.email, u.last_login, u.created_at,
                       ci.id, ci.course_code, ci.course_name, ci.faculty_name, ci.course_year, 
                       ci.date_year, ci.language, ci.course_semester, ci.canale, ci.professors
                FROM vetrina_subscriptions vs
                JOIN vetrina v ON vs.vetrina_id = v.id
                JOIN users u ON v.owner_id = u.id
                JOIN course_instances ci ON v.course_instance_id = ci.id
                WHERE vs.user_id = %s
                """,
                (user_id,),
            )
            subscriptions = cursor.fetchall()

            result = []
            for sub in subscriptions:
                owner = User(
                    id=sub[7],
                    username=sub[8],
                    name=sub[9],
                    surname=sub[10],
                    email=sub[11],
                    last_login=sub[12],
                    created_at=sub[13],
                )
                course_instance = CourseInstance(
                    instance_id=sub[14],
                    course_code=sub[15],
                    course_name=sub[16],
                    faculty_name=sub[17],
                    year=sub[18],
                    date_year=sub[19],
                    language=sub[20],
                    course_semester=sub[21],
                    canale=sub[22],
                    professors=sub[23],
                )
                vetrina = Vetrina(
                    id=sub[0],
                    name=sub[1],
                    owner=owner,
                    description=sub[2],
                    course_instance=course_instance,
                )
                subscription = VetrinaSubscription(
                    subscriber_id=sub[6],
                    vetrina=vetrina,
                    price=sub[4],
                    created_at=sub[5],
                )
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
                SELECT u.id, u.username, u.name, u.surname, u.email, u.last_login, u.created_at
                FROM vetrina_subscriptions vs
                JOIN users u ON vs.user_id = u.id
                WHERE vs.vetrina_id = %s
                """,
                (vetrina_id,),
            )
            subscribers = cursor.fetchall()

            return [User(*user_data) for user_data in subscribers]


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
                INSERT INTO users (username, email, password, name, surname)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, username, name, surname, email, last_login, created_at
                """,
                (username, email, password, name, surname),
            )
            user_data = cursor.fetchone()
            conn.commit()

            return User(*user_data)


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
            cursor.execute("SELECT id, username, name, surname, email, password, last_login, created_at FROM users WHERE email = %s", (email,))
            user_data = cursor.fetchone()
            if not user_data or password != user_data[5]:
                raise UnauthorizedError("Invalid email or password")

            return User(
                id=user_data[0],
                username=user_data[1],
                name=user_data[2],
                surname=user_data[3],
                email=user_data[4],
                last_login=user_data[6],
                created_at=user_data[7],
            )


def delete_user(user_id: int) -> None:
    """
    Delete a user account.

    Args:
        user_id: ID of the user to delete
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
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
                "SELECT id, username, name, surname, email, last_login, created_at FROM users WHERE id = %s",
                (user_id,),
            )
            user_data = cursor.fetchone()

            return User(*user_data) if user_data else None


# ---------------------------------------------
# Vetrina management
# ---------------------------------------------


def get_vetrina_by_id(vetrina_id: int) -> Vetrina:
    """
    Get a vetrina by its ID.

    Args:
        vetrina_id: The ID of the vetrina to retrieve

    Returns:
        Vetrina: The vetrina object if found

    Raises:
        NotFoundException: If the vetrina is not found
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT v.id, v.name, v.description, v.course_instance_id,
                       u.id, u.username, u.name, u.surname, u.email, u.last_login, u.created_at,
                       ci.id, ci.course_code, ci.course_name, ci.faculty_name, ci.course_year, 
                       ci.date_year, ci.language, ci.course_semester, ci.canale, ci.professors
                FROM vetrina v
                JOIN users u ON v.owner_id = u.id
                JOIN course_instances ci ON v.course_instance_id = ci.id
                WHERE v.id = %s
                """,
                (vetrina_id,),
            )
            vetrina_data = cursor.fetchone()

            if not vetrina_data:
                raise NotFoundException("Vetrina not found")

            owner = User(
                id=vetrina_data[4],
                username=vetrina_data[5],
                name=vetrina_data[6],
                surname=vetrina_data[7],
                email=vetrina_data[8],
                last_login=vetrina_data[9],
                created_at=vetrina_data[10],
            )

            course_instance = CourseInstance(
                instance_id=vetrina_data[11],
                course_code=vetrina_data[12],
                course_name=vetrina_data[13],
                faculty_name=vetrina_data[14],
                year=vetrina_data[15],
                date_year=vetrina_data[16],
                language=vetrina_data[17],
                course_semester=vetrina_data[18],
                canale=vetrina_data[19],
                professors=vetrina_data[20],
            )

            return Vetrina(
                id=vetrina_data[0],
                name=vetrina_data[1],
                owner=owner,
                description=vetrina_data[2],
                course_instance=course_instance,
            )


def search_vetrine(params: Dict[str, Any]) -> List[Vetrina]:
    """
    Search for vetrine based on provided parameters.

    Args:
        params: Dictionary containing search parameters (name, course_code, course_name, faculty)

    Returns:
        List[Vetrina]: List of Vetrina objects matching the search criteria
    """
    query_parts = []
    query_params = []

    base_query = """
        SELECT v.id, v.name, v.description, v.course_instance_id,
               u.id, u.username, u.name, u.surname, u.email, u.last_login, u.created_at,
               ci.id, ci.course_code, ci.course_name, ci.faculty_name, ci.course_year, 
               ci.date_year, ci.language, ci.course_semester, ci.canale, ci.professors
        FROM vetrina v
        JOIN course_instances ci ON v.course_instance_id = ci.id
        JOIN users u ON v.owner_id = u.id
        WHERE 1=1
    """

    # Add filters based on provided parameters
    if "name" in params and params["name"]:
        query_parts.append("AND v.name ILIKE %s")
        query_params.append(f"%{params['name']}%")

    if "course_code" in params and params["course_code"]:
        query_parts.append("AND ci.course_code ILIKE %s")
        query_params.append(f"%{params['course_code']}%")

    if "course_name" in params and params["course_name"]:
        query_parts.append("AND ci.course_name ILIKE %s")
        query_params.append(f"%{params['course_name']}%")

    if "faculty" in params and params["faculty"]:
        query_parts.append("AND ci.faculty_name ILIKE %s")
        query_params.append(f"%{params['faculty']}%")

    # If no search parameters provided, return all vetrine (with a reasonable limit)
    final_query = base_query + " ".join(query_parts) + " LIMIT 100"

    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(final_query, tuple(query_params))
            vetrine_data = cursor.fetchall()

            result = []
            for data in vetrine_data:
                owner = User(
                    id=data[4],
                    username=data[5],
                    name=data[6],
                    surname=data[7],
                    email=data[8],
                    last_login=data[9],
                    created_at=data[10],
                )
                course_instance = CourseInstance(
                    instance_id=data[11],
                    course_code=data[12],
                    course_name=data[13],
                    faculty_name=data[14],
                    year=data[15],
                    date_year=data[16],
                    language=data[17],
                    course_semester=data[18],
                    canale=data[19],
                    professors=data[20],
                )
                vetrina = Vetrina(
                    id=data[0],
                    name=data[1],
                    owner=owner,
                    description=data[2],
                    course_instance=course_instance,
                )
                result.append(vetrina)
            return result


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
                INSERT INTO vetrina (owner_id, course_instance_id, name, description) 
                VALUES (%s, %s, %s, %s) 
                RETURNING id, name, description, course_instance_id
                """,
                (user_id, course_instance_id, name, description),
            )
            vetrina_data = cursor.fetchone()
            
            # Get the user data for the owner
            cursor.execute(
                "SELECT id, username, name, surname, email, last_login, created_at FROM users WHERE id = %s",
                (user_id,),
            )
            user_data = cursor.fetchone()
            owner = User(*user_data)
            
            # Get the course instance data
            cursor.execute(
                "SELECT id, course_code, course_name, faculty_name, course_year, date_year, language, course_semester, canale, professors FROM course_instances WHERE id = %s",
                (course_instance_id,),
            )
            course_data = cursor.fetchone()
            course_instance = CourseInstance(*course_data)
            
            conn.commit()

            return Vetrina(
                id=vetrina_data[0],
                name=vetrina_data[1],
                owner=owner,
                description=vetrina_data[2],
                course_instance=course_instance,
            )


def delete_vetrina(vetrina_id: int) -> None:
    """
    Delete a vetrina.

    Args:
        vetrina_id: ID of the vetrina to delete
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM vetrina WHERE id = %s", (vetrina_id,))
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
                if course[2] not in faculties:
                    faculties[course[2]] = []
                faculties[course[2]].append((course[0], course[1]))

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
                "SELECT id, course_code, course_name, faculty_name, course_year, date_year, language, course_semester, canale, professors FROM course_instances WHERE id = %s",
                (course_id,),
            )
            course_data = cursor.fetchone()

            if not course_data:
                raise NotFoundException("Course not found")

            return CourseInstance(*course_data)


faculties_courses_cache = None

# ---------------------------------------------
# File management
# ---------------------------------------------


def add_file_to_vetrina(requester_id: int, vetrina_id: int, file_name: str, sha256: str, price: int = 0, size: int = 0) -> File:
    """
    Add a file to a vetrina.

    Args:
        requester_id: ID of the user making the request
        vetrina_id: ID of the vetrina to add the file to
        file_name: Name of the file
        sha256: SHA256 hash of the file
        price: Price of the file
        size: Size of the file in bytes
    Raises:
        NotFoundException: If the vetrina doesn't exist
        ForbiddenError: If the requester is not the owner of the vetrina
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            with conn.transaction():

                # First check if the vetrina exists
                cursor.execute("SELECT owner_id FROM vetrina WHERE id = %s", (vetrina_id,))
                vetrina = cursor.fetchone()

                if not vetrina:
                    raise NotFoundException("Vetrina not found")

                # Then check if the requester is the owner
                if vetrina[0] != requester_id:
                    raise ForbiddenError("Only the owner can add files to this vetrina")

                # If all checks pass, insert the file
                cursor.execute(
                    "INSERT INTO files (vetrina_id, filename, sha256, price, size) VALUES (%s, %s, %s, %s, %s) RETURNING id, filename, created_at, size, vetrina_id, sha256, download_count, fact_mark, fact_mark_updated_at, price",
                    (vetrina_id, file_name, sha256, price, size),
                )
                file_data = cursor.fetchone()

            return File(*file_data)


def get_files_from_vetrina(vetrina_id: int, user_id: int | None = None) -> List[File]:
    """
    Get all files from a vetrina.

    Args:
        vetrina_id: ID of the vetrina whose files to retrieve
        user_id: Optional ID of the user to check file ownership

    Returns:
        List[File]: List of File objects in the vetrina, with ownership information if user_id is provided
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            if user_id is not None:
                # Query that checks if the user owns the file either directly or through subscription
                cursor.execute(
                    """
                    SELECT f.id, f.filename, f.created_at, f.size, f.vetrina_id, f.sha256, 
                           f.download_count, f.fact_mark, f.fact_mark_updated_at, f.price,
                           (EXISTS(SELECT 1 FROM owned_files WHERE file_id = f.id AND owner_id = %s) OR
                            EXISTS(SELECT 1 FROM vetrina_subscriptions WHERE vetrina_id = %s AND user_id = %s)) AS owned
                    FROM files f
                    WHERE f.vetrina_id = %s
                    """,
                    (user_id, vetrina_id, user_id, vetrina_id),
                )
            else:
                cursor.execute(
                    """
                    SELECT id, filename, created_at, size, vetrina_id, sha256, 
                           download_count, fact_mark, fact_mark_updated_at, price
                    FROM files 
                    WHERE vetrina_id = %s
                    """,
                    (vetrina_id,),
                )
            return [File(*data) for data in cursor.fetchall()]


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
                WHERE id = %s 
                AND vetrina_id IN (
                    SELECT v.id 
                    FROM vetrina v 
                    WHERE v.owner_id = %s
                )
                RETURNING id, filename, created_at, size, vetrina_id, sha256, download_count, fact_mark, fact_mark_updated_at, price
            """,
                (file_id, requester_id),
            )
            file_data = cursor.fetchone()
            conn.commit()

            if cursor.rowcount == 0:
                raise NotFoundException("File not found")

            return File(*file_data)


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
                "SELECT id, filename, created_at, size, vetrina_id, sha256, download_count, fact_mark, fact_mark_updated_at, price FROM files WHERE id = %s",
                (file_id,),
            )
            file_data = cursor.fetchone()

            if not file_data:
                raise NotFoundException("File not found")

            return File(*file_data)


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
                WHERE vs.user_id = %s AND f.id = %s
                """,
                (user_id, file_id, user_id, file_id),
            )

            if not cursor.fetchone():
                raise ForbiddenError("You do not have access to this file")

            cursor.execute(
                "SELECT id, filename, created_at, size, vetrina_id, sha256, download_count, fact_mark, fact_mark_updated_at, price FROM files WHERE id = %s",
                (file_id,),
            )
            file_data = cursor.fetchone()
            file = File(*file_data)
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
                    WHERE vs.user_id = %s AND f.id = %s
                    """,
                    (user_id, file_id, user_id, file_id),
                )

                if cursor.fetchone():
                    raise AlreadyOwnedError("You already own this file")

                cursor.execute(
                    "SELECT id, filename, created_at, size, vetrina_id, sha256, download_count, fact_mark, fact_mark_updated_at, price FROM files WHERE id = %s",
                    (file_id,),
                )
                file_data = cursor.fetchone()

                if not file_data:
                    raise NotFoundException("File not found")

                file = File(*file_data)

                cursor.execute(
                    "INSERT INTO transactions (user_id, amount) VALUES (%s, %s) RETURNING id, user_id, amount, created_at", (user_id, file.price)
                )
                transaction_data = cursor.fetchone()
                transaction = Transaction(*transaction_data)

                cursor.execute("INSERT INTO owned_files (owner_id, file_id, transaction_id) VALUES (%s, %s, %s)", (user_id, file_id, transaction.id))
                cursor.execute("UPDATE files SET download_count = download_count + 1 WHERE id = %s", (file_id,))

                conn.commit()

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
                    "SELECT 1 FROM vetrina_subscriptions WHERE user_id = %s AND vetrina_id = %s",
                    (user_id, vetrina_id),
                )
                if cursor.fetchone():
                    raise AlreadyOwnedError("You are already subscribed to this vetrina")
                
                cursor.execute(
                    """
                    SELECT v.id, v.name, v.description, v.course_instance_id,
                           u.id, u.username, u.name, u.surname, u.email, u.last_login, u.created_at,
                           ci.id, ci.course_code, ci.course_name, ci.faculty_name, ci.course_year, 
                           ci.date_year, ci.language, ci.course_semester, ci.canale, ci.professors
                    FROM vetrina v
                    JOIN users u ON v.owner_id = u.id
                    JOIN course_instances ci ON v.course_instance_id = ci.id
                    WHERE v.id = %s
                    """,
                    (vetrina_id,),
                )
                vetrina_data = cursor.fetchone()

                if not vetrina_data:
                    raise NotFoundException("Vetrina not found")

                owner = User(
                    id=vetrina_data[4],
                    username=vetrina_data[5],
                    name=vetrina_data[6],
                    surname=vetrina_data[7],
                    email=vetrina_data[8],
                    last_login=vetrina_data[9],
                    created_at=vetrina_data[10],
                )

                course_instance = CourseInstance(
                    instance_id=vetrina_data[11],
                    course_code=vetrina_data[12],
                    course_name=vetrina_data[13],
                    faculty_name=vetrina_data[14],
                    year=vetrina_data[15],
                    date_year=vetrina_data[16],
                    language=vetrina_data[17],
                    course_semester=vetrina_data[18],
                    canale=vetrina_data[19],
                    professors=vetrina_data[20],
                )

                cursor.execute(
                    "INSERT INTO transactions (user_id, amount) VALUES (%s, %s) RETURNING id, user_id, amount, created_at", (user_id, price)
                )
                transaction_data = cursor.fetchone()
                transaction = Transaction(*transaction_data)

                cursor.execute(
                    "INSERT INTO vetrina_subscriptions (user_id, vetrina_id, transaction_id, price) VALUES (%s, %s, %s, %s) RETURNING user_id, vetrina_id, price, created_at",
                    (user_id, vetrina_id, transaction.id, price),
                )
                subscription_data = cursor.fetchone()
                subscription = VetrinaSubscription(
                    subscriber_id=user_id,
                    vetrina=Vetrina(
                        id=vetrina_data[0],
                        name=vetrina_data[1],
                        owner=owner,
                        description=vetrina_data[2],
                        course_instance=course_instance,
                    ),
                    price=price,
                    created_at=subscription_data[3],
                )

                conn.commit()

                return transaction, subscription
