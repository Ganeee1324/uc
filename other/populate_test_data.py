import sys
import pathlib
import os
import hashlib
import uuid
from datetime import datetime

# Ensure project root is on the path
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1]))

from database import connect, create_vetrina, add_file_to_vetrina

def create_test_file(filename, content):
    """Create a test file with given content"""
    files_dir = "files"
    os.makedirs(files_dir, exist_ok=True)
    
    file_content = content.encode('utf-8')
    file_hash = hashlib.sha256(file_content).hexdigest()
    
    # Create unique filename
    unique_filename = f"{uuid.uuid4()}-1-{filename}"
    file_path = os.path.join(files_dir, unique_filename)
    
    with open(file_path, 'wb') as f:
        f.write(file_content)
    
    return unique_filename, file_hash, len(file_content)

def populate_database():
    """Populate database with test vetrine and files"""
    
    # Get admin user ID (created during setup)
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE username = 'admin'")
            admin_user = cur.fetchone()
            if not admin_user:
                print("No admin user found. Run setup_database.py first.")
                return
            user_id = admin_user['id']
            
            # Get some course instances to use
            cur.execute("SELECT id, course_name, faculty_name FROM course_instances LIMIT 5")
            courses = cur.fetchall()
            if not courses:
                print("No course instances found. Run setup_database.py first.")
                return
    
    print(f"Creating test vetrine and files for user ID: {user_id}")
    
    # Create test vetrine and files
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    vetrine_data = [
        # Single file vetrine
        {
            "name": f"Formulario Chimica Organica ({timestamp})",
            "description": "Formulario essenziale di chimica organica con tutte le reazioni principali e i meccanismi di reazione.",
            "files": [
                ("formulario_chimica.pdf", "# Formulario Chimica Organica\n\nAlcani + Br2 → Bromoalcani\nAlcheni + H2O → Alcoli\n...", 2)
            ]
        },
        {
            "name": f"Riassunto Storia Contemporanea ({timestamp})",
            "description": "Riassunto delle lezioni di Storia Contemporanea, focalizzato sul periodo tra le due guerre mondiali.",
            "files": [
                ("storia_contemporanea.pdf", "# Storia Contemporanea\n\n## Il primo dopoguerra\nLe conseguenze della Grande Guerra...", 0)
            ]
        },
        # Multi-file vetrine (3+ files)
        {
            "name": f"Corso Completo Python Programming ({timestamp})",
            "description": "Corso completo di programmazione Python, dal livello base all'avanzato. Include esercizi, progetti e soluzioni.",
            "files": [
                ("python_basics.pdf", "# Python Basics\n\n## Variables and Types\nPython is a dynamically typed language...", 5),
                ("python_advanced.pdf", "# Advanced Python\n\n## Decorators\nDecorators are a powerful way to modify functions...", 5),
                ("python_exercises.pdf", "# Python Exercises\n\n1. Write a function to calculate Fibonacci numbers...", 3),
                ("python_solutions.pdf", "# Exercise Solutions\n\ndef fibonacci(n):\n    if n <= 1: return n\n    return fibonacci(n-1) + fibonacci(n-2)", 2)
            ]
        },
        {
            "name": f"Bundle Matematica Discreta ({timestamp})",
            "description": "Raccolta completa di materiale per Matematica Discreta: teoria, esercizi, prove d'esame e soluzioni.",
            "files": [
                ("teoria_insiemi.pdf", "# Teoria degli Insiemi\n\n## Operazioni fondamentali\nUnione, intersezione, differenza...", 4),
                ("logica_proposizionale.pdf", "# Logica Proposizionale\n\n## Connettivi logici\nAND, OR, NOT, implicazione...", 3),
                ("grafi_alberi.pdf", "# Grafi e Alberi\n\n## Definizioni base\nUn grafo G è una coppia (V,E)...", 3)
            ]
        }
    ]
    
    created_vetrine = []
    
    for i, vetrina_info in enumerate(vetrine_data):
        # Use different course instances for variety
        course = courses[i % len(courses)]
        
        print(f"\nCreating vetrina: {vetrina_info['name']}")
        print(f"Course: {course['course_name']} - {course['faculty_name']}")
        
        # Create vetrina
        vetrina = create_vetrina(
            user_id=user_id,
            course_instance_id=course['id'],
            name=vetrina_info['name'],
            description=vetrina_info['description']
        )
        
        created_vetrine.append(vetrina)
        print(f"✓ Created vetrina ID: {vetrina.id}")
        
        # Add files to vetrina
        for filename, content, price in vetrina_info['files']:
            print(f"  Adding file: {filename}")
            
            # Create the physical file
            unique_filename, file_hash, file_size = create_test_file(filename, content)
            
            # Add to database
            db_file = add_file_to_vetrina(
                requester_id=user_id,
                vetrina_id=vetrina.id,
                file_name=unique_filename,
                sha256=file_hash,
                price=price,
                size=file_size
            )
            
            print(f"  ✓ Created file ID: {db_file.id} (Price: €{price})")
    
    print(f"\n🎉 Successfully created {len(created_vetrine)} vetrine with files!")
    
    # Print summary
    print("\n📊 Database Summary:")
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as cnt FROM vetrina")
            vetrina_count = cur.fetchone()['cnt']
            cur.execute("SELECT COUNT(*) as cnt FROM files")
            files_count = cur.fetchone()['cnt']
            
            print(f"  Vetrine: {vetrina_count}")
            print(f"  Files: {files_count}")

if __name__ == '__main__':
    populate_database() 