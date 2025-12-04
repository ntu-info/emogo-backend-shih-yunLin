import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function TabBar({ state, descriptors, navigation }) {
    const router = useRouter();

    const focusedRoute = state.routes[state.index];
    const focusedDescriptor = descriptors[focusedRoute.key];
    const focusedOptions = focusedDescriptor.options;

    if (focusedOptions.tabBarStyle?.display === 'none') {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>


                {/* History Tab */}
                <TouchableOpacity
                    style={styles.tabButton}
                    onPress={() => navigation.navigate('history')}
                >
                    <Ionicons
                        name={state.index === 1 ? "time" : "time-outline"}
                        size={28}
                        color={state.index === 1 ? "#00E5FF" : "#FFFFFF"}
                    />
                    <Text style={[styles.tabLabel, state.index === 1 && styles.tabLabelActive]}>歷史</Text>
                </TouchableOpacity>

                {/* Center Home Button */}
                <TouchableOpacity
                    style={styles.recordButtonContainer}
                    onPress={() => navigation.navigate('index')}
                >
                    <View style={styles.recordButton}>
                        <Ionicons name={state.index === 0 ? "home" : "home-outline"} size={32} color="#00E5FF" />
                    </View>
                </TouchableOpacity>

                {/* Settings Tab */}
                <TouchableOpacity
                    style={styles.tabButton}
                    onPress={() => navigation.navigate('settings')}
                >
                    <Ionicons
                        name={state.index === 2 ? "settings" : "settings-outline"}
                        size={28}
                        color={state.index === 2 ? "#00E5FF" : "#FFFFFF"}
                    />
                    <Text style={[styles.tabLabel, state.index === 2 && styles.tabLabelActive]}>設定</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
        alignItems: 'center',
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#050505',
        width: '100%',
        paddingBottom: 30, // Safe area padding
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#333',
        height: 90,
    },
    tabButton: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    tabLabel: {
        fontSize: 10,
        color: '#888',
        marginTop: 4,
    },
    tabLabelActive: {
        color: '#00E5FF',
        fontWeight: 'bold',
    },
    recordButtonContainer: {
        top: -20, // Float above
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#000',
        borderWidth: 2,
        borderColor: '#00E5FF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#00E5FF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 5,
    },
    recordButtonIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#000',
        borderWidth: 2,
        borderColor: 'rgba(0, 229, 255, 0.5)',
    },
});
