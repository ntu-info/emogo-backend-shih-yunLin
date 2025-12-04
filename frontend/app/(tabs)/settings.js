import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView, Platform, ActionSheetIOS, SafeAreaView } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { scheduleDailyNotification, cancelAllNotifications, sendTestNotification } from "../../utils/notifications";
import { getNotificationTimes, saveNotificationTimes } from "../../utils/notificationTimes";

export default function SettingsScreen() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationTimes, setNotificationTimes] = useState([]);

  useEffect(() => {
    // 載入通知時間設定
    loadNotificationTimes();
  }, []);

  const loadNotificationTimes = async () => {
    const times = await getNotificationTimes();
    setNotificationTimes(times);
  };

  const toggleNotifications = async (value) => {
    setNotificationsEnabled(value);
    if (value) {
      const granted = await scheduleDailyNotification();
      if (granted) {
        Alert.alert("通知已啟用", "我們將在每天晚上 8 點提醒你記錄心情！");
      } else {
        setNotificationsEnabled(false);
        Alert.alert("權限不足", "請至手機設定開啟通知權限");
      }
    } else {
      await cancelAllNotifications();
      Alert.alert("通知已關閉", "你將不再收到每日提醒");
    }
  };

  const handleTestNotification = async () => {
    const sent = await sendTestNotification();
    if (sent) {
      Alert.alert("測試通知已發送", "請查看你的通知中心！(約 1 秒後出現)");
    } else {
      Alert.alert("發送失敗", "請確認通知權限是否開啟");
    }
  };

  const handleCustomizeTime = () => {
    Alert.alert(
      '自訂通知時間',
      '請選擇要修改的時段',
      [
        { text: '取消', style: 'cancel' },
        {
          text: notificationTimes[0] ? `早上 (目前 ${notificationTimes[0].hour}:${String(notificationTimes[0].minute).padStart(2, '0')})` : '早上',
          onPress: () => pickTime(0, '早上')
        },
        {
          text: notificationTimes[1] ? `下午 (目前 ${notificationTimes[1].hour}:${String(notificationTimes[1].minute).padStart(2, '0')})` : '下午',
          onPress: () => pickTime(1, '下午')
        },
        {
          text: notificationTimes[2] ? `晚上 (目前 ${notificationTimes[2].hour}:${String(notificationTimes[2].minute).padStart(2, '0')})` : '晚上',
          onPress: () => pickTime(2, '晚上')
        }
      ]
    );
  };

  const pickTime = (index, label) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);

    if (Platform.OS === 'ios') {
      // iOS: Use ActionSheet with hour options
      const hourOptions = ['取消', ...hours.map(h => `${String(h).padStart(2, '0')}:00`)];

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: hourOptions,
          cancelButtonIndex: 0,
          title: `選擇${label}通知時間`,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            const hour = hours[buttonIndex - 1];
            updateTime(index, hour, 0, label);
          }
        }
      );
    } else {
      // Android: Use simplified selection with common hours
      const commonHours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
      Alert.alert(
        `選擇${label}通知時間`,
        '選擇小時',
        [
          { text: '取消', style: 'cancel' },
          ...commonHours.map(hour => ({
            text: `${String(hour).padStart(2, '0')}:00`,
            onPress: () => updateTime(index, hour, 0, label)
          }))
        ],
        { cancelable: true }
      );
    }
  };

  const updateTime = async (index, hour, minute, label) => {
    const newTimes = [...notificationTimes];
    newTimes[index] = { hour, minute, label };

    const saved = await saveNotificationTimes(newTimes);
    if (saved) {
      setNotificationTimes(newTimes);
      Alert.alert('已更新', `${label}通知時間已設為 ${hour}:${String(minute).padStart(2, '0')}`);

      // 重新排程通知
      if (notificationsEnabled) {
        await scheduleDailyNotification();
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>

        <Text style={styles.title}>設定</Text>
      </View>

      {/* 通知設定 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>提醒與通知</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>每日提醒</Text>
              <Text style={styles.settingDescription}>每天晚上 8 點提醒記錄心情</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: "#333", true: "#FFFFFF" }}
              thumbColor={notificationsEnabled ? "#000" : "#f4f3f4"}
            />
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionButton} onPress={handleTestNotification}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionLabel}>測試通知</Text>
              <Text style={styles.actionDescription}>立即發送一則測試通知</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionButton} onPress={handleCustomizeTime}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="time-outline" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionLabel}>自訂通知時間</Text>
              <Text style={styles.actionDescription}>
                {notificationTimes.length > 0
                  ? `${notificationTimes[0]?.hour}:00, ${notificationTimes[1]?.hour}:00, ${notificationTimes[2]?.hour}:00`
                  : '設定每日提醒時間'
                }
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 關於 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>關於</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>版本</Text>
            <Text style={styles.infoValue}>1.0.0 (Beta)</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>開發者</Text>
            <Text style={styles.infoValue}>Shih-Yun Lin</Text>
          </View>
        </View>
      </View>

      <Text style={styles.footerText}>Designed by Shih-Yun Lin</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pure black
  },
  contentContainer: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center', // Center content
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    marginLeft: 4,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#161616',
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  settingInfo: {
    flex: 1,
    paddingRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#888',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 13,
    color: '#888',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  infoLabel: {
    fontSize: 16,
    color: '#888',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#222',
    marginHorizontal: 20,
  },
  footerText: {
    textAlign: 'center',
    color: '#333',
    fontSize: 12,
    marginTop: 40,
  },
});

