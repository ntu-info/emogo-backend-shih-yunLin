import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Animated, Easing, Dimensions, PanResponder } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useRef, useEffect } from "react";
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { insertMoodRecord, updateVideoPath } from "../database/db";
import { getCurrentLocation } from "../utils/location";

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_PADDING = 24;
const RECT_WIDTH = SCREEN_WIDTH - (CONTAINER_PADDING * 2);
const RECT_HEIGHT = RECT_WIDTH * (4 / 3);

export default function RecordMoodScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const editRecordId = params.editRecordId ? parseInt(params.editRecordId) : null;
    const [step, setStep] = useState('recording'); // 'recording' | 'selection'
    const [selectedMood, setSelectedMood] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [videoUri, setVideoUri] = useState(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState('front'); // 'front' | 'back'
    const [zoom, setZoom] = useState(0); // 0-1
    const cameraRef = useRef(null);
    const timerRef = useRef(null);

    // Animation Values
    const animWidth = useRef(new Animated.Value(300)).current;
    const animHeight = useRef(new Animated.Value(300)).current;
    const animRadius = useRef(new Animated.Value(150)).current;
    const animBorderWidth = useRef(new Animated.Value(4)).current;

    useEffect(() => {
        // Start the "Expand" animation immediately on mount
        Animated.parallel([
            Animated.timing(animWidth, {
                toValue: RECT_WIDTH,
                duration: 800, // Slower for smoother feel
                easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Natural ease-in-out
                useNativeDriver: false,
            }),
            Animated.timing(animHeight, {
                toValue: RECT_HEIGHT,
                duration: 800,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                useNativeDriver: false,
            }),
            Animated.timing(animRadius, {
                toValue: 30, // Rectangular radius
                duration: 800,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                useNativeDriver: false,
            }),
            Animated.timing(animBorderWidth, {
                toValue: 1,
                duration: 800,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                useNativeDriver: false,
            })
        ]).start();
    }, []);

    const player = useVideoPlayer(videoUri, player => {
        player.loop = true;
        player.play();
    });

    const handleMoodSelect = (mood) => {
        setSelectedMood(mood);
    };

    const startRecording = async () => {
        if (!permission || !permission.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                Alert.alert("需要相機權限", "請允許使用相機以錄製心情 Vlog");
                return;
            }
        }

        if (cameraRef.current && !isRecording) {
            setIsRecording(true);
            setRecordingDuration(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

            try {
                const videoData = await cameraRef.current.recordAsync({
                    quality: '720p',
                });

                // Recording stopped - set video URI and move to selection
                setVideoUri(videoData.uri);
                setIsRecording(false);
                clearInterval(timerRef.current);
                setStep('selection');
            } catch (error) {
                console.error("Recording error:", error);
                setIsRecording(false);
                clearInterval(timerRef.current);
                Alert.alert("錄影失敗", "請重試");
            }
        }
    };

    const stopRecording = async () => {
        if (cameraRef.current && isRecording) {
            cameraRef.current.stopRecording();
        }
    };

    const toggleCameraFacing = () => {
        setFacing(current => (current === 'front' ? 'back' : 'front'));
    };

    // ⬇️ Backend API URL
    const API_URL = "https://emogo-backend-shih-yunlin.onrender.com";

    const uploadToBackend = async (moodData) => {
        console.log('🚀 開始上傳到 Backend...');
        try {
            const formData = new FormData();
            formData.append('mood_score', moodData.moodScore.toString());

            if (moodData.latitude) formData.append('latitude', moodData.latitude.toString());
            if (moodData.longitude) formData.append('longitude', moodData.longitude.toString());
            if (moodData.locationAccuracy) formData.append('location_accuracy', moodData.locationAccuracy.toString());

            // Add video file
            if (moodData.videoPath) {
                const videoUri = moodData.videoPath;
                const filename = videoUri.split('/').pop();
                formData.append('video', {
                    uri: videoUri,
                    name: filename,
                    type: 'video/mp4',
                });
            }

            console.log(`📡 正在上傳到: ${API_URL}/api/moods`);
            const response = await fetch(`${API_URL}/api/moods`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ ✅ ✅ Backend 上傳成功！', result);

            // 自動測試：檢查後端健康狀態
            console.log('🔍 自動測試後端連接...');
            const healthCheck = await fetch(`${API_URL}/`);
            const healthData = await healthCheck.json();
            console.log('✅ 後端健康檢查:', healthData);  // 應該顯示 { message: 'server ok' }

            return result;
        } catch (error) {
            console.error('❌ ❌ ❌ Backend 上傳失敗:', error.message);
            // Don't throw - local save still succeeded
        }
    };

    const handleSaveRecord = async () => {
        if (!selectedMood || !videoUri) return;

        console.log('🔥🔥🔥 handleSaveRecord 開始執行！editRecordId:', editRecordId);
        setIsProcessing(true);
        try {
            // 如果是編輯模式（重拍影片）
            if (editRecordId) {
                const result = await updateVideoPath(editRecordId, videoUri);

                // 也上傳到 Backend
                const location = await getCurrentLocation();
                uploadToBackend({
                    moodScore: selectedMood.score,
                    videoPath: videoUri,
                    latitude: location?.latitude,
                    longitude: location?.longitude,
                    locationAccuracy: location?.accuracy
                });

                if (result.success) {
                    Alert.alert(
                        "影片已更新！",
                        "記錄的影片已重新錄製",
                        [
                            { text: "返回歷史記錄", onPress: () => router.replace("/(tabs)/history") }
                        ]
                    );
                } else {
                    throw new Error(result.error);
                }
            } else {
                // 新增模式
                const location = await getCurrentLocation();

                const moodData = {
                    moodScore: selectedMood.score,
                    videoPath: videoUri,
                    latitude: location?.latitude,
                    longitude: location?.longitude,
                    locationAccuracy: location?.accuracy
                };

                // 1. 保存到本地 SQLite
                const result = await insertMoodRecord(moodData);

                // 2. 同時上傳到 Backend（可選，不影響本地保存）
                uploadToBackend(moodData);

                if (result.success) {
                    Alert.alert(
                        "記錄成功！",
                        "你的心情 Vlog 已儲存",
                        [
                            { text: "返回首頁", onPress: () => router.replace("/(tabs)") }
                        ]
                    );
                } else {
                    throw new Error(result.error);
                }
            }
        } catch (error) {
            console.error('❌ Error saving record:', error);
            Alert.alert("❌ 儲存失敗", error.message);
        } finally {
            setIsProcessing(false);
        }
    };


    const MOOD_OPTIONS = [
        { score: 1, icon: 'emoticon-sad', iconOutline: 'emoticon-sad-outline', label: 'Sad' },
        { score: 2, icon: 'emoticon-confused', iconOutline: 'emoticon-confused-outline', label: 'Bad' },
        { score: 3, icon: 'emoticon-neutral', iconOutline: 'emoticon-neutral-outline', label: 'Neutral' },
        { score: 4, icon: 'emoticon-happy', iconOutline: 'emoticon-happy-outline', label: 'Good' },
        { score: 5, icon: 'emoticon-excited', iconOutline: 'emoticon-excited-outline', label: 'Great' },
    ];

    if (!permission) return <View />;

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center', marginTop: 50, color: 'white' }}>我们需要您的相機權限來錄製心情 Vlog</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.button}>
                    <Text style={styles.buttonText}>授予權限</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Fixed Header - Only show on recording step */}
            {step === 'recording' && (
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Header for selection step */}
            {step === 'selection' && (
                <View style={styles.header}>
                    <View style={{ width: 80 }} />
                    <Text style={styles.headerTitle}>記錄心情</Text>
                    <View style={{ width: 80 }} />
                </View>
            )}

            <ScrollView contentContainerStyle={styles.contentContainer}>
                {/* STEP 1: RECORDING */}
                {step === 'recording' && (
                    <>
                        <Animated.View style={[
                            styles.cameraContainer,
                            {
                                width: animWidth,
                                height: animHeight,
                                borderRadius: animRadius,
                                borderWidth: animBorderWidth,
                            }
                        ]}>
                            <CameraView
                                style={styles.camera}
                                facing={facing}
                                mode="video"
                                zoom={zoom}
                                ref={cameraRef}
                            />
                            {/* Recording Overlay - outside CameraView */}
                            {isRecording && (
                                <View style={styles.recordingOverlay}>
                                    <View style={styles.recordingDot} />
                                    <Text style={styles.recordingText}>REC {recordingDuration}s</Text>
                                </View>
                            )}
                            {/* Camera Controls - outside CameraView */}
                            <View style={styles.cameraControls}>
                                <TouchableOpacity
                                    style={styles.flipButton}
                                    onPress={toggleCameraFacing}
                                    disabled={isRecording}
                                >
                                    <Ionicons name="camera-reverse-outline" size={28} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </Animated.View>

                        {/* Zoom Controls */}
                        <View style={styles.zoomContainer}>
                            <TouchableOpacity
                                onPress={() => setZoom(Math.max(0, zoom - 0.1))}
                                disabled={isRecording}
                                style={styles.zoomButton}
                            >
                                <Ionicons name="remove" size={24} color={zoom > 0 ? "#FFF" : "#444"} />
                            </TouchableOpacity>

                            <View style={styles.zoomIndicator}>
                                <View style={styles.zoomTrack}>
                                    <View style={[styles.zoomProgress, { width: `${zoom * 100}%` }]} />
                                </View>
                                <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => setZoom(Math.min(1, zoom + 0.1))}
                                disabled={isRecording}
                                style={styles.zoomButton}
                            >
                                <Ionicons name="add" size={24} color={zoom < 1 ? "#FFF" : "#444"} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.buttonContainer}>
                            {isRecording ? (
                                <TouchableOpacity
                                    style={styles.stopButton}
                                    onPress={stopRecording}
                                >
                                    <View style={styles.stopButtonInner} />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={styles.recordButton}
                                    onPress={startRecording}
                                >
                                    <View style={styles.recordButtonOuter}>
                                        <View style={styles.recordButtonInner} />
                                    </View>
                                </TouchableOpacity>
                            )}
                            <Text style={styles.recordHint}>
                                {isRecording ? "輕觸停止" : "輕觸開始錄影"}
                            </Text>
                        </View>
                    </>
                )}

                {/* STEP 2: MOOD SELECTION (Redesigned) */}
                {step === 'selection' && (
                    <View style={styles.selectionContainer}>
                        {/* Video Preview (Circular) */}
                        <View style={styles.previewContainer}>
                            <VideoView
                                player={player}
                                style={styles.videoPreview}
                                nativeControls={false}
                            />
                        </View>

                        {/* Title */}
                        <Text style={styles.selectionTitle}>How do you feel today?</Text>

                        {/* Mood Selection (Horizontal Scroll) */}
                        <View style={styles.moodScrollContainer}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.moodScrollContent}
                            >
                                {MOOD_OPTIONS.map((mood) => {
                                    const isSelected = selectedMood?.score === mood.score;
                                    return (
                                        <TouchableOpacity
                                            key={mood.score}
                                            style={[
                                                styles.moodPill,
                                                isSelected && styles.moodPillSelected
                                            ]}
                                            onPress={() => handleMoodSelect(mood)}
                                        >
                                            <MaterialCommunityIcons
                                                name={isSelected ? mood.icon : mood.iconOutline}
                                                size={32}
                                                color={isSelected ? "#000" : "#FFF"}
                                            />
                                            <Text style={[
                                                styles.moodPillText,
                                                isSelected && styles.moodPillTextSelected
                                            ]}>
                                                {mood.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* Bottom Action Bar */}
                        <View style={styles.bottomActionBar}>
                            {/* Skip Button */}
                            <TouchableOpacity
                                style={styles.skipButton}
                                onPress={() => router.replace("/(tabs)")}
                            >
                                <Text style={styles.skipButtonText}>Skip</Text>
                            </TouchableOpacity>

                            {/* Next Button */}
                            <TouchableOpacity
                                style={[
                                    styles.nextButton,
                                    !selectedMood && styles.nextButtonDisabled
                                ]}
                                onPress={handleSaveRecord}
                                disabled={!selectedMood || isProcessing}
                            >
                                {isProcessing ? (
                                    <ActivityIndicator color="#000" />
                                ) : (
                                    <Text style={styles.nextButtonText}>Next</Text>
                                )}
                                <Ionicons name="arrow-forward" size={20} color={selectedMood ? "#000" : "#666"} style={{ marginLeft: 8 }} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    contentContainer: {
        flexGrow: 1,
        alignItems: 'center',
        paddingVertical: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 15,
        backgroundColor: '#000',
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
        textAlign: 'center',
    },
    headerTitleContainer: {
        alignItems: 'center',
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
    },
    cameraContainer: {
        // Styles handled by Animation
        overflow: 'hidden',
        marginBottom: 32,
        backgroundColor: '#000',
        position: 'relative',
        alignSelf: 'center',
        marginTop: 20,
    },
    camera: {
        flex: 1,
    },
    recordingOverlay: {
        position: 'absolute',
        top: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ff4444',
        marginRight: 8,
    },
    recordingText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    buttonContainer: {
        alignItems: 'center',
        gap: 20,
        marginTop: 40,
    },
    recordButton: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordButtonOuter: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FF4444',
    },
    stopButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    stopButtonInner: {
        width: 30,
        height: 30,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
    },
    recordHint: {
        fontSize: 14,
        color: '#888',
        marginTop: 10,
    },
    cameraControls: {
        position: 'absolute',
        top: 20,
        right: 20,
        flexDirection: 'column',
        gap: 12,
    },
    flipButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    zoomContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginTop: 20,
        marginBottom: 10,
        paddingHorizontal: 30,
    },
    zoomButton: {
        padding: 8,
    },
    zoomIndicator: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    zoomText: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
    },
    zoomTrack: {
        width: '100%',
        height: 4,
        backgroundColor: '#333',
        borderRadius: 2,
        overflow: 'hidden',
    },
    zoomProgress: {
        height: 4,
        backgroundColor: '#FFFFFF',
        borderRadius: 2,
    },

    // Selection Screen Styles
    selectionContainer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 40,
    },
    previewContainer: {
        width: 200,
        height: 200,
        borderRadius: 100,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#00E5FF',
        marginBottom: 30,
        marginTop: 20,
        shadowColor: "#00E5FF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    videoPreview: {
        width: '100%',
        height: '100%',
    },
    selectionTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    moodScrollContainer: {
        height: 120,
        marginBottom: 40,
    },
    moodScrollContent: {
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    moodPill: {
        width: 80,
        height: 100,
        backgroundColor: '#1A1A1A',
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8,
        borderWidth: 1,
        borderColor: '#333',
    },
    moodPillSelected: {
        backgroundColor: '#00E5FF', // Blue for selected
        borderColor: '#00E5FF',
        transform: [{ scale: 1.1 }],
    },
    moodPillText: {
        color: '#888',
        marginTop: 12,
        fontSize: 14,
        fontWeight: '600',
    },
    moodPillTextSelected: {
        color: '#000',
    },
    bottomActionBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 40,
    },
    skipButton: {
        padding: 16,
    },
    skipButtonText: {
        color: '#888',
        fontSize: 18,
        fontWeight: '500',
    },
    nextButton: {
        backgroundColor: '#FFF',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
    },
    nextButtonDisabled: {
        backgroundColor: '#333',
    },
    nextButtonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
