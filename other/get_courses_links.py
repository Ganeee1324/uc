# Luiss portal scraper
# Get all:
# - Courses
# - Professors
# - Faculties

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time

link = "https://www.luiss.edu/cattedreonline?search=%20a&year=2024"

# Set up Selenium with Chrome in headless mode
chrome_options = Options()
chrome_options.add_argument("--headless")  # Run in background
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")

# Initialize the driver
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

# Load the page
driver.get(link)

# Wait for the page to load completely (adjust time as needed)
time.sleep(5)

# Get the page source after JavaScript has loaded the content
page_source = driver.page_source

# Parse with BeautifulSoup
soup = BeautifulSoup(page_source, "html.parser")

# Find all course links
with open("data/course_links.csv", "w") as f:
    f.write("link,faculty\n")
    for a_tag in soup.find_all("a", href=True):
        if "cattedreonline/corso" in a_tag["href"]:
            faculty = a_tag.find("p", class_="degree").text.strip()
            f.write(a_tag["href"] + ',"' + faculty.replace('"', "'") + '"' + "\n")

driver.quit()
