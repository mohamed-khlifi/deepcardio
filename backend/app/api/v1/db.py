import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Azure MySQL configuration
DB_USERNAME = "m_khlifi"
DB_PASSWORD = "Tunis%401994"
DB_HOST = "my-server-iset.mysql.database.azure.com"
DB_NAME = "deepcardio"

# Path to DigiCert CA
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # -> app/
SSL_CA_PATH = os.path.join(BASE_DIR, "certs", "DigiCertGlobalRootCA.crt.pem")

DATABASE_URL = (
    f"mysql+pymysql://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"
    f"?ssl_ca={SSL_CA_PATH}&ssl_verify_cert=false"
)

engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()