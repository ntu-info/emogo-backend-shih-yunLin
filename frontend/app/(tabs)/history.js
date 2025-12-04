import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Modal, ActionSheetIOS, Platform } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { getAllRecords, clearAllRecords, updateMoodScore, deleteRecord } from "../../database/db";
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { exportData } from "../../utils/export";

// Helper functions moved outside
const getMoodColor = (score) => {
    const colors = { 1: "#90A4AE", 2: "#78909C", 3: "#FFB74D", 4: "#FF9800", 5: "#FF6F00" };
    return colors[score] || "#90A4AE";
};

const renderMoodIcon = (score, size = 32) => {
    const icons = {
        1: "emoticon-sad-outline",
        2: "emoticon-confused-outline",
        3: "emoticon-neutral-outline",
        4: "emoticon-happy-outline",
        5: "emoticon-excited-outline"
    };
    const iconName = icons[score] || "emoticon-neutral-outline";
    return <MaterialCommunityIcons name={iconName} size={size} color="#FFFFFF" />;
};

const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
};

const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-TW', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
    });
};

// New Grid Item Component with Video Support
const HistoryGridItem = ({ item, onPress, onLongPress }) => {
    const player = useVideoPlayer(item.video_path, player => {
        player.muted = true;
        // Don't auto-play, just show first frame
    });

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => onPress(item)}
            onLongPress={() => onLongPress(item)}
            activeOpacity={0.9}
        >
            {item.video_path ? (
                <View style={StyleSheet.absoluteFill}>
                    <VideoView
                        style={{ width: '100%', height: '100%' }}
                        player={player}
                        nativeControls={false}
                        contentFit="cover"
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={StyleSheet.absoluteFill}
                    />
                </View>
            ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: getMoodColor(item.mood_score), justifyContent: 'center', alignItems: 'center' }]}>
                    {renderMoodIcon(item.mood_score, 48)}
                </View>
            )}

            {/* Top Right Play Icon */}
            <View style={styles.cardTopRight}>
                <Ionicons name="play-circle" size={24} color="rgba(255,255,255,0.8)" />
            </View>

            {/* Bottom Content */}
            <View style={styles.cardFooter}>
                <View>
                    <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
                    <Text style={styles.timeText}>{formatTime(item.timestamp)}</Text>
                </View>

                <View style={[styles.moodBadge, { backgroundColor: getMoodColor(item.mood_score) }]}>
                    {renderMoodIcon(item.mood_score)}
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function HistoryScreen() {
    const router = useRouter();
    const [records, setRecords] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [showMoodPickerModal, setShowMoodPickerModal] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);

    const loadRecords = useCallback(() => {
        const data = getAllRecords();
        console.log('Loaded records:', JSON.stringify(data.slice(0, 3), null, 2)); // Debug log
        setRecords(data.sort((a, b) => b.timestamp - a.timestamp));
    }, []);

    useFocusEffect(loadRecords);

    const handleClearAll = () => {
        Alert.alert(
            "清除所有記錄",
            "確定要刪除所有心情記錄嗎？此操作無法復原。",
            [
                { text: "取消", style: "cancel" },
                {
                    text: "確定刪除",
                    style: "destructive",
                    onPress: () => {
                        clearAllRecords();
                        loadRecords();
                    }
                }
            ]
        );
    };

    const handleExport = async () => {
        const result = await exportData();
        if (result.success) {
            Alert.alert("✅ 匯出成功", "檔案已準備好分享");
        } else {
            Alert.alert("❌ 匯出失敗", result.message || "發生錯誤");
        }
    };

    const handleEditRecord = (record) => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['取消', '更改心情', '重拍影片', '刪除記錄'],
                    destructiveButtonIndex: 3,
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        // 更改心情
                        showMoodPicker(record);
                    } else if (buttonIndex === 2) {
                        // 重拍影片
                        handleRetakeVideo(record);
                    } else if (buttonIndex === 3) {
                        // 刪除記錄
                        handleDeleteRecord(record.id);
                    }
                }
            );
        } else {
            // Android - use Alert with buttons
            Alert.alert(
                '編輯記錄',
                '選擇操作',
                [
                    { text: '取消', style: 'cancel' },
                    {
                        text: '更改心情',
                        onPress: () => showMoodPicker(record)
                    },
                    {
                        text: '重拍影片',
                        onPress: () => handleRetakeVideo(record)
                    },
                    {
                        text: '刪除記錄',
                        style: 'destructive',
                        onPress: () => handleDeleteRecord(record.id)
                    }
                ]
            );
        }
    };

    const showMoodPicker = (record) => {
        setEditingRecord(record);
        setShowMoodPickerModal(true);
    };

    const handleMoodSelect = (score) => {
        if (!editingRecord) return;

        const result = updateMoodScore(editingRecord.id, score);
        if (result.success) {
            Alert.alert('已更新', '心情已更新為 ' + score + ' 分');
            loadRecords();
            setShowMoodPickerModal(false);
            setEditingRecord(null);
        } else {
            Alert.alert('更新失敗', result.error);
        }
    };

    const handleDeleteRecord = (recordId) => {
        Alert.alert(
            '確認刪除',
            '確定要刪除這筆記錄嗎？',
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '刪除',
                    style: 'destructive',
                    onPress: () => {
                        const result = deleteRecord(recordId);
                        if (result.success) {
                            Alert.alert('已刪除');
                            loadRecords();
                        } else {
                            Alert.alert('刪除失敗', result.error);
                        }
                    }
                }
            ]
        );
    };

    const handleRetakeVideo = (record) => {
        Alert.alert(
            '重拍影片',
            '要為這筆記錄重新錄製影片嗎？',
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '開始錄影',
                    onPress: () => {
                        // 跳轉到錄影頁面，並傳遞記錄 ID
                        router.push({
                            pathname: '/record-mood',
                            params: { editRecordId: record.id }
                        });
                    }
                }
            ]
        );
    };

    const player = useVideoPlayer(selectedVideo, player => {
        player.loop = true;
        player.play();
    });

    const renderListItem = ({ item }) => (
        <TouchableOpacity
            style={styles.listCard}
            onPress={() => item.video_path && setSelectedVideo(item.video_path)}
            onLongPress={() => handleEditRecord(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.listMoodBadge, { backgroundColor: getMoodColor(item.mood_score) }]}>
                {renderMoodIcon(item.mood_score)}
            </View>

            <View style={styles.listContent}>
                <View style={styles.listHeader}>
                    <Text style={styles.listDateText}>{formatDate(item.timestamp)} {formatTime(item.timestamp)}</Text>
                </View>
                <Text style={styles.listScoreText}>心情指數: {item.mood_score}/5</Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>歷史紀錄</Text>


                <View style={styles.viewToggleContainer}>
                    <TouchableOpacity
                        style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
                        onPress={() => setViewMode('list')}
                    >
                        <Ionicons name="list" size={20} color={viewMode === 'list' ? '#000' : '#666'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.viewToggleButton, viewMode === 'grid' && styles.viewToggleButtonActive]}
                        onPress={() => setViewMode('grid')}
                    >
                        <Ionicons name="grid" size={20} color={viewMode === 'grid' ? '#000' : '#666'} />
                    </TouchableOpacity>
                </View>

                <View style={styles.headerActions}>
                    {records.length > 0 && (
                        <TouchableOpacity onPress={handleExport} style={styles.exportButton}>
                            <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
                        </TouchableOpacity>
                    )}
                    {records.length > 0 && (
                        <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
                            <Ionicons name="trash-outline" size={20} color="#FFF" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {records.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="albums-outline" size={80} color="#333" />
                    <Text style={styles.emptyTitle}>還沒有記錄喔</Text>
                    <Text style={styles.emptyText}>快去首頁記錄你的第一筆心情吧！</Text>
                </View>
            ) : (
                <FlatList
                    key={viewMode} // Force re-render when switching modes
                    data={records}
                    renderItem={viewMode === 'grid'
                        ? ({ item }) => (
                            <HistoryGridItem
                                item={item}
                                onPress={(item) => item.video_path && setSelectedVideo(item.video_path)}
                                onLongPress={handleEditRecord}
                            />
                        )
                        : renderListItem
                    }
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    numColumns={viewMode === 'grid' ? 2 : 1}
                    columnWrapperStyle={viewMode === 'grid' ? styles.columnWrapper : null}
                />
            )}

            {/* Video Player Modal */}
            <Modal
                visible={!!selectedVideo}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedVideo(null)}
            >
                <View style={styles.modalContainer}>
                    <TouchableOpacity
                        style={styles.modalClose}
                        onPress={() => setSelectedVideo(null)}
                    >
                        <Ionicons name="close-circle" size={40} color="#FFF" />
                    </TouchableOpacity>

                    <View style={styles.videoWrapper}>
                        {selectedVideo && (
                            <VideoView
                                style={styles.video}
                                player={player}
                                allowsFullscreen
                                allowsPictureInPicture
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* Mood Picker Modal */}
            <Modal
                visible={showMoodPickerModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowMoodPickerModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalContainer}
                    activeOpacity={1}
                    onPress={() => setShowMoodPickerModal(false)}
                >
                    <View style={styles.pickerContent}>
                        <Text style={styles.pickerTitle}>選擇心情</Text>
                        {[1, 2, 3, 4, 5].map((score) => (
                            <TouchableOpacity
                                key={score}
                                style={styles.pickerOption}
                                onPress={() => handleMoodSelect(score)}
                            >
                                {renderMoodIcon(score)}
                                <Text style={styles.pickerOptionText}>
                                    {score === 1 && "Sad"}
                                    {score === 2 && "Bad"}
                                    {score === 3 && "Neutral"}
                                    {score === 4 && "Good"}
                                    {score === 5 && "Great"}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={styles.pickerCancelButton}
                            onPress={() => setShowMoodPickerModal(false)}
                        >
                            <Text style={styles.pickerCancelText}>取消</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity >
            </Modal >
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 15,
        backgroundColor: '#000',
        zIndex: 10,
        position: 'relative', // Ensure absolute child positions relative to this
    },
    title: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 60, // Match header paddingTop
        height: 40, // Match button height approx
        textAlign: 'center',
        lineHeight: 40, // Vertically center
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        zIndex: -1,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewToggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#222',
        borderRadius: 20,
        padding: 4,
        gap: 4,
    },
    viewToggleButton: {
        padding: 8,
        borderRadius: 16,
    },
    viewToggleButtonActive: {
        backgroundColor: '#FFF',
    },
    headerActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 15,
    },
    exportButton: {
        padding: 4,
    },
    clearButton: {
        padding: 4,
    },
    listContainer: {
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 100,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    // Grid Card Styles
    card: {
        flex: 1,
        aspectRatio: 0.75, // Vertical card
        borderRadius: 24,
        marginBottom: 16,
        marginHorizontal: 6,
        overflow: 'hidden',
        backgroundColor: '#1A1A1A',
        justifyContent: 'space-between',
    },
    cardTopRight: {
        alignItems: 'flex-end',
        padding: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        padding: 12,
        marginTop: 'auto',
    },
    dateText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
        marginBottom: 2,
    },
    timeText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
    },
    moodBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    // List Card Styles
    listCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    listMoodBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    listContent: {
        flex: 1,
    },
    listHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    listDateText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    listScoreText: {
        color: '#888',
        fontSize: 12,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 100,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginTop: 20,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: '#888',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalClose: {
        position: 'absolute',
        top: 60,
        right: 20,
        zIndex: 20,
    },
    videoWrapper: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerContent: {
        width: '80%',
        backgroundColor: '#1C1C1E', // Dark gray like iOS dark mode
        borderRadius: 14,
        padding: 20,
        alignItems: 'center',
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 20,
    },
    pickerOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        width: '100%',
        borderBottomWidth: 0.5,
        borderBottomColor: '#333',
    },
    pickerOptionText: {
        fontSize: 18,
        color: '#FFF',
        marginLeft: 15,
    },
    pickerCancelButton: {
        marginTop: 20,
        paddingVertical: 10,
        width: '100%',
        alignItems: 'center',
    },
    pickerCancelText: {
        fontSize: 18,
        color: '#007AFF', // iOS Blue
        fontWeight: '600',
    },
});

