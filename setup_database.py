from database import create_tables, fill_courses
import logging

logging.basicConfig(level=logging.DEBUG)

create_tables(debug=True)
fill_courses(debug=True)
