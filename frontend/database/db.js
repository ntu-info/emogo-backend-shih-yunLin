import * as SQLite from 'expo-sqlite';

let db;
try {
    db = SQLite.openDatabaseSync('emogo.db');
} catch (error) {
    console.error("Error opening database:", error);
}

// 初始化資料庫
export function initDatabase() {
    if (!db) return;
    try {
        db.execSync(`
            CREATE TABLE IF NOT EXISTS mood_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mood_score INTEGER NOT NULL,
                video_path TEXT,
                latitude REAL,
                longitude REAL,
                location_accuracy REAL,
                timestamp INTEGER NOT NULL
            );
        `);
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

// 新增記錄
export function insertMoodRecord({ moodScore, videoPath, latitude, longitude, locationAccuracy }) {
    if (!db) return { success: false, error: "Database not initialized" };

    try {
        const timestamp = Math.floor(Date.now() / 1000);
        const result = db.runSync(
            'INSERT INTO mood_records (mood_score, video_path, latitude, longitude, location_accuracy, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
            [moodScore, videoPath, latitude, longitude, locationAccuracy, timestamp]
        );
        return { success: true, id: result.lastInsertRowId };
    } catch (error) {
        console.error('Error inserting record:', error);
        return { success: false, error: error.message };
    }
}

// 獲取所有記錄
export function getAllRecords() {
    if (!db) return [];
    try {
        return db.getAllSync('SELECT * FROM mood_records ORDER BY timestamp DESC');
    } catch (error) {
        console.error('Error getting records:', error);
        return [];
    }
}

// 根據時間範圍查詢記錄
export function getRecordsByDateRange(startTime, endTime) {
    if (!db) return [];
    try {
        return db.getAllSync(
            'SELECT * FROM mood_records WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC',
            [startTime, endTime]
        );
    } catch (error) {
        console.error('Error getting records by date range:', error);
        return [];
    }
}

// 清除所有記錄
export function clearAllRecords() {
    if (!db) return;
    try {
        db.runSync('DELETE FROM mood_records');
        console.log('All records cleared');
    } catch (error) {
        console.error('Error clearing records:', error);
    }
}

// 獲取統計數據
export function getStats() {
    if (!db) return { total: 0, timeSpanHours: 0 };
    try {
        const result = db.getFirstSync('SELECT COUNT(*) as total, MIN(timestamp) as first_time, MAX(timestamp) as last_time FROM mood_records');

        if (!result || result.total === 0) {
            return { total: 0, timeSpanHours: 0 };
        }

        const timeSpanSeconds = result.last_time - result.first_time;
        const timeSpanHours = (timeSpanSeconds / 3600).toFixed(1);

        return {
            total: result.total,
            timeSpanHours: parseFloat(timeSpanHours)
        };
    } catch (error) {
        console.error('Error getting stats:', error);
        return { total: 0, timeSpanHours: 0 };
    }
}

// 更新心情分數
export function updateMoodScore(recordId, newScore) {
    if (!db) return { success: false, error: "Database not initialized" };
    try {
        db.runSync(
            'UPDATE mood_records SET mood_score = ? WHERE id = ?',
            [newScore, recordId]
        );
        console.log(`Mood score updated for record ${recordId}`);
        return { success: true };
    } catch (error) {
        console.error('Error updating mood score:', error);
        return { success: false, error: error.message };
    }
}

// 更新影片路徑
export function updateVideoPath(recordId, newPath) {
    if (!db) return { success: false, error: "Database not initialized" };
    try {
        db.runSync(
            'UPDATE mood_records SET video_path = ? WHERE id = ?',
            [newPath, recordId]
        );
        console.log(`Video path updated for record ${recordId}`);
        return { success: true };
    } catch (error) {
        console.error('Error updating video path:', error);
        return { success: false, error: error.message };
    }
}

// 刪除單筆記錄
export function deleteRecord(recordId) {
    if (!db) return { success: false, error: "Database not initialized" };
    try {
        db.runSync('DELETE FROM mood_records WHERE id = ?', [recordId]);
        console.log(`Record ${recordId} deleted`);
        return { success: true };
    } catch (error) {
        console.error('Error deleting record:', error);
        return { success: false, error: error.message };
    }
}

// 驗證資料收集進度
export function validateDataCollection() {
    const stats = getStats();
    const MIN_RECORDS = 3;

    if (stats.total < MIN_RECORDS) {
        return {
            valid: false,
            message: `目前有 ${stats.total} 筆記錄，還差 ${MIN_RECORDS - stats.total} 筆。`
        };
    }

    return {
        valid: true,
        message: "恭喜！已達成資料收集目標 🎉"
    };
}
