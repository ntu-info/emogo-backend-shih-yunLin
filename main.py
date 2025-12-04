from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import HTMLResponse, FileResponse, StreamingResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
from datetime import datetime
from dotenv import load_dotenv
import os
import shutil
import zipfile
from io import BytesIO

load_dotenv()
MONGODB_URI = os.getenv("DATABASE_URL")
DB_NAME = "emogo"

app = FastAPI()

# Create uploads directory if it doesn't exist
os.makedirs("uploads", exist_ok=True)

# Mount uploads directory to serve static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    app.mongodb_client = AsyncIOMotorClient(MONGODB_URI)
    app.mongodb = app.mongodb_client[DB_NAME]

@app.on_event("shutdown")
async def shutdown_db_client():
    app.mongodb_client.close()

# ==================== API Endpoints ====================

@app.get("/")
async def root():
    return {"message": "server ok"}

@app.get("/download/{filename}")
async def download_file(filename: str):
    """Force download of video file"""
    file_path = f"uploads/{filename}"
    if os.path.exists(file_path):
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/octet-stream"
        )
    return {"error": "File not found"}

@app.get("/download-all")
async def download_all_videos():
    """Download all videos as a ZIP file"""
    zip_buffer = BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        uploads_dir = "uploads"
        if os.path.exists(uploads_dir):
            for filename in os.listdir(uploads_dir):
                file_path = os.path.join(uploads_dir, filename)
                if os.path.isfile(file_path):
                    zip_file.write(file_path, filename)
    
    zip_buffer.seek(0)
    
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": "attachment; filename=emogo_all_videos.zip"
        }
    )

# -------------------- Data Upload API (Multipart) --------------------

@app.post("/api/moods", status_code=201)
async def create_mood_record(
    request: Request,
    mood_score: int = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    location_accuracy: Optional[float] = Form(None),
    timestamp: Optional[int] = Form(None),
    video: Optional[UploadFile] = File(None)
):
    """Create a new mood record with video file upload"""
    
    # Set timestamp if not provided
    if not timestamp:
        timestamp = int(datetime.now().timestamp())
    
    created_at = datetime.utcnow().isoformat() + "Z"
    
    # Handle Video Upload
    video_url = None
    if video:
        # Generate unique filename
        file_extension = video.filename.split(".")[-1]
        filename = f"vlog_{timestamp}_{mood_score}.{file_extension}"
        file_path = f"uploads/{filename}"
        
        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
        
        # Generate HTTP URL
        base_url = str(request.base_url).rstrip("/")
        video_url = f"{base_url}/uploads/{filename}"
    
    # Prepare data dictionary
    mood_dict = {
        "mood_score": mood_score,
        "video_url": video_url,
        "latitude": latitude,
        "longitude": longitude,
        "location_accuracy": location_accuracy,
        "timestamp": timestamp,
        "created_at": created_at
    }
    
    # Insert into main collection
    result = await app.mongodb["mood_records"].insert_one(mood_dict)
    
    # Insert into vlog collection (if video exists)
    if video_url:
        await app.mongodb["vlog"].insert_one({
            "video_url": video_url,
            "mood_score": mood_score,
            "timestamp": timestamp,
            "created_at": created_at
        })
    
    # Insert into sentiments collection
    await app.mongodb["sentiments"].insert_one({
        "mood_score": mood_score,
        "timestamp": timestamp,
        "created_at": created_at
    })
    
    # Insert into GPS collection (if location exists)
    if latitude and longitude:
        await app.mongodb["gps"].insert_one({
            "latitude": latitude,
            "longitude": longitude,
            "accuracy": location_accuracy,
            "timestamp": timestamp,
            "created_at": created_at
        })
    
    return {
        "success": True,
        "message": "Mood record created successfully",
        "id": str(result.inserted_id),
        "video_url": video_url
    }

# -------------------- Export Endpoints --------------------

@app.get("/export", response_class=HTMLResponse)
async def export_index():
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>EMOGO Export</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            a { display: block; padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            a:hover { background-color: #0056b3; }
        </style>
    </head>
    <body>
        <h1>EMOGO Data Export</h1>
        <p>Click on the links below to export data:</p>
        <ul>
            <li><a href="/export/vlog">Export Vlog</a></li>
            <li><a href="/export/sentiments">Export Sentiments</a></li>
            <li><a href="/export/gps">Export GPS Data</a></li>
        </ul>
    </body>
    </html>
    """
    return html_content

@app.get("/export/vlog", response_class=HTMLResponse)
async def export_vlog():
    vlogs = await app.mongodb["vlog"].find().to_list(None)
    
    # Build HTML content
    video_items = ""
    for vlog in vlogs:
        video_url = vlog.get("video_url", "N/A")
        mood_score = vlog.get("mood_score", "N/A")
        timestamp = vlog.get("timestamp", "N/A")
        created_at = vlog.get("created_at", "N/A")
        
        # Extract filename for download link
        filename = video_url.split("/")[-1] if video_url != "N/A" else ""
        download_url = f"/download/{filename}" if filename else "#"
        
        video_items += f"""
        <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
            <p><strong>Mood Score:</strong> {mood_score}</p>
            <p><strong>Timestamp:</strong> {timestamp}</p>
            <p><strong>Created At:</strong> {created_at}</p>
            <video width="320" height="240" controls>
                <source src="{video_url}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
            <br>
            <a href="{download_url}" style="display: inline-block; margin-top: 10px; padding: 8px 15px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">Download Video</a>
        </div>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Vlog Export</title>
        <style>
            body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }}
            h1 {{ color: #333; }}
            a {{ color: #007bff; }}
            .header-buttons {{ margin: 20px 0; }}
            .header-buttons a {{ margin-right: 10px; }}
        </style>
    </head>
    <body>
        <h1>Vlog Data Export</h1>
        <p>Total Videos: {len(vlogs)}</p>
        <div class="header-buttons">
            <a href="/export" style="display: inline-block; padding: 8px 15px; background-color: #6c757d; color: white; text-decoration: none; border-radius: 5px;">← Back to Export Page</a>
            <a href="/download-all" style="display: inline-block; padding: 8px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">📦 Download All Videos (ZIP)</a>
        </div>
        {video_items if vlogs else "<p>No vlogs available.</p>"}
    </body>
    </html>
    """
    return html_content

@app.get("/export/sentiments", response_class=HTMLResponse)
async def export_sentiments():
    sentiments = await app.mongodb["sentiments"].find().to_list(None)
    
    # Build table rows
    table_rows = ""
    for sentiment in sentiments:
        mood_score = sentiment.get("mood_score", "N/A")
        timestamp = sentiment.get("timestamp", "N/A")
        created_at = sentiment.get("created_at", "N/A")
        
        table_rows += f"""
        <tr>
            <td>{mood_score}</td>
            <td>{timestamp}</td>
            <td>{created_at}</td>
        </tr>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Sentiments Export</title>
        <style>
            body {{ font-family: Arial, sans-serif; max-width: 900px; margin: 50px auto; padding: 20px; }}
            table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            th, td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
            th {{ background-color: #007bff; color: white; }}
            tr:nth-child(even) {{ background-color: #f2f2f2; }}
        </style>
    </head>
    <body>
        <h1>Sentiments Data Export</h1>
        <p>Total Records: {len(sentiments)}</p>
        <a href="/export" style="display: inline-block; padding: 8px 15px; background-color: #6c757d; color: white; text-decoration: none; border-radius: 5px; margin-bottom: 20px;">← Back to Export Page</a>
        <table>
            <thead>
                <tr>
                    <th>Mood Score</th>
                    <th>Timestamp</th>
                    <th>Created At</th>
                </tr>
            </thead>
            <tbody>
                {table_rows if sentiments else "<tr><td colspan='3'>No sentiments data available.</td></tr>"}
            </tbody>
        </table>
    </body>
    </html>
    """
    return html_content

@app.get("/export/gps", response_class=HTMLResponse)
async def export_gps():
    gps_data = await app.mongodb["gps"].find().to_list(None)
    
    # Build table rows
    table_rows = ""
    for gps in gps_data:
        latitude = gps.get("latitude", "N/A")
        longitude = gps.get("longitude", "N/A")
        accuracy = gps.get("accuracy", "N/A")
        timestamp = gps.get("timestamp", "N/A")
        created_at = gps.get("created_at", "N/A")
        
        table_rows += f"""
        <tr>
            <td>{latitude}</td>
            <td>{longitude}</td>
            <td>{accuracy}</td>
            <td>{timestamp}</td>
            <td>{created_at}</td>
        </tr>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>GPS Export</title>
        <style>
            body {{ font-family: Arial, sans-serif; max-width: 1000px; margin: 50px auto; padding: 20px; }}
            table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            th, td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
            th {{ background-color: #28a745; color: white; }}
            tr:nth-child(even) {{ background-color: #f2f2f2; }}
        </style>
    </head>
    <body>
        <h1>GPS Data Export</h1>
        <p>Total Records: {len(gps_data)}</p>
        <a href="/export" style="display: inline-block; padding: 8px 15px; background-color: #6c757d; color: white; text-decoration: none; border-radius: 5px; margin-bottom: 20px;">← Back to Export Page</a>
        <table>
            <thead>
                <tr>
                    <th>Latitude</th>
                    <th>Longitude</th>
                    <th>Accuracy</th>
                    <th>Timestamp</th>
                    <th>Created At</th>
                </tr>
            </thead>
            <tbody>
                {table_rows if gps_data else "<tr><td colspan='5'>No GPS data available.</td></tr>"}
            </tbody>
        </table>
    </body>
    </html>
    """
    return html_content