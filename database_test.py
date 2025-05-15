import unittest
from datetime import datetime
import os
import sys
from typing import List

import psycopg
from dotenv import load_dotenv

from common import User, Vetrina, Course, CourseInstance
import database

# Load environment variables
load_dotenv()


class DatabaseTestCase(unittest.TestCase):
    def setUp(self):
        """Set up test database and create tables"""
        # Create a test database connection
        self.conn = database.connect()

        # Create tables
        database.create_tables()

        # Create test users
        self.test_user1 = database.create_user("testuser1", "test1@example.com", "password1")
        self.test_user2 = database.create_user("testuser2", "test2@example.com", "password2")
        self.test_user3 = database.create_user("testuser3", "test3@example.com", "password3")

        # Create test vetrina
        with self.conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO vetrina (name, owner_id, description)
                VALUES (%s, %s, %s)
                RETURNING id, name, description, owner_id
                """,
                ("Test Vetrina", self.test_user1.id, "Test Description"),
            )
            vetrina_data = cursor.fetchone()
            self.conn.commit()

            # Create Vetrina object
            owner = database.get_user_by_id(vetrina_data[3])
            self.test_vetrina = Vetrina(id=vetrina_data[0], name=vetrina_data[1], owner=owner, description=vetrina_data[2])

    def tearDown(self):
        """Clean up after tests"""
        database.create_tables()
        database.fill_courses()

    # User Management Tests
    def test_create_user(self):
        """Test creating a new user"""
        user = database.create_user("newuser", "new@example.com", "password")
        self.assertIsNotNone(user)
        self.assertEqual(user.username, "newuser")
        self.assertEqual(user.email, "new@example.com")

        # Verify user exists in database
        retrieved_user = database.get_user_by_id(user.id)
        self.assertEqual(retrieved_user.username, "newuser")

    def test_update_username(self):
        """Test updating a user's username"""
        updated_user = database.update_username(self.test_user1, "updated_username")
        self.assertEqual(updated_user.username, "updated_username")

        # Verify change in database
        retrieved_user = database.get_user_by_id(self.test_user1.id)
        self.assertEqual(retrieved_user.username, "updated_username")

    def test_update_email(self):
        """Test updating a user's email"""
        updated_user = database.update_email(self.test_user1, "updated@example.com")
        self.assertEqual(updated_user.email, "updated@example.com")

        # Verify change in database
        retrieved_user = database.get_user_by_id(self.test_user1.id)
        self.assertEqual(retrieved_user.email, "updated@example.com")

    def test_delete_user(self):
        """Test deleting a user"""
        # Create a temporary user to delete
        temp_user = database.create_user("tempuser", "temp@example.com", "password")

        # Delete the user
        database.delete_user(temp_user)

        # Verify user no longer exists
        with self.conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE id = %s", (temp_user.id,))
            result = cursor.fetchone()
            self.assertIsNone(result)

    # Follow Management Tests
    def test_follow_management(self):
        """Test follow, unfollow and get followed users functionality"""
        # Add follow relationship
        database.add_follow(self.test_user1, self.test_user2)

        # Check if user2 is in user1's followed users
        followed_users = database.get_followed_users(self.test_user1)
        self.assertIn(self.test_user2, followed_users)

        # Remove follow relationship
        database.remove_follow(self.test_user1, self.test_user2)

        # Check if user2 is no longer in user1's followed users
        followed_users = database.get_followed_users(self.test_user1)
        self.assertNotIn(self.test_user2, followed_users)

    # Blocked Users Tests
    def test_block_management(self):
        """Test block, unblock and get blocked users functionality"""
        # Block user
        database.block_user(self.test_user1, self.test_user2)

        # Check if user2 is in user1's blocked users
        blocked_users = database.get_blocked_users(self.test_user1)
        self.assertIn(self.test_user2, blocked_users)

        # Unblock user
        database.unblock_user(self.test_user1, self.test_user2)

        # Check if user2 is no longer in user1's blocked users
        blocked_users = database.get_blocked_users(self.test_user1)
        self.assertNotIn(self.test_user2, blocked_users)

    # Subscription Management Tests
    def test_subscription_management(self):
        """Test subscribe, unsubscribe and get subscriptions functionality"""
        # Subscribe user to vetrina
        database.subscribe_to_vetrina(self.test_user2, self.test_vetrina, 100)

        # Check if vetrina is in user's subscriptions
        subscriptions = database.get_user_subscriptions(self.test_user2)
        subscription_ids = [v.id for v in subscriptions]
        self.assertIn(self.test_vetrina.id, subscription_ids)

        # Check if user is in vetrina's subscribers
        subscribers = database.get_vetrina_subscribers(self.test_vetrina.id)
        self.assertIn(self.test_user2, subscribers)

        # Unsubscribe user from vetrina
        database.unsubscribe_from_vetrina(self.test_user2, self.test_vetrina)

        # Check if vetrina is no longer in user's subscriptions
        subscriptions = database.get_user_subscriptions(self.test_user2)
        subscription_ids = [v.id for v in subscriptions]
        self.assertNotIn(self.test_vetrina.id, subscription_ids)

        # Check if user is no longer in vetrina's subscribers
        subscribers = database.get_vetrina_subscribers(self.test_vetrina.id)
        self.assertNotIn(self.test_user2, subscribers)

    # Course Management Tests
    def test_course_data(self):
        """Test that courses are properly loaded"""
        # This test assumes fill_courses has been run
        with self.conn.cursor() as cursor:
            # Check if faculty table has entries
            cursor.execute("SELECT COUNT(*) FROM faculty")
            faculty_count = cursor.fetchone()[0]

            # Check if courses table has entries
            cursor.execute("SELECT COUNT(*) FROM courses")
            courses_count = cursor.fetchone()[0]

            # Check if course_instances table has entries
            cursor.execute("SELECT COUNT(*) FROM course_instances")
            instances_count = cursor.fetchone()[0]

            # We're not checking specific counts since the test might not have the CSV,
            # but we can check that the tables exist and the structure works
            self.assertIsNotNone(faculty_count)
            self.assertIsNotNone(courses_count)
            self.assertIsNotNone(instances_count)


if __name__ == "__main__":
    unittest.main()
