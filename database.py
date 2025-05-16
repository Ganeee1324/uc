from typing import Any, Dict, List, Tuple
import psycopg
import os
from common import CourseInstance, User, Vetrina, VetrinaSubscription
from db_errors import UnauthorizedError, NotFoundException
from dotenv import load_dotenv
import logging
import pandas as pd

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
load_dotenv()

DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")


def connect() -> psycopg.Connection:
    return psycopg.connect(f"dbname={DB_NAME} user={DB_USER} password={DB_PASSWORD}")


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
# Follow management
# ---------------------------------------------


def add_follow(follower_id: int, following_id: int) -> None:
    """
    Add a follow relationship between two users.

    Args:
        follower: The user who is following
        following: The user being followed
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("INSERT INTO follows (follower_id, following_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (follower_id, following_id))
            conn.commit()


def remove_follow(follower_id: int, following_id: int) -> None:
    """
    Remove a follow relationship between two users.

    Args:
        follower: The user who is following
        following: The user being followed
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM follows WHERE follower_id = %s AND following_id = %s", (follower_id, following_id))
            conn.commit()


def get_followed_users(user_id: int) -> List[User]:
    """
    Get all users followed by a specific user.

    Args:
        user: The user whose follows to retrieve

    Returns:
        list: List of User objects containing followed user information.
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT u.id, u.username, u.name, u.surname, u.email, u.last_login, u.created_at
                FROM follows f
                JOIN users u ON f.following_id = u.id
                WHERE f.follower_id = %s
                """,
                (user_id,),
            )
            followed_users = cursor.fetchall()

            return [User(*user_data) for user_data in followed_users]


# ---------------------------------------------
# Blocked users management
# ---------------------------------------------


def block_user(user_id: int, blocked_user_id: int) -> None:
    """
    Block a user.

    Args:
        user: The user who is blocking
        blocked_user: The user being blocked
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("INSERT INTO blocked_users (user_id, blocked_user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (user_id, blocked_user_id))
            conn.commit()


def unblock_user(user_id: int, blocked_user_id: int) -> None:
    """
    Unblock a previously blocked user.

    Args:
        user: The user who is unblocking
        blocked_user: The user being unblocked
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM blocked_users WHERE user_id = %s AND blocked_user_id = %s", (user_id, blocked_user_id))
            conn.commit()


def get_blocked_users(user_id: int) -> List[User]:
    """
    Get all users blocked by a specific user.

    Args:
        user: The user whose blocks to retrieve

    Returns:
        list: List of User objects containing blocked user information.
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT u.id, u.username, u.name, u.surname, u.email, u.last_login, u.created_at
                FROM blocked_users b
                JOIN users u ON b.blocked_user_id = u.id
                WHERE b.user_id = %s
                """,
                (user_id,),
            )
            blocked_users = cursor.fetchall()

            return [User(*user_data) for user_data in blocked_users]


# ---------------------------------------------
# Subscription management
# ---------------------------------------------


def subscribe_to_vetrina(user_id: int, vetrina_id: int, price: int = 0) -> None:
    """
    Subscribe a user to a vetrina.

    Args:
        user: The user subscribing
        vetrina: The vetrina to subscribe to
        price: The subscription price (default: 0)
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO vetrina_subscriptions (user_id, vetrina_id, price) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                (user_id, vetrina_id, price),
            )
            conn.commit()


def unsubscribe_from_vetrina(user_id: int, vetrina_id: int) -> None:
    """
    Unsubscribe a user from a vetrina.

    Args:
        user: The user unsubscribing
        vetrina: The vetrina to unsubscribe from
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM vetrina_subscriptions WHERE user_id = %s AND vetrina_id = %s", (user_id, vetrina_id))
            conn.commit()


def get_user_subscriptions(user_id: int) -> List[VetrinaSubscription]:
    """
    Get all vetrina subscriptions for a specific user.

    Args:
        user: The user whose subscriptions to retrieve

    Returns:
        list: List of Vetrina objects containing subscription information.
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT v.id, v.name, v.owner_id, v.description, v.course_instance_id, vs.price, vs.created_at, vs.user_id
                FROM vetrina_subscriptions vs
                JOIN vetrina v ON vs.vetrina_id = v.id
                WHERE vs.user_id = %s
                """,
                (user_id,),
            )
            subscriptions = cursor.fetchall()

            result = [
                VetrinaSubscription(
                    subscriber_id=sub[7],
                    vetrina=Vetrina(id=sub[0], name=sub[1], owner_id=sub[2], description=sub[3], course_instance_id=sub[4]),
                    price=sub[5],
                    created_at=sub[6],
                )
                for sub in subscriptions
            ]
            return result


def get_vetrina_subscribers(vetrina_id: int) -> List[User]:
    """
    Get all subscribers for a specific vetrina.

    Args:
        vetrina_id: The ID of the vetrina whose subscribers to retrieve

    Returns:
        list: List of User objects containing subscriber information.
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
        User: The user object if the credentials are valid, None otherwise
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
                last_login=user_data[5],
                created_at=user_data[6],
            )


def delete_user(user_id: int) -> None:
    """
    Delete a user account.

    Args:
        user: The user to delete
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
            conn.commit()


def update_username(user_id: int, new_username: str) -> User:
    """
    Update a user's username.

    Args:
        user: The user to update
        new_username: The new username

    Returns:
        User: The updated user object
    """
    # TODO make it atomic
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE users
                SET username = %s
                WHERE id = %s
                RETURNING id, username, name, surname, email, last_login, created_at
                """,
                (new_username, user_id),
            )
            user_data = cursor.fetchone()
            if not user_data:
                raise Exception("User not found")
            conn.commit()

            return User(*user_data)


def update_email(user_id: int, new_email: str) -> User:
    """
    Update a user's email address.

    Args:
        user: The user to update
        new_email: The new email address

    Returns:
        User: The updated user object
    """
    # TODO make it atomic
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE users
                SET email = %s
                WHERE id = %s
                RETURNING id, username, name, surname, email, last_login, created_at
                """,
                (new_email, user_id),
            )
            user_data = cursor.fetchone()
            if not user_data:
                raise Exception("User not found")
            conn.commit()

            return User(*user_data)


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
        Vetrina: The vetrina object if found, None otherwise
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, name, owner_id, description, course_instance_id
                FROM vetrina
                WHERE id = %s
                """,
                (vetrina_id,),
            )
            vetrina_data = cursor.fetchone()

            if not vetrina_data:
                raise NotFoundException("Vetrina not found")

            return Vetrina(
                id=vetrina_data[0],
                name=vetrina_data[1],
                owner_id=vetrina_data[2],
                description=vetrina_data[3],
                course_instance_id=vetrina_data[4],
            )


def search_vetrine(params: Dict[str, Any]) -> List[Vetrina]:
    """
    Search for vetrine based on provided parameters.

    Args:
        params: Dictionary containing search parameters (name, course_code, etc.)

    Returns:
        list: List of Vetrina objects matching the search criteria
    """
    query_parts = []
    query_params = []

    base_query = """
        SELECT v.id, v.name, v.owner_id, v.description, v.course_instance_id
        FROM vetrina v
        JOIN course_instances ci ON v.course_instance_id = ci.id
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

            return [Vetrina(*data) for data in vetrine_data]


def create_vetrina(user_id: int, course_instance_id: int, name: str, description: str) -> Vetrina:
    """
    Create a new vetrina.
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO vetrina (owner_id, course_instance_id, name, description) 
                VALUES (%s, %s, %s, %s) 
                RETURNING id, name, owner_id, description, course_instance_id
                """,
                (user_id, course_instance_id, name, description),
            )
            conn.commit()
            vetrina_data = cursor.fetchone()

            return Vetrina(
                id=vetrina_data[0],
                name=vetrina_data[1],
                owner_id=vetrina_data[2],
                description=vetrina_data[3],
                course_instance_id=vetrina_data[4],
            )


def delete_vetrina(vetrina_id: int) -> None:
    """
    Delete a vetrina.
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM vetrina WHERE id = %s", (vetrina_id,))
            conn.commit()


def vetrina_change_name(vetrina_id: int, new_name: str) -> None:
    """
    Change the name of a vetrina.
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE vetrina SET name = %s WHERE id = %s", (new_name, vetrina_id))
            conn.commit()


def vetrina_change_description(vetrina_id: int, new_description: str) -> None:
    """
    Change the description of a vetrina.
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE vetrina SET description = %s WHERE id = %s", (new_description, vetrina_id))
            conn.commit()


# ---------------------------------------------
# Course management
# ---------------------------------------------


def scrape_faculties_courses() -> Dict[str, List[Tuple[str, str]]]:
    """
    Scrape courses from the database, avoiding duplicates by course_code and faculty_name.
    Returns a dictionary of faculties with their courses.
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


def get_course_by_code(course_code: str, faculty_name: str, canale: str) -> CourseInstance:
    """
    Get a course by its code.
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id, course_code, course_name, faculty_name, course_year, date_year, language, course_semester, canale, professors FROM course_instances WHERE course_code = %s",
                (course_code,),
            )
            course_data = cursor.fetchone()

            if not course_data:
                raise NotFoundException("Course not found")

            return CourseInstance(*course_data)


faculties_courses_cache = None
