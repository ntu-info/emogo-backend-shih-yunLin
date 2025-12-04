import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getAllRecords, getStats } from '../database/db';

/**
 * 匯出所有資料
 * 將資料庫內容匯出成 JSON 檔案並分享
 */
export const exportData = async () => {
    try {
        // 1. 取得所有記錄
        const records = getAllRecords();
        const stats = getStats();

        // 2. 整理資料格式
        const exportData = {
            metadata: {
                exportTime: new Date().toISOString(),
                totalRecords: stats.total,
                firstRecordTime: stats.firstRecord,
                lastRecordTime: stats.lastRecord,
                timeSpanHours: stats.timeSpanHours,
                meetsRequirements: stats.total >= 3 && parseFloat(stats.timeSpanHours) > 12
            },
            records: records.map(record => ({
                id: record.id,
                timestamp: record.timestamp,
                datetime: new Date(record.timestamp * 1000).toISOString(),
                mood_score: record.mood_score,
                video_path: record.video_path,
                location: {
                    latitude: record.latitude,
                    longitude: record.longitude,
                    accuracy: record.location_accuracy
                }
            }))
        };

        // 3. 建立 CSV 內容
        const csvHeader = 'ID,日期時間,心情分數,有影片,經度,緯度,位置精確度\n';
        const csvRows = records.map(record => {
            const datetime = new Date(record.timestamp * 1000).toLocaleString('zh-TW');
            const hasVideo = record.video_path ? '是' : '否';
            const lat = record.latitude || '';
            const lon = record.longitude || '';
            const acc = record.location_accuracy || '';

            return `${record.id},"${datetime}",${record.mood_score},${hasVideo},${lon},${lat},${acc}`;
        }).join('\n');

        const csvString = csvHeader + csvRows;

        // 4. 建立檔案路徑
        const fileName = `emogo_data_${Date.now()}.csv`;
        const fileUri = FileSystem.documentDirectory + fileName;

        // 5. 寫入檔案 (使用 legacy API)
        await FileSystem.writeAsStringAsync(fileUri, csvString);

        // 6. 分享檔案
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
            await Sharing.shareAsync(fileUri, {
                mimeType: 'text/csv',
                dialogTitle: '匯出 EmoGo 資料'
            });
            console.log('✅ Data exported successfully as CSV');
            return { success: true, fileUri };
        } else {
            console.log('⚠️ Sharing not available');
            return { success: false, message: '此裝置不支援分享功能' };
        }
    } catch (error) {
        console.error('❌ Error exporting data:', error);
        return { success: false, message: error.message };
    }
};

/**
 * 取得資料目錄路徑
 */
export const getDataDirectory = () => {
    return FileSystem.documentDirectory;
};

/**
 * 列出所有影片檔案
 */
export const listVideoFiles = async () => {
    try {
        const videoDir = FileSystem.documentDirectory + 'videos/';
        const files = await FileSystem.readDirectoryAsync(videoDir);
        return files.filter(file => file.endsWith('.mp4') || file.endsWith('.mov'));
    } catch (error) {
        console.error('❌ Error listing video files:', error);
        return [];
    }
};

export default {
    exportData,
    getDataDirectory,
    listVideoFiles
};
