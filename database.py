import psycopg
import os
from dotenv import load_dotenv
import logging

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


if __name__ == "__main__":
    create_tables()
