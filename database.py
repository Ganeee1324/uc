from typing import Dict, List
import psycopg
import os
from common import User, Vetrina
from db_errors import UnauthorizedError
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
    df = pd.read_csv("courses.csv", encoding="latin1")
    with connect() as conn:
        with conn.cursor() as cursor:
            for _, row in df.iterrows():
                # canale,date_year,year,language,course_id,course_name,semester,professors
                _, canale, date_year, year, language, course_id, course_name, semester, professors, faculty = row
                # insert faculty if it doesn't exist
                cursor.execute("INSERT INTO faculty (name) VALUES (%s) ON CONFLICT DO NOTHING", (faculty,))
                # insert course
                cursor.execute("INSERT INTO courses (course_code, course_name) VALUES (%s, %s) ON CONFLICT DO NOTHING", (course_id, course_name))
                # insert course instance
                cursor.execute(
                    "INSERT INTO course_instances (course_code, faculty_name, course_year, date_year, course_semester, canale, professors, language) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT DO NOTHING",
                    (course_id, faculty, year, date_year, semester, canale, professors.split(" / "), language),
                )

                conn.commit()

            if debug:
                cursor.execute("SELECT * FROM faculty")
                faculty = cursor.fetchall()
                logging.info(f"Faculties loaded successfully: {len(faculty)}")
                cursor.execute("SELECT * FROM courses")
                courses = cursor.fetchall()
                logging.info(f"Courses loaded successfully: {len(courses)}")
                cursor.execute("SELECT * FROM course_instances")
                course_instances = cursor.fetchall()
                logging.info(f"Course instances loaded successfully: {len(course_instances)}")


# ---------------------------------------------
# Follow management
# ---------------------------------------------


def add_follow(follower: User, following: User) -> None:
    """
    Add a follow relationship between two users.

    Args:
        follower: The user who is following
        following: The user being followed
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("INSERT INTO follows (follower_id, following_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (follower.id, following.id))
            conn.commit()


def remove_follow(follower: User, following: User) -> None:
    """
    Remove a follow relationship between two users.

    Args:
        follower: The user who is following
        following: The user being followed
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM follows WHERE follower_id = %s AND following_id = %s", (follower.id, following.id))
            conn.commit()


def get_followed_users(user: User) -> List[User]:
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
                SELECT u.id, u.username, u.email, u.last_login, u.created_at
                FROM follows f
                JOIN users u ON f.following_id = u.id
                WHERE f.follower_id = %s
                """,
                (user.id,),
            )
            followed_users = cursor.fetchall()

            return [User(*user_data) for user_data in followed_users]


# ---------------------------------------------
# Blocked users management
# ---------------------------------------------


def block_user(user: User, blocked_user: User) -> None:
    """
    Block a user.

    Args:
        user: The user who is blocking
        blocked_user: The user being blocked
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("INSERT INTO blocked_users (user_id, blocked_user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (user.id, blocked_user.id))
            conn.commit()


def unblock_user(user: User, blocked_user: User) -> None:
    """
    Unblock a previously blocked user.

    Args:
        user: The user who is unblocking
        blocked_user: The user being unblocked
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM blocked_users WHERE user_id = %s AND blocked_user_id = %s", (user.id, blocked_user.id))
            conn.commit()


def get_blocked_users(user: User) -> List[User]:
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
                SELECT u.id, u.username, u.email, u.last_login, u.created_at
                FROM blocked_users b
                JOIN users u ON b.blocked_user_id = u.id
                WHERE b.user_id = %s
                """,
                (user.id,),
            )
            blocked_users = cursor.fetchall()

            return [User(*user_data) for user_data in blocked_users]


# ---------------------------------------------
# Subscription management
# ---------------------------------------------


def subscribe_to_vetrina(user: User, vetrina: Vetrina, price: int = 0) -> None:
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
                (user.id, vetrina.id, price),
            )
            conn.commit()


def unsubscribe_from_vetrina(user: User, vetrina: Vetrina) -> None:
    """
    Unsubscribe a user from a vetrina.

    Args:
        user: The user unsubscribing
        vetrina: The vetrina to unsubscribe from
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM vetrina_subscriptions WHERE user_id = %s AND vetrina_id = %s", (user.id, vetrina.id))
            conn.commit()


def get_user_subscriptions(user: User) -> List[Vetrina]:
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
                SELECT v.id, v.name, v.description, v.owner_id, u.username, vs.price, vs.created_at, u.email, u.last_login, u.created_at
                FROM vetrina_subscriptions vs
                JOIN vetrina v ON vs.vetrina_id = v.id
                JOIN users u ON v.owner_id = u.id
                WHERE vs.user_id = %s
                """,
                (user.id,),
            )
            subscriptions = cursor.fetchall()

            result = [
                Vetrina(
                    id=sub[0],
                    name=sub[1],
                    owner=User(id=sub[3], username=sub[4], email=sub[6], last_login=sub[7], created_at=sub[8]),
                    description=sub[2],
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
                SELECT u.id, u.username, u.email, u.last_login, u.created_at
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


def create_user(username: str, email: str, password: str) -> User:
    """
    Create a new user.

    Args:
        username: The username for the new user
        email: The email address for the new user
        password: The password for the new user

    Returns:
        User: The newly created user object
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO users (username, email, password)
                VALUES (%s, %s, %s)
                RETURNING id, username, email, last_login, created_at
                """,
                (username, email, password),
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
            cursor.execute("SELECT id, username, email, password, created_at, last_login FROM users WHERE email = %s", (email,))
            user_data = cursor.fetchone()
            if not user_data:
                raise UnauthorizedError("Invalid email or password")

            if password != user_data[3]:
                raise UnauthorizedError("Invalid email or password")

            return User(id=user_data[0], username=user_data[1], email=user_data[2], created_at=user_data[4], last_login=user_data[5])


def delete_user(user: User) -> None:
    """
    Delete a user account.

    Args:
        user: The user to delete
    """
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM users WHERE id = %s", (user.id,))
            conn.commit()


def update_username(user: User, new_username: str) -> User:
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
                RETURNING id, username, email, last_login, created_at
                """,
                (new_username, user.id),
            )
            user_data = cursor.fetchone()
            conn.commit()

            return User(*user_data)


def update_email(user: User, new_email: str) -> User:
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
                RETURNING id, username, email, last_login, created_at
                """,
                (new_email, user.id),
            )
            user_data = cursor.fetchone()
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
                "SELECT id, username, email, last_login, created_at FROM users WHERE id = %s",
                (user_id,),
            )
            user_data = cursor.fetchone()

            return User(*user_data) if user_data else None
