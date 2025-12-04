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

# load_dotenv()
# MONGODB_URI = os.getenv("DATABASE_URL")
MONGODB_URI = "mongodb+srv://shihyun_Lin:s1234567s@myproject.t4bzjvs.mongodb.net/?appName=MyProject"
DB_NAME = "emogo"

SHARED_CSS = """
<style>
    body {
        background-color: #000000;
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        margin: 0;
        padding: 20px;
    }
    h1 {
        color: #00E5FF;
        text-shadow: 0 0 10px rgba(0, 229, 255, 0.3);
        text-align: center;
        margin-bottom: 30px;
        font-weight: 900;
        letter-spacing: 1px;
    }
    a {
        color: #00E5FF;
        text-decoration: none;
        transition: all 0.3s ease;
    }
    a:hover {
        text-shadow: 0 0 8px rgba(0, 229, 255, 0.6);
    }
    .btn {
        display: inline-block;
        padding: 12px 24px;
        background-color: rgba(0, 229, 255, 0.1);
        border: 1px solid #00E5FF;
        color: #00E5FF;
        border-radius: 30px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin: 5px;
        text-align: center;
    }
    .btn:hover {
        background-color: #00E5FF;
        color: #000;
        box-shadow: 0 0 20px rgba(0, 229, 255, 0.4);
    }
    .btn-secondary {
        border-color: #666;
        color: #aaa;
        background-color: rgba(255,255,255,0.05);
    }
    .btn-secondary:hover {
        background-color: #666;
        color: #fff;
        box-shadow: 0 0 15px rgba(255,255,255,0.2);
    }
    .container {
        max-width: 1000px;
        margin: 0 auto;
    }
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        background-color: #111;
        border: 1px solid #333;
        border-radius: 8px;
        overflow: hidden;
    }
    th, td {
        padding: 15px;
        text-align: left;
        border-bottom: 1px solid #333;
    }
    th {
        background-color: rgba(0, 229, 255, 0.1);
        color: #00E5FF;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    tr:hover {
        background-color: rgba(0, 229, 255, 0.05);
    }
    .card {
        background-color: #111;
        border: 1px solid #333;
        border-radius: 15px;
        padding: 25px;
        margin-bottom: 25px;
        transition: all 0.3s ease;
    }
    .card:hover {
        border-color: #00E5FF;
        box-shadow: 0 0 20px rgba(0, 229, 255, 0.15);
        transform: translateY(-2px);
    }
    .header-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 1px solid #333;
    }
    .menu-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-top: 40px;
    }
    .menu-item {
        display: block;
        padding: 40px 20px;
        background-color: #111;
        border: 1px solid #333;
        border-radius: 15px;
        text-align: center;
        font-size: 1.2rem;
        font-weight: bold;
        color: #00E5FF;
        transition: all 0.3s ease;
    }
    .menu-item:hover {
        background-color: rgba(0, 229, 255, 0.1);
        border-color: #00E5FF;
        box-shadow: 0 0 30px rgba(0, 229, 255, 0.2);
        transform: translateY(-5px);
    }
</style>
"""

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

@app.get("/", response_class=HTMLResponse)
async def root():
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>EMOGO Backend</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {
                background-color: #000000;
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                margin: 0;
                height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }
            .container {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
            }
            h1 {
                font-size: 2.5rem;
                font-weight: 900;
                text-align: center;
                margin-bottom: 40px;
                text-shadow: 0 0 10px rgba(0, 229, 255, 0.3);
                letter-spacing: 1px;
                z-index: 10;
            }
            .circle-container {
                position: relative;
                width: 300px;
                height: 300px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 60px;
            }
            .outer-ring {
                position: absolute;
                width: 280px;
                height: 280px;
                border-radius: 50%;
                border: 1px solid rgba(0, 229, 255, 0.2);
                box-shadow: 0 0 20px rgba(0, 229, 255, 0.2);
                animation: pulse 4s infinite ease-in-out;
            }
            .middle-ring {
                position: absolute;
                width: 240px;
                height: 240px;
                border-radius: 50%;
                border: 4px solid rgba(0, 229, 255, 0.5);
                border-top-color: #00E5FF;
                border-right-color: transparent;
                border-bottom-color: rgba(0, 229, 255, 0.5);
                border-left-color: transparent;
                box-shadow: 0 0 20px rgba(0, 229, 255, 0.8);
                animation: spin 10s linear infinite;
            }
            .inner-circle {
                width: 180px;
                height: 180px;
                border-radius: 50%;
                background-color: rgba(0, 20, 30, 0.9);
                border: 4px solid #00E5FF;
                box-shadow: 0 0 30px rgba(0, 229, 255, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 5;
            }
            .logo-text {
                font-size: 28px;
                font-weight: bold;
                color: #00E5FF;
                letter-spacing: 4px;
                text-shadow: 0 0 15px #00E5FF;
            }
            .nav-buttons {
                display: flex;
                gap: 20px;
                z-index: 10;
            }
            .btn {
                padding: 12px 24px;
                background-color: rgba(0, 229, 255, 0.1);
                border: 1px solid #00E5FF;
                color: #00E5FF;
                text-decoration: none;
                border-radius: 30px;
                font-weight: 600;
                letter-spacing: 1px;
                transition: all 0.3s ease;
                text-transform: uppercase;
                font-size: 0.9rem;
            }
            .btn:hover {
                background-color: #00E5FF;
                color: #000;
                box-shadow: 0 0 20px rgba(0, 229, 255, 0.6);
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            @keyframes pulse {
                0% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(1.05); opacity: 1; }
                100% { transform: scale(1); opacity: 0.8; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>How do you feel<br>today?</h1>
            
            <div class="circle-container">
                <div class="outer-ring"></div>
                <div class="middle-ring"></div>
                <div class="inner-circle">
                    <span class="logo-text">EMOGO</span>
                </div>
            </div>

            <div class="nav-buttons">
                <a href="/export" class="btn">View Data Dashboard</a>
            </div>
        </div>
    </body>
    </html>
    """
    return html_content

# CSV Download Endpoints (must be before /download/{filename})
@app.get("/download/sentiments-csv")
async def download_sentiments_csv():
    """Download all sentiments data as CSV"""
    sentiments = await app.mongodb["sentiments"].find().to_list(None)
    
    # Create CSV content
    csv_content = "mood_score,timestamp,created_at\n"
    for sentiment in sentiments:
        mood_score = sentiment.get("mood_score", "")
        timestamp = sentiment.get("timestamp", "")
        created_at = sentiment.get("created_at", "")
        csv_content += f"{mood_score},{timestamp},{created_at}\n"
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=emogo_sentiments.csv"
        }
    )

@app.get("/download/gps-csv")
async def download_gps_csv():
    """Download all GPS data as CSV"""
    gps_records = await app.mongodb["gps"].find().to_list(None)
    
    # Create CSV content
    csv_content = "latitude,longitude,accuracy,timestamp,created_at\n"
    for record in gps_records:
        latitude = record.get("latitude", "")
        longitude = record.get("longitude", "")
        accuracy = record.get("accuracy", "")
        timestamp = record.get("timestamp", "")
        created_at = record.get("created_at", "")
        csv_content += f"{latitude},{longitude},{accuracy},{timestamp},{created_at}\n"
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=emogo_gps.csv"
        }
    )

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
        "video_url": video_url
    }

# -------------------- Export Endpoints --------------------

@app.get("/export", response_class=HTMLResponse)
async def export_index():
    # Fetch counts
    vlog_count = await app.mongodb["vlog"].count_documents({})
    sentiment_count = await app.mongodb["sentiments"].count_documents({})
    gps_count = await app.mongodb["gps"].count_documents({})

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>EMOGO Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        {SHARED_CSS}
        <style>
            .stats-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 25px;
                margin-top: 40px;
            }}
            .stat-card {{
                background-color: #111;
                border: 1px solid #333;
                border-radius: 20px;
                padding: 30px;
                text-align: center;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                min-height: 200px;
                position: relative;
                overflow: hidden;
            }}
            .stat-card::before {{
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: radial-gradient(circle at center, rgba(0, 229, 255, 0.1) 0%, transparent 70%);
                opacity: 0;
                transition: opacity 0.3s ease;
            }}
            .stat-card:hover {{
                transform: translateY(-10px);
                border-color: #00E5FF;
                box-shadow: 0 10px 30px rgba(0, 229, 255, 0.15);
            }}
            .stat-card:hover::before {{
                opacity: 1;
            }}
            .stat-number {{
                font-size: 4rem;
                font-weight: 900;
                color: #fff;
                margin: 10px 0;
                text-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
            }}
            .stat-label {{
                font-size: 1.2rem;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 2px;
                font-weight: 600;
            }}
            .stat-icon {{
                margin-bottom: 15px;
                width: 60px;
                height: 60px;
            }}
            .stat-icon svg {{
                width: 100%;
                height: 100%;
                fill: #ffffff;
                filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.5));
            }}
            .stat-link {{
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>EMOGO Dashboard</h1>
            <p style="text-align: center; color: #666; font-size: 1.1rem;">Real-time Data Overview</p>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <a href="/export/vlog" class="stat-link"></a>
                    <div class="stat-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                        </svg>
                    </div>
                    <div class="stat-number" style="color: #00E5FF; text-shadow: 0 0 20px rgba(0, 229, 255, 0.4);">{vlog_count}</div>
                    <div class="stat-label">Vlog Recordings</div>
                </div>
                
                <div class="stat-card">
                    <a href="/export/sentiments" class="stat-link"></a>
                    <div class="stat-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                        </svg>
                    </div>
                    <div class="stat-number" style="color: #FF00E5; text-shadow: 0 0 20px rgba(255, 0, 229, 0.4);">{sentiment_count}</div>
                    <div class="stat-label">Mood Records</div>
                </div>
                
                <div class="stat-card">
                    <a href="/export/gps" class="stat-link"></a>
                    <div class="stat-icon">
                        <svg viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                    </div>
                    <div class="stat-number" style="color: #00FF9D; text-shadow: 0 0 20px rgba(0, 255, 157, 0.4);">{gps_count}</div>
                    <div class="stat-label">Locations Tracked</div>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 60px;">
                <a href="/" class="btn btn-secondary">← Back to Home</a>
            </div>
        </div>
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
        vlog_id = str(vlog.get("_id"))
        video_url = vlog.get("video_url", "N/A")
        mood_score = vlog.get("mood_score", "N/A")
        timestamp = vlog.get("timestamp", "N/A")
        created_at = vlog.get("created_at", "N/A")
        
        # Extract filename for download link
        filename = video_url.split("/")[-1] if video_url != "N/A" else ""
        download_url = f"/download/{filename}" if filename else "#"
        
        video_items += f"""
        <div class="card" id="vlog-{vlog_id}">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <div>
                    <span style="color: #888;">Mood Score</span>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #00E5FF;">{mood_score}</div>
                </div>
                <div style="text-align: right;">
                    <div style="color: #888; font-size: 0.9rem;">{created_at}</div>
                    <div style="color: #666; font-size: 0.8rem;">TS: {timestamp}</div>
                </div>
            </div>
            
            <div style="background: #000; border-radius: 8px; overflow: hidden; margin-bottom: 15px; max-width: 320px; margin-left: auto; margin-right: auto;">
                <video width="100%" controls style="display: block;">
                    <source src="{video_url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>
            
            <div style="text-align: right; margin-top: auto;">
                <a href="{download_url}" class="btn">Download</a>
            </div>
        </div>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Vlog Export</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        {SHARED_CSS}
        <style>
            .video-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 25px;
                margin-top: 20px;
            }}
            .card {{
                margin-bottom: 0;
                display: flex;
                flex-direction: column;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header-actions">
                <a href="/export" class="btn btn-secondary">← Back</a>
                <h1 style="margin: 0;">Vlog Recordings</h1>
                <a href="/download-all" class="btn">📦 Download All (ZIP)</a>
            </div>
            
            <p style="color: #888; margin-bottom: 30px;">Total Videos: {len(vlogs)}</p>
            
            <div class="video-grid">
                {video_items if vlogs else "<p style='text-align: center; color: #666; padding: 50px; grid-column: 1/-1;'>No vlogs available yet.</p>"}
            </div>
        </div>
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
            <td><span style="color: #00E5FF; font-weight: bold;">{mood_score}</span></td>
            <td>{timestamp}</td>
            <td>{created_at}</td>
        </tr>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Sentiments Export</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        {SHARED_CSS}
    </head>
    <body>
        <div class="container">
            <div class="header-actions">
                <a href="/export" class="btn btn-secondary">← Back</a>
                <h1 style="margin: 0;">Sentiment Data</h1>
                <a href="/download/sentiments-csv" class="btn">📥 Download CSV</a>
            </div>
            
            <p style="color: #888; margin-bottom: 20px;">Total Records: {len(sentiments)}</p>
            
            <table>
                <thead>
                    <tr>
                        <th>Mood Score</th>
                        <th>Timestamp</th>
                        <th>Created At</th>
                    </tr>
                </thead>
                <tbody>
                    {table_rows if sentiments else "<tr><td colspan='3' style='text-align:center; padding: 30px;'>No data available</td></tr>"}
                </tbody>
            </table>
        </div>
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
        <meta name="viewport" content="width=device-width, initial-scale=1">
        {SHARED_CSS}
    </head>
    <body>
        <div class="container">
            <div class="header-actions">
                <a href="/export" class="btn btn-secondary">← Back</a>
                <h1 style="margin: 0;">GPS Location Data</h1>
                <a href="/download/gps-csv" class="btn">📥 Download CSV</a>
            </div>
            
            <p style="color: #888; margin-bottom: 20px;">Total Records: {len(gps_data)}</p>
            
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
                    {table_rows if gps_data else "<tr><td colspan='5' style='text-align:center; padding: 30px;'>No GPS data available</td></tr>"}
                </tbody>
            </table>
        </div>
    </body>
    </html>
    """
    return html_content