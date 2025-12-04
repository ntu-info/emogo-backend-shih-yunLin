import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing, Modal, Alert, ActivityIndicator } from "react-native";
import { useRouter, useNavigation, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState, useCallback } from "react";
import { CameraView, useCameraPermissions } from 'expo-camera';
import { insertMoodRecord, updateVideoPath } from "../../database/db";
import { getCurrentLocation } from "../../utils/location";

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [cameraRef, setCameraRef] = useState(null);
  const [videoUri, setVideoUri] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facing, setFacing] = useState('front');
  const [zoom, setZoom] = useState(0);

  // Animation Values
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const textRotateAnim = useRef(new Animated.Value(0)).current;

  // Expand Animation Values
  const expandAnim = useRef(new Animated.Value(0)).current; // 0 to 1

  const [showMoodModal, setShowMoodModal] = useState(false);
  const [selectedVideoUri, setSelectedVideoUri] = useState(null);

  const timerRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: { display: isRecordingMode ? 'none' : 'flex' }
    });
  }, [isRecordingMode, navigation]);

  useFocusEffect(
    useCallback(() => {
      // Rotation Animation for Ring
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 10000, // 10 seconds for full rotation
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotate.start();

      // No rotation for text - keep it upright

      // Pulse Animation (Breathing effect)
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          })
        ])
      );
      pulse.start();

      return () => {
        rotate.stop();
        pulse.stop();
      };
    }, [isRecordingMode])
  );

  const handlePressRecord = async () => {
    if (!permission || !permission.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("需要相機權限", "請允許使用相機以錄製心情 Vlog");
        return;
      }
    }

    setIsRecordingMode(true);
    Animated.timing(expandAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false, // Width/Height animation needs false
    }).start();
  };

  const handleCloseRecord = () => {
    if (isRecording) return;

    Animated.timing(expandAnim, {
      toValue: 0,
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start(() => {
      setIsRecordingMode(false);
      setVideoUri(null);
    });
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'front' ? 'back' : 'front'));
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop Recording
      setIsRecording(false);
      clearInterval(timerRef.current);
      if (cameraRef) {
        cameraRef.stopRecording();
      }
    } else {
      // Start Recording
      if (cameraRef) {
        setIsRecording(true);
        setRecordingDuration(0);
        timerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);

        try {
          const videoData = await cameraRef.recordAsync({
            quality: '720p',
            maxDuration: 60,
            mute: false, // Enable audio recording
          });
          setVideoUri(videoData.uri);
          // Show mood selection after recording stops
          showMoodSelection(videoData.uri);
        } catch (error) {
          console.error(error);
          setIsRecording(false);
        }
      }
    }
  };

  const showMoodSelection = (uri) => {
    setSelectedVideoUri(uri);
    setShowMoodModal(true);
  };

  const closeMoodModal = () => {
    setShowMoodModal(false);
    setSelectedVideoUri(null);
    handleCloseRecord();
  };

  const selectMood = (score) => {
    setShowMoodModal(false);
    saveRecord(selectedVideoUri, score);
  };

  const API_URL = "https://emogo-backend-shih-yunlin.onrender.com";

  const saveRecord = async (uri, score) => {
    console.log('📝 Starting saveRecord...', { uri, score });
    setIsProcessing(true);
    try {
      console.log('📍 Getting location...');
      const location = await getCurrentLocation();
      console.log('📍 Location received:', location?.coords);

      const moodData = {
        moodScore: score,
        videoPath: uri,
        latitude: location?.coords?.latitude || null,
        longitude: location?.coords?.longitude || null,
        locationAccuracy: location?.coords?.accuracy || null
      };

      console.log('💾 Inserting mood record...');
      const result = insertMoodRecord({
        moodScore: score,
        videoPath: null, // Will be updated separately
        latitude: location?.coords?.latitude || null,
        longitude: location?.coords?.longitude || null,
        locationAccuracy: location?.coords?.accuracy || null
      });
      console.log('💾 Insert result:', result);

      if (result.success) {
        console.log('🎥 Updating video path for record ID:', result.id);
        await updateVideoPath(result.id, uri);
        console.log('✅ Record saved successfully!');

        // 上傳到 Backend
        console.log('🚀 開始上傳到 Backend...');
        try {
          const formData = new FormData();
          formData.append('mood_score', score.toString());
          if (moodData.latitude) formData.append('latitude', moodData.latitude.toString());
          if (moodData.longitude) formData.append('longitude', moodData.longitude.toString());
          if (moodData.locationAccuracy) formData.append('location_accuracy', moodData.locationAccuracy.toString());

          const filename = uri.split('/').pop();
          formData.append('video', {
            uri: uri,
            name: filename,
            type: 'video/mp4',
          });

          console.log(`📡 正在上傳到: ${API_URL}/api/moods`);
          const response = await fetch(`${API_URL}/api/moods`, {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          if (response.ok) {
            const backendResult = await response.json();
            console.log('✅ ✅ ✅ Backend 上傳成功！', backendResult);

            // 健康檢查
            const healthCheck = await fetch(`${API_URL}/`);
            const healthData = await healthCheck.json();
            console.log('✅ 後端健康檢查:', healthData);
          } else {
            console.log('❌ Backend 回應錯誤:', response.status);
          }
        } catch (uploadError) {
          console.error('❌ Backend 上傳失敗:', uploadError.message);
        }

        Alert.alert("記錄成功", "你的心情已儲存！");
        handleCloseRecord();
      } else {
        console.log('❌ Insert failed:', result.error);
        Alert.alert("❌ 儲存失敗", "請稍後再試");
      }
    } catch (error) {
      console.error('❌ Error in saveRecord:', error);
      Alert.alert("❌ 發生錯誤", "儲存過程中發生錯誤: " + error.message);
    } finally {
      console.log('🔚 Ending saveRecord, setting isProcessing to false');
      setIsProcessing(false);
    }
  };

  const animRadius = useRef(new Animated.Value(150)).current;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins + ":" + secs.toString().padStart(2, '0');
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const textSpin = textRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '0deg']
  });



  // Interpolations for Expand Animation
  const containerWidth = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, width - 48]
  });

  const containerHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, (width - 48) * (4 / 3)]
  });

  const containerRadius = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [150, 24]
  });

  const contentOpacity = expandAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 0, 0]
  });

  const cameraOpacity = expandAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1]
  });

  return (
    <View style={styles.container}>
      {/* Top Section */}
      {!isRecordingMode && (
        <Animated.View style={[styles.topSection, { opacity: contentOpacity }]}>
          <Text style={styles.greetingText}>How do you feel</Text>
          <Text style={styles.greetingText}>today?</Text>
        </Animated.View>
      )}

      {/* Center Section */}
      <View style={styles.centerSection}>
        {!isRecordingMode ? (
          <>
            {/* Logo - Visible when NOT recording */}
            <Animated.View style={[
              styles.swirlContainer,
              {
                width: containerWidth,
                height: containerHeight,
                borderRadius: containerRadius,
                opacity: contentOpacity,
              }
            ]}>
              <TouchableOpacity
                style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}
                onPress={handlePressRecord}
                activeOpacity={1}
              >
                {/* Outer Glow */}
                <Animated.View style={[
                  styles.swirlOuter,
                  { transform: [{ scale: pulseAnim }] }
                ]} />

                {/* Middle Swirl */}
                <Animated.View style={[
                  styles.swirlMiddle,
                  {
                    transform: [
                      { rotate: spin },
                      { scale: pulseAnim } // Add pulse to middle ring too
                    ]
                  }
                ]} />

                {/* Inner Core */}
                <Animated.View style={[
                  styles.swirlInner,
                  { transform: [{ scale: pulseAnim }] }
                ]}>
                  <Text style={styles.logoText}>EMOGO</Text>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>

            <Animated.Text style={[
              styles.tapText,
              {
                opacity: pulseAnim, // Pulse animation for text
                transform: [{ scale: pulseAnim }] // Pulse scale for text
              }
            ]}>Tap to Record</Animated.Text>
          </>
        ) : (
          <>
            {/* Camera Window with Controls - Visible when recording */}
            <View style={styles.recordingContainer}>
              {/* Close and Flip buttons above camera */}
              <View style={styles.cameraTopControls}>
                <TouchableOpacity style={styles.closeButton} onPress={handleCloseRecord}>
                  <Ionicons name="close" size={24} color="#FFF" />
                </TouchableOpacity>
                {!isRecording && (
                  <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
                    <Ionicons name="camera-reverse-outline" size={24} color="#FFF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Camera Window */}
              <Animated.View style={[styles.cameraWindow, {
                width: containerWidth,
                height: containerHeight,
                borderRadius: containerRadius,
              }]}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing={facing}
                  mode="video"
                  zoom={zoom}
                  ref={ref => setCameraRef(ref)}
                />
                {/* Recording Overlay - outside CameraView */}
                {isRecording && (
                  <View style={styles.recordingOverlay}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingText}>REC {recordingDuration}s</Text>
                  </View>
                )}
              </Animated.View>

              {/* Zoom Controls below camera */}
              {!isRecording && (
                <View style={styles.zoomContainer}>
                  <TouchableOpacity
                    onPress={() => setZoom(Math.max(0, zoom - 0.1))}
                    style={styles.zoomButton}
                  >
                    <Ionicons name="remove" size={24} color={zoom > 0 ? "#FFF" : "#666"} />
                  </TouchableOpacity>

                  <View style={styles.zoomIndicator}>
                    <View style={styles.zoomTrack}>
                      <View style={[styles.zoomProgress, { width: `${zoom * 100}%` }]} />
                    </View>
                    <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setZoom(Math.min(1, zoom + 0.1))}
                    style={styles.zoomButton}
                  >
                    <Ionicons name="add" size={24} color={zoom < 1 ? "#FFF" : "#666"} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Record Button below zoom */}
              <View style={styles.recordButtonContainer}>
                {isRecording && (
                  <View style={styles.timerContainer}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.timerText}>{formatDuration(recordingDuration)}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.recordButton, isRecording && styles.recordingButton]}
                  onPress={toggleRecording}
                >
                  <View style={[styles.recordButtonInner, isRecording && styles.recordingButtonInner]} />
                </TouchableOpacity>

                <Text style={styles.recordHint}>
                  {isRecording ? "輕觸停止" : "輕觸開始錄影"}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      {isProcessing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#00E5FF" />
          <Text style={styles.loadingText}>儲存中...</Text>
        </View>
      )}

      {/* Custom Mood Selection Modal */}
      <Modal
        visible={showMoodModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeMoodModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close Button */}
            <TouchableOpacity style={styles.modalCloseButton} onPress={closeMoodModal}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.modalTitle}>How do you feel?</Text>

            {/* Mood Options - White Minimalist Icons */}
            <View style={styles.moodOptionsContainer}>
              <TouchableOpacity
                style={styles.moodOption}
                onPress={() => selectMood(1)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="emoticon-sad-outline" size={48} color="#FFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.moodOption}
                onPress={() => selectMood(2)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="emoticon-confused-outline" size={48} color="#FFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.moodOption}
                onPress={() => selectMood(3)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="emoticon-neutral-outline" size={48} color="#FFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.moodOption}
                onPress={() => selectMood(4)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="emoticon-happy-outline" size={48} color="#FFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.moodOption}
                onPress={() => selectMood(5)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="emoticon-excited-outline" size={48} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topSection: {
    position: 'absolute',
    top: 80,
    alignItems: 'center',
    zIndex: 1,
  },
  greetingText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 229, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  swirlContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  recordingContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  cameraTopControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  cameraWindow: {
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  recordingOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 8,
  },
  recordingText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  swirlOuter: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    left: 10, // Center relative to 300 container
    top: 10,
  },
  swirlMiddle: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 4,
    borderColor: 'rgba(0, 229, 255, 0.5)',
    borderTopColor: '#00E5FF', // Bright accent for rotation effect
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(0, 229, 255, 0.5)',
    borderLeftColor: 'transparent',
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    left: 30,
    top: 30,
  },
  swirlInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 20, 30, 0.9)', // Slightly more opaque
    borderWidth: 4, // Thicker border
    borderColor: '#00E5FF',
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, // Stronger glow
    shadowRadius: 30,
    elevation: 10, // Android shadow
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00E5FF',
    letterSpacing: 4,
    textShadowColor: '#00E5FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  tapText: {
    marginTop: 60,
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  recordButtonContainer: {
    marginTop: 24,
    alignItems: 'center',
    gap: 8,
  },
  recordHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 8,
  },
  // Camera Styles
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  cameraTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'center',
    gap: 12,
  },
  zoomButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoomTrack: {
    width: 80,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  zoomProgress: {
    height: '100%',
    backgroundColor: '#00E5FF',
    borderRadius: 2,
  },
  zoomText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    width: 40,
  },
  cameraControls: {
    alignItems: 'center',
    width: '100%',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButton: {
    borderColor: '#FF4040',
  },
  recordButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF4040',
  },
  recordingButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4040',
    marginRight: 8,
  },
  timerText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    color: '#FFF',
    marginTop: 10,
    fontSize: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 24,
    width: '80%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  moodOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
  },
  moodOption: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
