import os
from opensearchpy import OpenSearch
import base64
import dotenv

dotenv.load_dotenv()

host = os.getenv("OPENSEARCH_HOST")
port = os.getenv("OPENSEARCH_PORT")
auth = (os.getenv("OPENSEARCH_USER"), os.getenv("OPENSEARCH_PASSWORD"))  # For testing only. Don't store credentials in code.

client = OpenSearch(hosts=[{"host": host, "port": port}], http_auth=auth, use_ssl=True, verify_certs=False, ssl_show_warn=False)

info = client.info()
print(f"Welcome to {info['version']['distribution']} {info['version']['number']}!")

index_name = "test-index"
index_body = {"settings": {"index": {"number_of_shards": 4}}}

if not client.indices.exists(index=index_name):
    response = client.indices.create(index=index_name, body=index_body)
    print(response)
else:
    print(f"Index {index_name} already exists")

# Create the attachment pipeline
pipeline_body = {"description": "Extract PDF attachment information", "processors": [{"attachment": {"field": "data", "target_field": "attachment"}}]}

client.ingest.put_pipeline(id="pdf-attachment", body=pipeline_body)


def index_pdf_with_attachment(client, pdf_path, index_name, doc_id):
    # Read and encode PDF file
    with open(pdf_path, "rb") as pdf_file:
        pdf_data = pdf_file.read()
        encoded_pdf = base64.b64encode(pdf_data).decode("utf-8")

    # Create document with base64 data
    document = {"filename": pdf_path, "data": encoded_pdf}

    # Index with attachment pipeline
    response = client.index(index=index_name, id=doc_id, body=document, pipeline="pdf-attachment", refresh=True)

    return response


# Usage
response = index_pdf_with_attachment(client, "test.pdf", "pdf-documents", "doc1")


print(response)
