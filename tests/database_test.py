import unittest
import os
import sys
from datetime import datetime
import random
import string

# Add the parent directory to the path so we can import the modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common import User, Vetrina, CourseInstance, VetrinaSubscription
import database
from db_errors import UnauthorizedError, NotFoundException

def random_string(length=10):
    """Generate a random string of fixed length"""
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

class TestDatabase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create tables and load initial data
        database.create_tables()
        
        # Create test users that will be used across tests
        cls.test_username1 = f"testuser_{random_string()}"
        cls.test_email1 = f"{cls.test_username1}@example.com"
        cls.test_password1 = "password123"
        cls.test_name1 = f"Test {random_string()}"
        cls.test_surname1 = f"User {random_string()}"
        cls.test_username2 = f"testuser_{random_string()}"
        cls.test_email2 = f"{cls.test_username2}@example.com"
        cls.test_password2 = "password456"
        cls.test_name2 = f"Test {random_string()}"
        cls.test_surname2 = f"User {random_string()}"
        
        cls.test_user1 = database.create_user(cls.test_username1, cls.test_email1, cls.test_password1, cls.test_name1, cls.test_surname1)
        cls.test_user2 = database.create_user(cls.test_username2, cls.test_email2, cls.test_password2, cls.test_name2, cls.test_surname2)
        
        # Create a test course instance for the vetrina
        with database.connect() as conn:
            with conn.cursor() as cursor:
                # Insert course instance
                test_course_code = f"TST{random_string(3)}"
                cursor.execute(
                    """
                    INSERT INTO course_instances 
                    (course_code, faculty_name, course_year, date_year, course_semester, canale, professors, language, course_name)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (test_course_code, "Test Faculty", 1, 2023, "1", "A", ["Test Professor"], "EN", "Test Course")
                )
                cls.test_course_instance_id = cursor.fetchone()[0]
                conn.commit()
        
        # Create a test vetrina
        cls.test_vetrina = database.create_vetrina(
            cls.test_user1.id, 
            cls.test_course_instance_id, 
            f"Test Vetrina {random_string()}", 
            f"Test Description {random_string()}"
        )

    def test_create_tables(self):
        # Just verify that tables exist by querying them
        with database.connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
                tables = cursor.fetchall()
                table_names = [table[0] for table in tables]
                
                # Check for essential tables
                self.assertIn('users', table_names)
                self.assertIn('vetrina', table_names)
                self.assertIn('courses', table_names)
                self.assertIn('course_instances', table_names)

    def test_create_and_verify_user(self):
        # Create a new user
        username = f"testuser_{random_string()}"
        email = f"{username}@example.com"
        password = "testpassword"
        name = f"Test {random_string()}"
        surname = f"User {random_string()}"
        user = database.create_user(username, email, password, name, surname)
        
        # Verify the user was created correctly
        self.assertIsInstance(user, User)
        self.assertEqual(user.username, username)
        self.assertEqual(user.email, email)
        
        # Verify the user can log in
        verified_user = database.verify_user(email, password)
        self.assertEqual(verified_user.id, user.id)
        self.assertEqual(verified_user.username, username)
        
        # Verify wrong password fails
        with self.assertRaises(UnauthorizedError):
            database.verify_user(email, "wrongpassword")

    def test_update_username(self):
        # Create a new user
        username = f"testuser_{random_string()}"
        email = f"{username}@example.com"
        password = "testpassword"
        name = f"Test {random_string()}"
        surname = f"User {random_string()}"
        user = database.create_user(username, email, password, name, surname)
        
        # Update username
        new_username = f"updated_{username}"
        updated_user = database.update_username(user.id, new_username)
        
        # Verify the update
        self.assertEqual(updated_user.username, new_username)
        
        # Verify by fetching the user again
        fetched_user = database.get_user_by_id(user.id)
        self.assertEqual(fetched_user.username, new_username)

    def test_update_email(self):
        # Create a new user
        username = f"testuser_{random_string()}"
        email = f"{username}@example.com"
        password = "testpassword"
        name = f"Test {random_string()}"
        surname = f"User {random_string()}"
        user = database.create_user(username, email, password, name, surname)
        
        # Update email
        new_email = f"updated_{email}"
        updated_user = database.update_email(user.id, new_email)
        
        # Verify the update
        self.assertEqual(updated_user.email, new_email)
        
        # Verify by fetching the user again
        fetched_user = database.get_user_by_id(user.id)
        self.assertEqual(fetched_user.email, new_email)

    def test_get_user_by_id(self):
        # Use the test user created in setUpClass
        user = database.get_user_by_id(self.test_user1.id)
        
        # Verify the user data
        self.assertEqual(user.id, self.test_user1.id)
        self.assertEqual(user.username, self.test_user1.username)
        self.assertEqual(user.email, self.test_user1.email)

    def test_follow_management(self):
        # Add follow relationship
        database.add_follow(self.test_user1.id, self.test_user2.id)
        
        # Get followed users
        followed_users = database.get_followed_users(self.test_user1.id)
        
        # Verify the follow relationship
        self.assertEqual(len(followed_users), 1)
        self.assertEqual(followed_users[0].id, self.test_user2.id)
        
        # Remove follow relationship
        database.remove_follow(self.test_user1.id, self.test_user2.id)
        
        # Verify the follow was removed
        followed_users = database.get_followed_users(self.test_user1.id)
        self.assertEqual(len(followed_users), 0)

    def test_block_management(self):
        # Block a user
        database.block_user(self.test_user1.id, self.test_user2.id)
        
        # Get blocked users
        blocked_users = database.get_blocked_users(self.test_user1.id)
        
        # Verify the block relationship
        self.assertEqual(len(blocked_users), 1)
        self.assertEqual(blocked_users[0].id, self.test_user2.id)
        
        # Unblock the user
        database.unblock_user(self.test_user1.id, self.test_user2.id)
        
        # Verify the block was removed
        blocked_users = database.get_blocked_users(self.test_user1.id)
        self.assertEqual(len(blocked_users), 0)

    def test_vetrina_subscription(self):
        # Get the test vetrina created in setUpClass
        vetrine = database.get_user_vetrine(self.test_user1.id)
        test_vetrina = vetrine[0]  # Get the first vetrina
        
        # Subscribe to vetrina
        database.subscribe_to_vetrina(self.test_user2.id, test_vetrina.id, 100)
        
        # Get user subscriptions
        subscriptions = database.get_user_subscriptions(self.test_user2.id)
        
        # Verify the subscription
        self.assertEqual(len(subscriptions), 1)
        self.assertEqual(subscriptions[0].vetrina.id, test_vetrina.id)
        self.assertEqual(subscriptions[0].price, 100)
        
        # Get vetrina subscribers
        subscribers = database.get_vetrina_subscribers(test_vetrina.id)
        
        # Verify the subscriber
        self.assertEqual(len(subscribers), 1)
        self.assertEqual(subscribers[0].id, self.test_user2.id)
        
        # Unsubscribe from vetrina
        database.unsubscribe_from_vetrina(self.test_user2.id, test_vetrina.id)
        
        # Verify the subscription was removed
        subscriptions = database.get_user_subscriptions(self.test_user2.id)
        self.assertEqual(len(subscriptions), 0)

    def test_get_vetrina_by_id(self):
        # Get the test vetrina created in setUpClass
        vetrine = database.get_user_vetrine(self.test_user1.id)
        test_vetrina = vetrine[0]  # Get the first vetrina
        
        # Get the test vetrina
        vetrina = database.get_vetrina_by_id(test_vetrina.id)
        
        # Verify the vetrina data
        self.assertEqual(vetrina.id, test_vetrina.id)
        self.assertEqual(vetrina.owner_id, self.test_user1.id)
        
        # Test not found case
        with self.assertRaises(NotFoundException):
            database.get_vetrina_by_id(999999)  # Non-existent ID

    def test_get_user_vetrine(self):
        # Get vetrine for test user 1
        vetrine = database.get_user_vetrine(self.test_user1.id)
        
        # Verify at least one vetrina is returned (the one we created in setUpClass)
        self.assertGreaterEqual(len(vetrine), 1)
        
        # Verify the vetrina belongs to the user
        vetrina_ids = [v.id for v in vetrine]
        self.assertIn(self.test_course_instance_id, vetrina_ids)
        
        # Test not found case
        with self.assertRaises(NotFoundException):
            database.get_user_vetrine(999999)  # Non-existent user ID

    def test_course_management(self):
        # This test depends on data loaded by fill_courses
        # First, let's insert a test course and course instance
        with database.connect() as conn:
            with conn.cursor() as cursor:
                
                # Insert course
                test_course_code = f"TST{random_string(3)}"
                
                # Insert course instance
                cursor.execute(
                    """
                    INSERT INTO course_instances 
                    (course_code, faculty_name, course_year, date_year, course_semester, canale, professors, language, course_name)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (test_course_code, "Test Faculty", 1, 2023, "1", "A", ["Test Professor"], "EN", "Test Course")
                )
                course_instance_id = cursor.fetchone()[0]
                conn.commit()
        
        # Now test getting the course by ID
        course = database.get_course_by_id(course_instance_id)
        
        # Verify the course data
        self.assertEqual(course.instance_id, course_instance_id)
        self.assertEqual(course.course_code, test_course_code)
        self.assertEqual(course.course_name, "Test Course")
        
        # Test not found case
        with self.assertRaises(NotFoundException):
            database.get_course_by_id(999999)  # Non-existent ID

    def test_delete_user(self):
        # Create a user to delete
        username = f"delete_user_{random_string()}"
        email = f"{username}@example.com"
        password = "deletepassword"
        name = f"Delete {random_string()}"
        surname = f"User {random_string()}"
        user = database.create_user(username, email, password, name, surname)
        
        # Delete the user
        database.delete_user(user.id)
        
        # Verify the user no longer exists
        with database.connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM users WHERE id = %s", (user.id,))
                result = cursor.fetchone()
                self.assertIsNone(result)

    @classmethod
    def tearDownClass(cls):
        # Clean up test data
        with database.connect() as conn:
            with conn.cursor() as cursor:
                # Delete test users and their related data
                cursor.execute("DELETE FROM users WHERE id IN (%s, %s)", (cls.test_user1.id, cls.test_user2.id))
                conn.commit()

if __name__ == '__main__':
    unittest.main()
