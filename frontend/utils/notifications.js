import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getNotificationTimes } from './notificationTimes';

// 設定通知處理方式
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

/**
 * 請求通知權限
 * @returns {Promise<boolean>} 是否授予權限
 */
export const requestNotificationPermissions = async () => {
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('⚠️ Notification permission denied');
            return false;
        }

        // 設定通知 channel (Android)
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        console.log('✅ Notification permission granted');
        return true;
    } catch (error) {
        console.error('❌ Error requesting notification permission:', error);
        return false;
    }
};

/**
 * 排程每日提醒通知
 * @param {number} hour - 小時 (0-23)
 * @param {number} minute - 分鐘 (0-59)
 * @returns {Promise<string|null>} 通知ID或null
 */
export const scheduleDailyNotifications = async () => {
    try {
        // 先取消所有現有通知
        await cancelAllNotifications();

        // 確保有權限
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
            console.log('⚠️ Cannot schedule daily notifications: permission denied.');
            return false;
        }

        // 獲取用戶自定義的通知時間
        const customTimes = await getNotificationTimes();

        const triggers = customTimes.map(time => ({
            hour: time.hour,
            minute: time.minute,
            title: `${time.label}好！`,
            body: "記錄一下此刻的心情吧！"
        }));

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        for (const trigger of triggers) {
            // 計算下一次觸發時間
            const triggerDate = new Date();
            triggerDate.setHours(trigger.hour, trigger.minute, 0, 0);

            // 如果今天的時間已經過了，設為明天
            if (trigger.hour < currentHour || (trigger.hour === currentHour && trigger.minute <= currentMinute)) {
                triggerDate.setDate(triggerDate.getDate() + 1);
            }

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: trigger.title,
                    body: trigger.body,
                    sound: true,
                },
                trigger: {
                    date: triggerDate,
                    repeats: true,
                    // Use daily repeat
                    type: Notifications.SchedulableTriggerInputTypes.DAILY,
                    hour: trigger.hour,
                    minute: trigger.minute,
                },
            });
        }

        const timesList = triggers.map(t => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`).join(', ');
        console.log(`✅ Daily notifications scheduled: ${timesList}`);
        return true;
    } catch (error) {
        console.error('❌ Error scheduling daily notifications:', error);
        return false;
    }
};

/**
 * 取消所有通知
 */
export const cancelAllNotifications = async () => {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log('✅ All notifications cancelled');
        return true;
    } catch (error) {
        console.error('❌ Error cancelling notifications:', error);
        return false;
    }
};

/**
 * 立即發送測試通知
 */
export const sendTestNotification = async () => {
    try {
        console.log('📤 Attempting to send test notification...');

        // First check permissions
        const hasPermission = await requestNotificationPermissions();
        console.log('🔐 Permission status:', hasPermission);

        if (!hasPermission) {
            console.log('❌ No notification permission');
            return false;
        }

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: "測試通知 ✨",
                body: "EmoGo 通知功能運作正常！",
            },
            trigger: { seconds: 1 },
        });

        console.log('✅ Test notification scheduled with ID:', notificationId);
        return true;
    } catch (error) {
        console.error('❌ Error sending test notification:', error);
        console.error('Error details:', error.message, error.stack);
        return false;
    }
};

/**
 * 取得所有已排程的通知
 */
export const getScheduledNotifications = async () => {
    try {
        const notifications = await Notifications.getAllScheduledNotificationsAsync();
        return notifications;
    } catch (error) {
        console.error('❌ Error getting scheduled notifications:', error);
        return [];
    }
};

// Export alias for backward compatibility
export const scheduleDailyNotification = scheduleDailyNotifications;

export default {
    requestNotificationPermissions,
    scheduleDailyNotifications,
    cancelAllNotifications,
    sendTestNotification,
    getScheduledNotifications
};
