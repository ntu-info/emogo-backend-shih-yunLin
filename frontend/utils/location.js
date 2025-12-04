import * as Location from 'expo-location';

/**
 * 請求位置權限
 * @returns {Promise<boolean>} 是否授予權限
 */
export const requestLocationPermissions = async () => {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
            console.log('⚠️ Location permission denied');
            return false;
        }

        console.log('✅ Location permission granted');
        return true;
    } catch (error) {
        console.error('❌ Error requesting location permission:', error);
        return false;
    }
};

/**
 * 獲取當前 GPS 位置
 * @returns {Promise<Object|null>} 位置資訊或 null
 */
export const getCurrentLocation = async () => {
    try {
        // 檢查是否在瀏覽器環境
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            // Web 版本：使用瀏覽器的 Geolocation API
            return new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const locationData = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy
                        };
                        console.log('✅ Location obtained (Web):', locationData);
                        resolve(locationData);
                    },
                    (error) => {
                        console.log('⚠️ Location denied or unavailable (Web), using mock data');
                        // 使用假座標（台北101）
                        resolve({
                            latitude: 25.0330,
                            longitude: 121.5654,
                            accuracy: 10
                        });
                    },
                    { timeout: 5000 }
                );
            });
        }

        // 原本的 expo-location 版本
        const locationPromise = (async () => {
            const hasPermission = await requestLocationPermissions();
            if (!hasPermission) {
                console.log('⚠️ Location permission denied, returning null');
                return null;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced
            });

            console.log('✅ Location obtained:', location.coords);
            return location;
        })();

        // 添加超時機制 (10秒)
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                resolve(null); // 靜默超時，不顯示警告
            }, 10000);
        });

        // 競速：誰先完成就用誰
        const result = await Promise.race([locationPromise, timeoutPromise]);
        return result;
    } catch (error) {
        console.error('❌ Error getting current location:', error);
        return null;
    }
};

/**
 * 將經緯度轉換為地址（可選功能）
 * @param {number} latitude - 緯度
 * @param {number} longitude - 經度
 */
export const getAddressFromCoords = async (latitude, longitude) => {
    try {
        const addresses = await Location.reverseGeocodeAsync({
            latitude,
            longitude
        });

        if (addresses && addresses.length > 0) {
            const address = addresses[0];
            return {
                city: address.city,
                region: address.region,
                country: address.country,
                formattedAddress: `${address.city || ''}, ${address.region || ''}`
            };
        }

        return null;
    } catch (error) {
        console.error('❌ Error getting address from coords:', error);
        return null;
    }
};

export default {
    requestLocationPermissions,
    getCurrentLocation,
    getAddressFromCoords
};
