#!/usr/bin/env python3
"""
Sample data script for marketplace backend.
This script populates the database with sample vetrine, users, courses, and files for testing.
"""

import database
import hashlib
import uuid
from datetime import datetime

def create_sample_users():
    """Create sample users"""
    users = [
        ("mario_rossi", "mario@example.com", "password123", "Mario", "Rossi"),
        ("anna_bianchi", "anna@example.com", "password123", "Anna", "Bianchi"),
        ("luca_verdi", "luca@example.com", "password123", "Luca", "Verdi"),
        ("sara_neri", "sara@example.com", "password123", "Sara", "Neri"),
        ("paolo_ferrari", "paolo@example.com", "password123", "Paolo", "Ferrari"),
    ]
    
    created_users = []
    for username, email, password, name, surname in users:
        try:
            user = database.create_user(username, email, password, name, surname)
            created_users.append(user)
            print(f"Created user: {username}")
        except Exception as e:
            print(f"User {username} might already exist: {e}")
            # Try to get existing user
            try:
                user = database.verify_user(email, password)
                created_users.append(user)
                print(f"Using existing user: {username}")
            except:
                print(f"Could not create or find user: {username}")
    
    return created_users

def create_sample_courses():
    """Create sample course instances"""
    # Note: This assumes you have some course data in your CSV or database
    # We'll try to get existing courses or create basic ones
    with database.connect() as conn:
        with conn.cursor() as cursor:
            # Check if we have any courses
            cursor.execute("SELECT COUNT(*) FROM course_instances")
            count = cursor.fetchone()['count']
            
            if count == 0:
                # Create some basic sample courses
                sample_courses = [
                    ("CS101", "Computer Science", "Introduction to Programming", 1, 2024, "EN", "Fall", "A", ["Prof. Smith"]),
                    ("MATH201", "Mathematics", "Linear Algebra", 2, 2024, "EN", "Spring", "B", ["Prof. Johnson"]),
                    ("PHYS101", "Physics", "General Physics I", 1, 2023, "IT", "Fall", "A", ["Prof. Brown"]),
                    ("ENG102", "Engineering", "Engineering Mathematics", 2, 2024, "EN", "Fall", "C", ["Prof. Davis"]),
                    ("IT301", "Computer Science", "Database Systems", 3, 2024, "IT", "Spring", "A", ["Prof. Wilson"]),
                ]
                
                for course_code, faculty, course_name, year, date_year, language, semester, canale, professors in sample_courses:
                    cursor.execute(
                        """INSERT INTO course_instances 
                           (course_code, faculty_name, course_name, course_year, date_year, language, course_semester, canale, professors) 
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) 
                           ON CONFLICT DO NOTHING""",
                        (course_code, faculty, course_name, year, date_year, language, semester, canale, professors)
                    )
                conn.commit()
                print("Created sample courses")
            
            # Get all available courses
            cursor.execute("SELECT * FROM course_instances LIMIT 10")
            courses = cursor.fetchall()
            return courses

def create_sample_vetrine(users, courses):
    """Create sample vetrine"""
    if not users or not courses:
        print("No users or courses available to create vetrine")
        return []
    
    sample_vetrine_data = [
        ("Programming Fundamentals Notes", "Complete notes covering variables, loops, and functions. Perfect for beginners!", 0),
        ("Advanced Math Solutions", "Step-by-step solutions to complex linear algebra problems with detailed explanations.", 1),
        ("Physics Lab Reports", "Professional lab reports with data analysis and theoretical background.", 2),
        ("Engineering Project Templates", "Ready-to-use templates for engineering calculations and project documentation.", 3),
        ("Database Design Guide", "Comprehensive guide to database normalization, ER diagrams, and SQL optimization.", 4),
        ("Python Programming Examples", "Real-world Python examples including web scraping, data analysis, and automation.", 0),
        ("Calculus Study Materials", "Visual explanations of derivatives, integrals, and their applications.", 1),
        ("Circuit Analysis Worksheets", "Practice problems for DC and AC circuit analysis with solutions.", 2),
        ("Software Architecture Patterns", "Common design patterns explained with code examples and use cases.", 4),
        ("Statistics and Probability", "Comprehensive coverage of statistical methods and probability distributions.", 1),
    ]
    
    created_vetrine = []
    for i, (name, description, course_idx) in enumerate(sample_vetrine_data):
        if course_idx < len(courses):
            try:
                user = users[i % len(users)]
                course = courses[course_idx]
                
                vetrina = database.create_vetrina(
                    user_id=user.user_id,
                    course_instance_id=course['instance_id'],
                    name=name,
                    description=description
                )
                created_vetrine.append(vetrina)
                print(f"Created vetrina: {name}")
            except Exception as e:
                print(f"Error creating vetrina {name}: {e}")
    
    return created_vetrine

def create_sample_files(vetrine, users):
    """Create sample files for vetrine"""
    if not vetrine:
        print("No vetrine available to add files")
        return
    
    sample_files = [
        ("lecture_notes_chapter1.pdf", "pdf", "appunti"),
        ("homework_solutions.pdf", "pdf", "esercizi"),
        ("course_slides.pdf", "pdf", "dispense"),
        ("practice_exam.pdf", "pdf", "esercizi"),
        ("lab_manual.docx", "docx", "dispense"),
        ("project_template.xlsx", "xlsx", "dispense"),
        ("study_guide.txt", "txt", "appunti"),
        ("formula_sheet.pdf", "pdf", "dispense"),
        ("quiz_answers.pdf", "pdf", "esercizi"),
        ("reading_list.txt", "txt", "appunti"),
    ]
    
    for i, vetrina_obj in enumerate(vetrine[:5]):  # Add files to first 5 vetrine
        try:
            # Find the author of this vetrina
            author_id = vetrina_obj.author.user_id
            
            # Add 2-3 files per vetrina
            for j in range(2 + (i % 2)):  # 2 or 3 files per vetrina
                file_idx = (i * 3 + j) % len(sample_files)
                filename, extension, tag = sample_files[file_idx]
                
                # Create a unique filename
                unique_filename = f"{uuid.uuid4()}-{author_id}-{filename}"
                
                # Generate a fake hash
                fake_content = f"Sample content for {filename} in vetrina {vetrina_obj.name}"
                file_hash = hashlib.sha256(fake_content.encode()).hexdigest()
                
                file_obj = database.add_file_to_vetrina(
                    requester_id=author_id,
                    vetrina_id=vetrina_obj.vetrina_id,
                    file_name=unique_filename,
                    sha256=file_hash,
                    extension=extension,
                    price=0,  # Free files for testing
                    size=len(fake_content),
                    tag=tag
                )
                print(f"Added file {filename} to vetrina {vetrina_obj.name}")
                
        except Exception as e:
            print(f"Error adding files to vetrina {vetrina_obj.name}: {e}")

def main():
    """Main function to populate sample data"""
    print("🚀 Creating sample data for marketplace backend...")
    
    try:
        # Create sample users
        print("\n📝 Creating sample users...")
        users = create_sample_users()
        
        # Create sample courses
        print("\n📚 Creating sample courses...")
        courses = create_sample_courses()
        
        # Create sample vetrine
        print("\n🛍️ Creating sample vetrine...")
        vetrine = create_sample_vetrine(users, courses)
        
        # Create sample files
        print("\n📄 Creating sample files...")
        create_sample_files(vetrine, users)
        
        print(f"\n✅ Sample data creation completed!")
        print(f"Created {len(users)} users, {len(courses)} courses, {len(vetrine)} vetrine")
        
        # Show some search examples
        print("\n🔍 You can now test search with queries like:")
        print("- ?text=programming")
        print("- ?text=math&language=EN") 
        print("- ?course_year=1")
        print("- ?date_year=2024")
        print("- ?tag=appunti")
        print("- ?extension=pdf")
        print("- ?faculty=Computer Science")
        
    except Exception as e:
        print(f"❌ Error creating sample data: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 