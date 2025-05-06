import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import os
from tqdm import tqdm  # Import tqdm for progress bar
import pandas as pd


def get_course_data():
    # Set up Chrome options
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Run in headless mode (no browser UI)
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    # Initialize the WebDriver
    driver = webdriver.Chrome(options=chrome_options)
    
    # Set up WebDriverWait with a timeout of 20 seconds
    wait = WebDriverWait(driver, 20)

    # Root URL to prepend to each course link
    root_url = "https://www.luiss.it"

    # Read course links from file
    try:
        df = pd.read_csv("course_links.csv")
        course_links = list(zip(df["link"], df["faculty"]))
    except FileNotFoundError:
        print("Error: course_links.txt file not found.")
        driver.quit()
        return

    # Process each course link with tqdm progress bar
    for link, faculty in tqdm(course_links, desc="Processing courses"):
        full_url = root_url + link if not link.startswith("http") else link
        # print(f"Processing: {full_url}")

        try:
            # Navigate to the URL
            driver.get(full_url)

            # Wait for the table element to be present in the DOM
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "table.table")))

            # Get the page source and parse with BeautifulSoup
            page_source = driver.page_source
            soup = BeautifulSoup(page_source, "html.parser")

            # find h1 class="top-title p-name extra-margin-top"
            course_name = soup.find("h1", class_="top-title p-name extra-margin-top").text.strip()

            # print(course_name)
            date_year = link.split("/")[-1]
            if not (len(date_year) == 4 and date_year.isdigit()):
                raise Exception("Invalid date year")

            # find all tables
            keys = ["Canale", "Anno", "Lingua", "Codice corso", "Semestre", "Professori"]
            values = {key: soup.find("table", class_="table").find("td", string=key).find_next("td").text.strip() for key in keys}

            # print("--------------------------------")

            with open("courses.csv", "a") as file:
                file.write(
                    ",".join(
                        [
                            link,
                            values["Canale"],
                            date_year,
                            values["Anno"],
                            values["Lingua"],
                            values["Codice corso"],
                            '"' + course_name.replace('"', "'") + '"',
                            values["Semestre"],
                            '"' + values["Professori"].replace('"', "'") + '"',
                            '"' + faculty.replace('"', "'") + '"',
                        ]
                    )
                    + "\n"
                )
        except Exception as e:
            print(f"Error processing {full_url}: {str(e)}")

    # Close the browser
    driver.quit()


if __name__ == "__main__":
    with open("courses.csv", "w") as file:
        file.write("course_link,canale,date_year,year,language,course_id,course_name,semester,professors,faculty\n")
    get_course_data()
