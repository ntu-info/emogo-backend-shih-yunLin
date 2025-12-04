[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/e7FBMwSa)
[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=21880023&assignment_repo_type=AssignmentRepo)

# EmoGo Backend

A FastAPI + MongoDB backend for the EmoGo mood tracking application.

## 🌐 Deployed URL

**Data Export Page:** https://emogo-backend-shih-yunlin.onrender.com/export

TAs and users can access the following pages to view/download collected data:
- [Vlog Export](https://emogo-backend-shih-yunlin.onrender.com/export/vlog) - View and download mood videos
- [Sentiments Export](https://emogo-backend-shih-yunlin.onrender.com/export/sentiments) - View mood score data
- [GPS Export](https://emogo-backend-shih-yunlin.onrender.com/export/gps) - View GPS coordinates data

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/api/moods` | POST | Upload mood record (video, mood_score, GPS) |
| `/export` | GET | HTML export index page |
| `/export/vlog` | GET | HTML page with video preview and download |
| `/export/sentiments` | GET | HTML table of mood scores |
| `/export/gps` | GET | HTML table of GPS data |
| `/download/{filename}` | GET | Force download a video file |
| `/download-all` | GET | Download all videos as ZIP |

## 🛠 Tech Stack

- **Framework:** FastAPI
- **Database:** MongoDB Atlas
- **Deployment:** Render

## 🚀 Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --reload
```

## 📁 Project Structure

```
├── main.py           # FastAPI application
├── requirements.txt  # Python dependencies
├── render.yaml       # Render deployment config
├── uploads/          # Video storage
└── frontend/         # Expo frontend app (optional)
```