[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/e7FBMwSa)
[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=21880023&assignment_repo_type=AssignmentRepo)

# EmoGo 後端系統

基於 FastAPI + MongoDB 的生產級後端服務，專為 EmoGo 心情追蹤應用程式設計，部署於 Render 平台，提供完整的 CRUD 操作、資料匯出能力及影片檔案管理功能。

## 🎯 專案概述

本專案實作了一個 RESTful API 後端，處理以下功能：
- **心情資料收集**：接收來自 EmoGo 行動前端的心情分數、GPS 座標及影片上傳
- **持久化儲存**：將結構化資料儲存於 MongoDB Atlas 的三個集合中（`vlog`、`sentiments`、`gps`）
- **資料匯出**：提供使用者友善的 HTML 頁面，用於查看和下載所有收集的資料
- **影片管理**：處理影片檔案上傳、儲存、預覽及批次下載功能

## 🌐 線上部署

**📊 資料匯出與下載頁面：** [https://emogo-backend-shih-yunlin.onrender.com/export](https://emogo-backend-shih-yunlin.onrender.com/export)

### 可用的匯出頁面

助教和審查者可以透過以下頁面查看和下載所有收集的資料：

| 資料類型 | 網址 | 功能 |
|---------|-----|------|
| **Vlog 影片** | [/export/vlog](https://emogo-backend-shih-yunlin.onrender.com/export/vlog) | 影片預覽、單檔下載、批次 ZIP 下載 |
| **心情資料** | [/export/sentiments](https://emogo-backend-shih-yunlin.onrender.com/export/sentiments) | 心情分數與時間戳記、CSV 下載 |
| **GPS 座標** | [/export/gps](https://emogo-backend-shih-yunlin.onrender.com/export/gps) | 位置資料與精度指標、CSV 下載 |

## 📡 API 文件

### 核心端點

| 端點 | 方法 | 說明 | 請求內容 |
|-----|------|-----|---------|
| `/` | GET | 健康檢查端點 | - |
| `/api/moods` | POST | 上傳心情記錄 | `FormData` 包含 `mood_score`、`video`、`latitude`、`longitude`、`location_accuracy`、`timestamp` |

### 資料匯出端點

| 端點 | 方法 | 說明 | 回應 |
|-----|------|-----|------|
| `/export` | GET | HTML 索引頁面，包含所有匯出頁面的連結 | HTML |
| `/export/vlog` | GET | 查看所有 vlog 項目及影片預覽 | 內嵌影片的 HTML |
| `/export/sentiments` | GET | 查看所有心情資料記錄 | HTML 表格 |
| `/export/gps` | GET | 查看所有 GPS 座標記錄 | HTML 表格 |

### 檔案下載端點

| 端點 | 方法 | 說明 |
|-----|------|-----|
| `/download/{filename}` | GET | 下載特定影片檔案 |
| `/download-all` | GET | 將所有影片打包成單一 ZIP 封存檔下載 |
| `/download/sentiments-csv` | GET | 下載心情資料 CSV 檔案 |
| `/download/gps-csv` | GET | 下載 GPS 資料 CSV 檔案 |

### 靜態檔案

| 路徑 | 說明 |
|-----|-----|
| `/uploads/{filename}` | 提供已上傳的影片檔案串流/預覽 |

## 🛠 技術堆疊

- **後端框架**：FastAPI 0.104.1
- **資料庫**：MongoDB Atlas（雲端託管）
- **非同步驅動程式**：Motor（MongoDB 非同步驅動程式）
- **部署平台**：Render（PaaS）
- **檔案儲存**：本地檔案系統（`uploads/` 目錄）
- **環境管理**：python-dotenv

## 🏗 架構說明

### 資料庫結構

本應用程式使用 MongoDB，包含三個集合：

#### 1. `vlog` 集合
```json
{
  "_id": "ObjectId",
  "mood_score": 1-5,
  "video_url": "/uploads/filename.mp4",
  "timestamp": "ISO datetime",
  "created_at": "ISO datetime"
}
```

#### 2. `sentiments` 集合
```json
{
  "_id": "ObjectId",
  "mood_score": 1-5,
  "timestamp": "ISO datetime",
  "created_at": "ISO datetime"
}
```

#### 3. `gps` 集合
```json
{
  "_id": "ObjectId",
  "latitude": float,
  "longitude": float,
  "accuracy": float,
  "timestamp": "ISO datetime",
  "created_at": "ISO datetime"
}
```

### 檔案儲存策略

- **本地儲存**：影片儲存於 `uploads/` 目錄
- **檔案命名**：時間戳記檔名以避免衝突（`vlog_{timestamp}_{mood_score}.mp4`）
- **Render 限制**：暫存檔案系統 - Render 免費方案在伺服器重啟時會清除已上傳的檔案

## 🚀 本地開發

### 前置需求

- Python 3.8+
- MongoDB 執行個體（本地或 MongoDB Atlas）

### 安裝步驟

```bash
# 複製專案
git clone <your-repo-url>
cd emogo-backend-shih-yunLin

# 安裝相依套件
pip install -r requirements.txt

# 設定環境變數
# 建立 .env 檔案，內容如下：
# DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/?appName=YourApp
```

### 執行伺服器

```bash
# 開發模式（自動重新載入）
uvicorn main:app --reload

# 正式環境模式
uvicorn main:app --host 0.0.0.0 --port 8000
```

伺服器將於 `http://localhost:8000` 啟動

### 測試 API

```bash
# 健康檢查
curl http://localhost:8000/

# 查看 vlog 匯出頁面
open http://localhost:8000/export/vlog
```

## 📁 專案結構

```
emogo-backend-shih-yunLin/
├── main.py                 # FastAPI 應用程式進入點
├── requirements.txt        # Python 相依套件
├── render.yaml            # Render 部署設定
├── .env                   # 環境變數（不納入版控）
├── .gitignore            # Git 忽略規則
├── uploads/              # 影片檔案儲存目錄
│   └── *.mp4            # 已上傳的影片檔案
└── frontend/            # 【選用】Expo 行動應用程式
    ├── app/             # React Native 畫面
    ├── components/      # 可重複使用的 UI 元件
    ├── database/        # SQLite 本地儲存
    └── utils/           # 輔助函式
```

## 🔒 安全性與環境變數

應用程式使用環境變數處理敏感設定：

- `DATABASE_URL`：MongoDB 連線字串（於 Render 儀表板設定）

**重要**：切勿提交 `.env` 檔案或在原始碼中寫死憑證。

## 🌟 已實作的選用功能

### 前端整合

本專案包含選用的 Expo React Native 行動應用程式，具備以下功能：
- 使用裝置相機錄製心情影片日誌
- 擷取 GPS 座標
- 將資料儲存於本地 SQLite
- **上傳資料至 Render 後端**（完成產品閉環）
- 提供簡潔的心情追蹤使用者介面

#### 前端設定

```bash
cd frontend
npm install
npx expo start
```

使用 Expo Go 應用程式掃描 QR 碼即可在裝置上執行。

## 📝 部署說明

### Render 設定

- **建置指令**：`pip install -r requirements.txt`
- **啟動指令**：`uvicorn main:app --host 0.0.0.0 --port $PORT`
- **環境變數**：須在 Render 儀表板設定 `DATABASE_URL`

### 已知限制

- **暫存儲存空間**：已上傳的影片儲存於本地檔案系統，在 Render 免費方案中，當服務重啟時會被重置
- **因應方式**：正式環境使用時，建議實作 MongoDB GridFS 或雲端儲存（S3、Cloudinary）

## 🎓 作業要求符合度

本專案滿足所有作業要求：

- ✅ **【目標】**：後端已部署於公開伺服器（Render），使用 FastAPI + MongoDB
- ✅ **【必要】**：上述資料匯出頁面提供所有三種資料類型的存取（vlogs、sentiments、GPS）
- ✅ **【選用】**：前端已修改並整合，可上傳資料至已部署的後端

## 📄 授權

本專案為教育用途，屬於 NTU INFO 課程作業的一部分。