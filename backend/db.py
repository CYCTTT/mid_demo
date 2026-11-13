from dotenv import load_dotenv
load_dotenv()
import os
import psycopg2

def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database="submission_db",
        user="postgres",
        password=os.getenv("DB_PASSWORD"),
        port="5432"
    )