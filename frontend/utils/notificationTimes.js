import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_TIMES_KEY = '@notification_times';

// 默認通知時間
const DEFAULT_TIMES = [
    { hour: 9, minute: 0, label: '早上' },
    { hour: 14, minute: 0, label: '下午' },
    { hour: 20, minute: 0, label: '晚上' }
];

/**
 * 獲取通知時間設定
 */
export const getNotificationTimes = async () => {
    try {
        const stored = await AsyncStorage.getItem(NOTIFICATION_TIMES_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        return DEFAULT_TIMES;
    } catch (error) {
        console.error('Error getting notification times:', error);
        return DEFAULT_TIMES;
    }
};

/**
 * 保存通知時間設定
 */
export const saveNotificationTimes = async (times) => {
    try {
        await AsyncStorage.setItem(NOTIFICATION_TIMES_KEY, JSON.stringify(times));
        return true;
    } catch (error) {
        console.error('Error saving notification times:', error);
        return false;
    }
};

export default {
    getNotificationTimes,
    saveNotificationTimes,
    DEFAULT_TIMES
};
