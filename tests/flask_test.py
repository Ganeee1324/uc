import unittest
import json
import os
from app import app
from database import create_tables, connect
import psycopg

class FlaskAppTestCase(unittest.TestCase):
    def setUp(self):
        # Configure app for testing
        app.config['TESTING'] = True
        self.client = app.test_client()
        
        # Create test database tables
        try:
            create_tables()
        except Exception as e:
            print(f"Error setting up test database: {e}")
        
        # Clear users table before each test
        with connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM users")
                conn.commit()

    def test_register_success(self):
        """Test successful user registration"""
        response = self.client.post(
            '/register',
            data=json.dumps({
                'username': 'testuser',
                'email': 'test@example.com',
                'password': 'password123'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('access_token', data)
        
        # Verify user was created in database
        with connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM users WHERE email = 'test@example.com'")
                user = cursor.fetchone()
                self.assertIsNotNone(user)
                self.assertEqual(user[1], 'testuser')  # username

    def test_register_duplicate_email(self):
        """Test registration with duplicate email"""
        # First registration
        self.client.post(
            '/register',
            data=json.dumps({
                'username': 'testuser',
                'email': 'test@example.com',
                'password': 'password123'
            }),
            content_type='application/json'
        )
        
        # Second registration with same email
        response = self.client.post(
            '/register',
            data=json.dumps({
                'username': 'testuser2',
                'email': 'test@example.com',
                'password': 'password123'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertEqual(data['error'], 'email_already_exists')

    def test_register_duplicate_username(self):
        """Test registration with duplicate username"""
        # First registration
        self.client.post(
            '/register',
            data=json.dumps({
                'username': 'testuser',
                'email': 'test1@example.com',
                'password': 'password123'
            }),
            content_type='application/json'
        )
        
        # Second registration with same username
        response = self.client.post(
            '/register',
            data=json.dumps({
                'username': 'testuser',
                'email': 'test2@example.com',
                'password': 'password123'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertEqual(data['error'], 'username_already_exists')

    def test_login_success(self):
        """Test successful login"""
        # Register a user first
        self.client.post(
            '/register',
            data=json.dumps({
                'username': 'testuser',
                'email': 'test@example.com',
                'password': 'password123'
            }),
            content_type='application/json'
        )
        
        # Try to login
        response = self.client.post(
            '/login',
            data=json.dumps({
                'email': 'test@example.com',
                'password': 'password123'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('access_token', data)

    def test_login_invalid_email(self):
        """Test login with invalid email"""
        response = self.client.post(
            '/login',
            data=json.dumps({
                'email': 'nonexistent@example.com',
                'password': 'password123'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 401)
        data = json.loads(response.data)
        self.assertEqual(data['error'], 'unauthorized')

    def test_login_invalid_password(self):
        """Test login with invalid password"""
        # Register a user first
        self.client.post(
            '/register',
            data=json.dumps({
                'username': 'testuser',
                'email': 'test@example.com',
                'password': 'password123'
            }),
            content_type='application/json'
        )
        
        # Try to login with wrong password
        response = self.client.post(
            '/login',
            data=json.dumps({
                'email': 'test@example.com',
                'password': 'wrongpassword'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 401)
        data = json.loads(response.data)
        self.assertEqual(data['error'], 'unauthorized')

if __name__ == '__main__':
    unittest.main()
