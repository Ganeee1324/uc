import psycopg
import os
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


def create_tables() -> None:
    with open("schema.sql", "r") as f:
        with connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute(f.read())
                conn.commit()
                # get all tables
                cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
                tables = cursor.fetchall()
                logging.info(f"Tables created successfully: {tables}")
    logging.info("Tables created successfully")

def fill_courses() -> None:
    df = pd.read_csv("courses.csv", encoding="latin1")
    with connect() as conn:
        with conn.cursor() as cursor:
            for index, row in df.iterrows():
                # canale,date_year,year,language,course_id,course_name,semester,professors
                _, canale, date_year, year, language, course_id, course_name, semester, professors, faculty = row
                # insert faculty if it doesn't exist
                cursor.execute("INSERT INTO faculty (name) VALUES (%s) ON CONFLICT DO NOTHING", (faculty,))
                # insert course
                cursor.execute("INSERT INTO courses (course_code, course_name) VALUES (%s, %s) ON CONFLICT DO NOTHING", 
                              (course_id, course_name))
                # insert course instance
                cursor.execute("INSERT INTO course_instances (course_code, faculty_name, course_year, date_year, course_semester, canale, professors, language) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT DO NOTHING", 
                              (course_id, faculty, year, date_year, semester, canale, professors.split(" / "), language))

                conn.commit()
    with connect() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM faculty")
            faculty = cursor.fetchall()
            logging.info(f"Faculties loaded successfully: {len(faculty)}")
            cursor.execute("SELECT * FROM courses")
            courses = cursor.fetchall()
            logging.info(f"Courses loaded successfully: {len(courses)}")
            cursor.execute("SELECT * FROM course_instances")
            course_instances = cursor.fetchall()
            logging.info(f"Course instances loaded successfully: {len(course_instances)}")



if __name__ == "__main__":
    create_tables()
    fill_courses()
