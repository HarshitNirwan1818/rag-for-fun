#main file
import os
import shutil
import tempfile
import requests
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Qdrant
from langchain_groq import ChatGroq
from langchain.chains import RetrievalQA
from qdrant_client import QdrantClient

# ------------------------------------------------------------------------------
# Configuration & Environment Setup
# ------------------------------------------------------------------------------
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
QDRANT_HOST = os.getenv("QDRANT_HOST", "qdrant")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", 6333))
COLLECTION_NAME = "org_documents"

if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY is not set in environment variables.")

app = FastAPI(
    title="Organization RAG Backend",
    description="FastAPI service for uploading documents, indexing into Qdrant, and querying via Groq LLM.",
    version="1.0.0"
)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# 1. Dynamic Groq Model Selection (Prevents 404 Model Errors)
# ------------------------------------------------------------------------------
def get_active_groq_model() -> str:
    """Queries Groq API to retrieve active models available on your account key."""
    default_fallback = "llama-3.3-70b-versatile"
    try:
        if not GROQ_API_KEY:
            return default_fallback
            
        headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
        response = requests.get("https://api.groq.com/openai/v1/models", headers=headers, timeout=5)
        
        if response.status_code == 200:
            models_data = response.json().get("data", [])
            active_ids = [m["id"] for m in models_data]
            
            # Prioritized list of active production models
            preferred_models = [
                "llama-3.3-70b-versatile",
                "llama-3.1-8b-instant",
                "openai/gpt-oss-120b",
                "openai/gpt-oss-20b"
            ]
            
            for model in preferred_models:
                if model in active_ids:
                    print(f"[Groq Setup] Selected model: {model}")
                    return model
            
            if active_ids:
                print(f"[Groq Setup] Dynamic fallback model: {active_ids[0]}")
                return active_ids[0]
                
    except Exception as e:
        print(f"[Groq Setup] Could not dynamically fetch models: {e}")
        
    return default_fallback

SELECTED_MODEL = get_active_groq_model()

# ------------------------------------------------------------------------------
# 2. Vector DB & LLM Initialization
# ------------------------------------------------------------------------------
print("[Init] Loading Hugging Face Embeddings...")
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

print(f"[Init] Connecting to Qdrant at {QDRANT_HOST}:{QDRANT_PORT}...")
qdrant_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

# Vector store initialization using correct 'embeddings' parameter
vectorstore = Qdrant(
    client=qdrant_client,
    collection_name=COLLECTION_NAME,
    embeddings=embeddings
)

llm = ChatGroq(
    temperature=0.1,
    model_name=SELECTED_MODEL,
    groq_api_key=GROQ_API_KEY
)

# Retrieval QA Chain Setup
retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=retriever
)

# ------------------------------------------------------------------------------
# 3. Pydantic Models & API Endpoints
# ------------------------------------------------------------------------------
class ChatRequest(BaseModel):
    question: str

@app.get("/")
def read_root():
    return {"status": "Backend is running", "groq_model": SELECTED_MODEL}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Uploads a PDF or TXT document, chunks it, and indexes it into Qdrant."""
    filename = file.filename.lower()
    if not (filename.endswith(".pdf") or filename.endswith(".txt")):
        raise HTTPException(status_code=400, detail="Only .pdf and .txt files are supported.")

    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name

    try:
        # Load document content
        if filename.endswith(".pdf"):
            loader = PyPDFLoader(tmp_path)
        else:
            loader = TextLoader(tmp_path)
        
        docs = loader.load()

        # Split document into chunks
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        chunks = text_splitter.split_documents(docs)

        # Index into Qdrant
        vectorstore.add_documents(chunks)

        return {
            "status": "success",
            "filename": file.filename,
            "chunks_indexed": len(chunks)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")
    
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
            
class QueryRequest(BaseModel):
    query: str

@app.post("/chat")
async def chat_with_docs(request: QueryRequest):
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm, 
        chain_type="stuff", 
        retriever=vectorstore.as_retriever()
    )
    response = qa_chain.invoke(request.query)
    return {"answer": response["result"]}
