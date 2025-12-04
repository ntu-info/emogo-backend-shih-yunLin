[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/1M59WghA)
[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=21796966&assignment_repo_type=AssignmentRepo)

# EMOGO - Emotion Vlog Tracker

一個基於 React Native 與 Expo 的**情緒追蹤 App**，讓您透過影片記錄每日心情，結合 GPS 定位與通知提醒，打造專屬的情緒日記。

## 📱 App URI

**Expo Build**: [https://expo.dev/accounts/shihyun_lin/projects/expo-router-mwe/builds/2ea73f17-47ed-4df1-8ac4-98755e613cd0](https://expo.dev/accounts/shihyun_lin/projects/expo-router-mwe/builds/2ea73f17-47ed-4df1-8ac4-98755e613cd0)

**專案頁面**: [https://expo.dev/accounts/shihyun_lin/projects/expo-router-mwe](https://expo.dev/accounts/shihyun_lin/projects/expo-router-mwe)

## 🎨 主要功能

### ✅ 核心功能
- **影片心情記錄** 📹
  - 10 秒影片錄製
  - 5 級心情評分（Sad, Bad, Neutral, Good, Great）
  - 自動儲存至本地資料庫
  
- **GPS 位置追蹤** 📍
  - 自動記錄錄製時的位置
  - 支援位置權限管理
  - 5 秒超時機制（室內也能正常使用）

- **歷史記錄瀏覽** 📊
  - **格狀檢視**：全螢幕影片卡片，底部漸層顯示資訊
  - **列表檢視**：時間軸式排列，快速瀏覽
  - 支援編輯心情分數與刪除記錄

- **每日通知提醒** 🔔
  - 預設時間：09:00、14:00、20:00
  - 可自訂提醒時間
  - iOS 與 Android 雙平台支援

- **資料匯出** ☁️
  - CSV 格式匯出
  - 包含完整日期時間與 GPS 資訊
  - 可分享或備份

### 🎨 UI/UX 特色
- **現代極簡設計**：黑色背景 + 白色/青色元素
- **流暢動畫**：首頁呼吸動畫、旋轉光環效果
- **自訂 Logo**：漸層圓形設計，取代文字
- **心情圖示**：Material Community Icons 視覺化呈現

## 📊 資料統計

### 當前記錄（作業用）
- **總記錄數**: 5 筆 ✅
- **首筆記錄**: 2025/11/26 19:44:20
- **末筆記錄**: 2025/11/27 13:54:35
- **時間跨度**: 18.27 小時 ✅
- **位置資訊**: 5 筆中有 4 筆包含 GPS

詳細資料請查看 [`data/`](./data) 資料夾。

## 🚀 如何執行

### 1. 安裝依賴
```bash
npm install
```

### 2. 啟動開發伺服器
```bash
npx expo start --tunnel
```

### 3. 在手機上開啟
- **iOS**: 使用相機 App 掃描 QR Code
- **Android**: 使用 Expo Go App 掃描 QR Code

## 📁 專案結構

```
.
├── app/
│   ├── (tabs)/           # Tab 導航頁面
│   │   ├── index.js      # 首頁（錄影介面）
│   │   ├── history.js    # 歷史記錄
│   │   └── settings.js   # 設定頁面
│   ├── _layout.js        # 根 Layout
│   └── record-mood.js    # 錄影頁面（備用）
├── assets/
│   ├── images/           # 圖片資源
│   │   └── emogo-logo.png  # App Logo
│   └── blue_neon_swirl.png # 首頁背景
├── components/           # 可重用元件
├── database/
│   └── db.js            # SQLite 資料庫邏輯
├── utils/
│   ├── export.js        # 資料匯出功能
│   ├── location.js      # GPS 定位功能
│   └── notifications.js # 通知管理
├── data/                # 匯出的資料記錄（作業用）
│   ├── mood_records.json
│   └── mood_records.csv
└── Claude_Sonnet4.5.md  # Human-AI 協作開發歷程
```

## 🛠️ 技術棧

- **框架**: React Native 0.81.5 + Expo SDK 54
- **路由**: Expo Router 6.0
- **資料庫**: Expo SQLite
- **影片**: Expo Camera + Expo Video
- **定位**: Expo Location
- **通知**: Expo Notifications
- **圖示**: @expo/vector-icons (Ionicons, MaterialCommunityIcons)
- **樣式**: LinearGradient (expo-linear-gradient)

## 📋 作業完成度檢查

### ✅ [1] App URI @ https://expo.dev/...
- 狀態: ✅ **已完成**
- Build URL: [https://expo.dev/.../builds/2ea73f17-47ed-4df1-8ac4-98755e613cd0](https://expo.dev/accounts/shihyun_lin/projects/expo-router-mwe/builds/2ea73f17-47ed-4df1-8ac4-98755e613cd0)
- 專案頁面: [expo.dev/accounts/shihyun_lin/projects/expo-router-mwe](https://expo.dev/accounts/shihyun_lin/projects/expo-router-mwe)

### ✅ [2] RN Source Code + Human-AI Interaction History
- Source Code: ✅ 完成
- Interaction History: ✅ [`Claude_Sonnet4.5.md`](./Claude_Sonnet4.5.md) - 完整的 AI 協作開發歷程

**關於 Human-AI Interaction History**：
- 檔案名稱：[`Claude_Sonnet4.5.md`](./Claude_Sonnet4.5.md)
- 內容：與 Claude AI (Sonnet 4.5) 的完整對話記錄
- 記錄範圍：從專案初始化到最終完成的所有開發過程
- 包含：需求討論、程式碼實作、問題排查、UI 優化等

### ✅ [3] Data Folder (3+ records, >12h span)
- 記錄數量: **5 筆** ✅ (超過 3 筆要求)
- 時間跨度: **18.27 小時** ✅ (超過 12 小時要求)
- 包含日期: ✅ 所有記錄都有完整日期時間
- 資料格式: JSON + CSV 雙格式

## 🎯 開發亮點

1. **完整的資料持久化**：SQLite + 檔案系統雙重儲存
2. **跨平台支援**：iOS/Android 統一體驗
3. **錯誤處理**：位置超時、權限拒絕等情況的優雅降級
4. **效能優化**：
   - 使用 `useFocusEffect` 管理動畫生命週期
   - `Promise.race` 實現位置獲取超時機制
   - 影片懶加載與串流播放
5. **UI 打磨**：
   - 移除 CameraView children 避免警告
   - 自訂 Modal 取代原生 ActionSheet
   - 響應式設計適配不同螢幕

## 📝 已知問題與解決方案

### ⚠️ 位置獲取 Timeout Log
- **現象**: 即使成功獲取位置，仍會顯示 `⏰ Location timeout`
- **原因**: `Promise.race` 中的 timeout Promise 晚於完成但仍會觸發
- **影響**: 僅為多餘 log，不影響功能
- **狀態**: 可接受（不影響使用）

### ✅ 已解決的問題
- ✅ CameraView children 警告 → 移至外層使用絕對定位
- ✅ 位置獲取卡住 → 添加 5 秒超時機制
- ✅ 動畫不重啟 → 使用 `useFocusEffect` + `isRecordingMode` 依賴

## 📞 聯絡資訊

- **開發者**: Shih-Yun Lin
- **Expo 帳號**: @shihyun_lin
- **專案類型**: NTU 資訊管理 - Mobile App Development 作業


