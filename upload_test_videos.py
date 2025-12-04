"""
將 uploads 資料夾中的測試影片上傳到 MongoDB
"""
import asyncio
import os
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
MONGODB_URI = os.getenv("DATABASE_URL")
DB_NAME = "emogo"

async def upload_test_videos():
    """上傳測試影片到 MongoDB"""
    
    # 連接 MongoDB
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    
    # 獲取 uploads 資料夾中的所有影片檔案
    uploads_dir = "uploads"
    video_files = [f for f in os.listdir(uploads_dir) if f.endswith('.mp4')]
    
    print(f"📁 找到 {len(video_files)} 個影片檔案\n")
    
    # 插入每個影片記錄
    for idx, filename in enumerate(video_files, 1):
        # 準備資料
        timestamp = datetime.now()
        video_url = f"http://localhost:8000/uploads/{filename}"
        mood_score = (idx % 5) + 1  # 1-5 之間循環
        
        # 插入到 vlog collection
        result = await db["vlog"].insert_one({
            "video_url": video_url,
            "mood_score": mood_score,
            "timestamp": timestamp,
            "created_at": timestamp
        })
        
        print(f"✅ 已上傳: {filename}")
        print(f"   ├─ Mood Score: {mood_score}")
        print(f"   ├─ Video URL: {video_url}")
        print(f"   └─ MongoDB ID: {result.inserted_id}\n")
        
        # 也插入到 sentiments collection
        await db["sentiments"].insert_one({
            "mood_score": mood_score,
            "timestamp": timestamp,
            "created_at": timestamp
        })
    
    print(f"🎉 完成！共上傳 {len(video_files)} 個影片到 MongoDB")
    
    # 關閉連接
    client.close()

if __name__ == "__main__":
    asyncio.run(upload_test_videos())
