import os
import glob
from opensearchpy import OpenSearch
import base64
import dotenv
from common import SearchResultDocument

dotenv.load_dotenv()

# Initialize OpenSearch client at module level
host = os.getenv("OPENSEARCH_HOST")
port = os.getenv("OPENSEARCH_PORT")
auth = (os.getenv("OPENSEARCH_USER"), os.getenv("OPENSEARCH_PASSWORD"))

client = OpenSearch(
    hosts=[{"host": host, "port": port}], 
    http_auth=auth, 
    use_ssl=True, 
    verify_certs=False, 
    ssl_show_warn=False
)

# Default index name
DEFAULT_INDEX_NAME = "obsidian"

# Initialize the index and pipeline on module import
def _initialize_opensearch():
    """Initialize OpenSearch index and attachment pipeline"""
    try:
        info = client.info()
        print(f"Connected to {info['version']['distribution']} {info['version']['number']}!")
        
        # Create index if it doesn't exist
        index_body = {"settings": {"index": {"number_of_shards": 4}}}
        
        if not client.indices.exists(index=DEFAULT_INDEX_NAME):
            response = client.indices.create(index=DEFAULT_INDEX_NAME, body=index_body)
            print(f"Created index: {DEFAULT_INDEX_NAME}")
        
        # Create the attachment pipeline
        pipeline_body = {
            "description": "Extract document attachment information", 
            "processors": [{"attachment": {"field": "data", "target_field": "attachment"}}]
        }
        
        client.ingest.put_pipeline(id="document-attachment", body=pipeline_body)
        
    except Exception as e:
        print(f"Error initializing OpenSearch: {e}")

def index(file_path, doc_id=None, index_name=DEFAULT_INDEX_NAME):
    """
    Index a single document file
    
    Args:
        file_path (str): Path to the document file
        doc_id (str, optional): Document ID. If None, uses filename
        index_name (str, optional): Index name. Defaults to DEFAULT_INDEX_NAME
        
    Returns:
        dict: OpenSearch response
    """
    try:
        # Generate doc_id if not provided
        if doc_id is None:
            doc_id = os.path.basename(file_path)
        
        # Read and encode document file
        with open(file_path, "rb") as doc_file:
            doc_data = doc_file.read()
            encoded_doc = base64.b64encode(doc_data).decode("utf-8")

        # Create document with base64 data
        document = {
            "filename": os.path.basename(file_path),
            "filepath": file_path,
            "data": encoded_doc
        }

        # Index with attachment pipeline
        response = client.index(
            index=index_name, 
            id=doc_id, 
            body=document, 
            pipeline="document-attachment", 
            refresh=True
        )
        
        print(f"Indexed: {file_path}")
        return response
        
    except Exception as e:
        print(f"Error indexing {file_path}: {e}")
        return None

def search(query, index_name=DEFAULT_INDEX_NAME, size=10):
    """
    Search for documents using a text query
    
    Args:
        query (str): Search query
        index_name (str, optional): Index name. Defaults to DEFAULT_INDEX_NAME
        size (int, optional): Number of results to return. Defaults to 10
        
    Returns:
        dict: OpenSearch response with search results
    """
    try:
        search_body = {
            "size": size,
            "query": {
                "multi_match": {
                    "query": query,
                    "fields": ["attachment.content", "filename", "filepath"]
                }
            },
            "highlight": {
                "fields": {
                    "attachment.content": {}
                }
            }
        }
        
        response = client.search(index=index_name, body=search_body)
        hits = response["hits"]["hits"]
        return [SearchResultDocument(hit["_source"]["filename"], hit["_source"]["filepath"], hit["_score"]) for hit in hits]
        
    except Exception as e:
        print(f"Error searching: {e}")
        return None

def index_folder(root_folder, index_name=DEFAULT_INDEX_NAME, file_extensions=None):
    """
    Recursively index all document files in a folder
    
    Args:
        root_folder (str): Root folder path to search for documents
        index_name (str, optional): Index name. Defaults to DEFAULT_INDEX_NAME
        file_extensions (list, optional): List of file extensions to index. 
                                        Defaults to common document formats
        
    Returns:
        list: List of indexing results
    """
    results = []
    
    # Default supported document extensions
    if file_extensions is None:
        file_extensions = [
            '*.pdf', '*.doc', '*.docx', '*.txt', '*.rtf', '*.odt',
            '*.ppt', '*.pptx', '*.xls', '*.xlsx', '*.csv',
            '*.html', '*.htm', '*.xml', '*.json', '*.md'
        ]
    
    try:
        all_files = []
        
        # Find all document files recursively
        for extension in file_extensions:
            pattern = os.path.join(root_folder, "**", extension)
            files = glob.glob(pattern, recursive=True)
            all_files.extend(files)
        
        print(f"Found {len(all_files)} document files in {root_folder}")
        
        for doc_file in all_files:
            # Generate unique doc_id using relative path
            relative_path = os.path.relpath(doc_file, root_folder)
            doc_id = relative_path.replace(os.sep, "_").replace(" ", "_")
            
            result = index(doc_file, doc_id, index_name)
            results.append({
                "file": doc_file,
                "doc_id": doc_id,
                "result": result
            })
            
        print(f"Indexed {len(results)} document files")
        return results
        
    except Exception as e:
        print(f"Error indexing folder {root_folder}: {e}")
        return []

# Initialize on module import
_initialize_opensearch()

if __name__ == "__main__":
    # index_folder(r"C:\Users\fdimo\Documents\Obsidian Vault\NOTES-MARKDOWN")
    print(search("files that explain image classification"))