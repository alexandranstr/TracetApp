import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Dimensions,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Image,
    Modal,
    FlatList
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { getAuth } from '@react-native-firebase/auth';

const { width, height } = Dimensions.get('window');
const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

const COUNTRIES = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria',
    'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin',
    'Bolivia', 'Bosnia and Herzegovina', 'Brazil', 'Bulgaria', 'Cambodia', 'Cameroon', 'Canada', 'Chile',
    'China', 'Colombia', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Dominican Republic',
    'Ecuador', 'Egypt', 'Estonia', 'Ethiopia', 'Finland', 'France', 'Georgia', 'Germany', 'Ghana', 'Greece',
    'Guatemala', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel',
    'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Latvia', 'Lebanon', 'Lithuania',
    'Luxembourg', 'Malaysia', 'Malta', 'Mexico', 'Moldova', 'Monaco', 'Montenegro', 'Morocco', 'Netherlands',
    'New Zealand', 'Nigeria', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Panama', 'Paraguay', 'Peru',
    'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Saudi Arabia', 'Serbia', 'Singapore', 'Slovakia',
    'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sweden', 'Switzerland', 'Thailand',
    'Tunisia', 'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Vietnam'
];

export default function OnboardingSetupScreen({ navigation }: any) {
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [homeCountry, setHomeCountry] = useState('');
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
    const [searchCountry, setSearchCountry] = useState('');

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need photo library permissions to let you upload a profile picture.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setPhotoUri(result.assets[0].uri);
        }
    };

    const handleSaveProfile = async () => {
        if (!fullName.trim()) {
            Alert.alert('Full Name Required', 'Please enter your full name.');
            return;
        }

        const cleanUsername = username.trim().toLowerCase();
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(cleanUsername)) {
            Alert.alert('Invalid Username', 'Username must be 3–20 characters long and contain only letters, numbers, and underscores.');
            return;
        }

        if (!homeCountry) {
            Alert.alert('Home Country Required', 'Please select your home country from the list.');
            return;
        }

        try {
            setLoading(true);
            const currentUser = getAuth().currentUser;
            if (!currentUser) throw new Error('No authenticated user session found.');

            const idToken = await currentUser.getIdToken(true);

            const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    displayName: fullName.trim(),
                    username: cleanUsername,
                    homeCountry: homeCountry,
                    photoUrl: photoUri,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Could not complete profile setup.');
            }

            navigation.navigate('MainTab');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong while setting up your profile.');
        } finally {
            setLoading(false);
        }
    };

    const filteredCountries = COUNTRIES.filter(country =>
        country.toLowerCase().includes(searchCountry.toLowerCase())
    );

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" />

            {}
            <View style={styles.backgroundContainer} pointerEvents="none">
                <Svg height={height} width={width} viewBox={`0 0 ${width} ${height}`}>
                    <Path d={`M -50 ${height * 0.22} C ${width * 0.35} ${height * 0.18}, ${width * 0.45} ${height * 0.42}, ${width + 50} ${height * 0.48}`} stroke="#EFEAE1" strokeWidth="2.8" strokeOpacity="0.18" fill="none" />
                    <Path d={`M ${width * 0.38} ${height * 0.28} C ${width * 0.65} ${height * 0.32}, ${width * 0.75} ${height * 0.45}, ${width + 50} ${height * 0.58}`} stroke="#EFEAE1" strokeWidth="1.6" strokeOpacity="0.14" fill="none" />
                    <Path d={`M -50 ${height * 0.70} C ${width * 0.3} ${height * 0.65}, ${width * 0.6} ${height * 0.85}, ${width + 50} ${height * 0.78}`} stroke="#EFEAE1" strokeWidth="2.2" strokeOpacity="0.16" fill="none" />
                    <Path d={`M ${width * 0.15} -20 L ${width * 0.85} ${height + 20}`} stroke="#EFEAE1" strokeWidth="2" strokeOpacity="0.15" fill="none" />
                    <Path d={`M ${width * 0.8} -20 L ${width * 0.1} ${height + 20}`} stroke="#EFEAE1" strokeWidth="1.5" strokeOpacity="0.12" fill="none" />
                    <Path d={`M ${width * 0.4} -20 L ${width * 0.95} ${height + 20}`} stroke="#EFEAE1" strokeWidth="1.8" strokeOpacity="0.14" fill="none" />
                    <Path d={`M -20 ${height * 0.15} L ${width + 20} ${height * 0.35}`} stroke="#EFEAE1" strokeWidth="1.5" strokeOpacity="0.12" fill="none" />
                    <Path d={`M -20 ${height * 0.48} L ${width + 20} ${height * 0.62}`} stroke="#EFEAE1" strokeWidth="1.8" strokeOpacity="0.14" fill="none" />
                    <Path d={`M -20 ${height * 0.65} L ${width + 20} ${height * 0.8}`} stroke="#EFEAE1" strokeWidth="2" strokeOpacity="0.15" fill="none" />
                </Svg>
            </View>

            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        bounces={true}
                    >
                        <View style={styles.headerContainer}>
                            <Text style={styles.title}>COMPLETE PROFILE</Text>
                            <Text style={styles.subtitle}>SET UP YOUR TRAVEL IDENTITY</Text>
                        </View>

                        {}
                        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} activeOpacity={0.8}>
                            {photoUri ? (
                                <Image source={{ uri: photoUri }} style={styles.avatarImage} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                        <Circle cx="12" cy="13" r="4" />
                                    </Svg>
                                    <Text style={styles.avatarText}>ADD PHOTO</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={styles.formContainer}>
                            {}
                            <View style={styles.inputWrapper}>
                                <Text style={styles.label}>FULL NAME</Text>
                                <TextInput
                                    style={styles.input}
                                    value={fullName}
                                    onChangeText={setFullName}
                                />
                            </View>

                            {}
                            <View style={styles.inputWrapper}>
                                <Text style={styles.label}>USERNAME</Text>
                                <TextInput
                                    style={styles.input}
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>

                            {}
                            <View style={styles.inputWrapper}>
                                <Text style={styles.label}>HOME COUNTRY</Text>
                                <TouchableOpacity
                                    style={styles.input}
                                    activeOpacity={0.7}
                                    onPress={() => setIsCountryModalVisible(true)}
                                >
                                    <Text style={homeCountry ? styles.inputText : styles.placeholderText}>
                                        {homeCountry || 'Select your country'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.primaryButton, loading && { opacity: 0.6 }]}
                                activeOpacity={0.85}
                                disabled={loading}
                                onPress={handleSaveProfile}
                            >
                                <Text style={styles.primaryButtonText}>
                                    {loading ? 'Saving...' : 'Start Tracing'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {}
            <Modal
                visible={isCountryModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsCountryModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Select Country</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search..."
                            placeholderTextColor="#64748B"
                            value={searchCountry}
                            onChangeText={setSearchCountry}
                        />
                        <FlatList
                            data={filteredCountries}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.countryItem}
                                    onPress={() => {
                                        setHomeCountry(item);
                                        setIsCountryModalVisible(false);
                                        setSearchCountry('');
                                    }}
                                >
                                    <Text style={styles.countryText}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity
                            style={styles.closeModalButton}
                            onPress={() => setIsCountryModalVisible(false)}
                        >
                            <Text style={styles.closeModalText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#0D0E12',
    },
    backgroundContainer: {
        ...StyleSheet.absoluteFill,
        zIndex: 1,
    },
    safeArea: {
        flex: 1,
        zIndex: 10,
        elevation: 10,
    },
    scrollContent: {
        paddingHorizontal: 28,
        paddingTop: height * 0.08,
        paddingBottom: 60,
        alignItems: 'center',
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontFamily: 'System',
        fontSize: 22,
        fontWeight: '800',
        color: '#E2E8F0',
        letterSpacing: 2,
        textAlign: 'center',
        marginBottom: 6,
    },
    subtitle: {
        fontFamily: 'System',
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
        letterSpacing: 1.5,
        textAlign: 'center',
    },
    avatarContainer: {
        marginBottom: 28,
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: '#FF4B82',
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(239, 234, 225, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    avatarText: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    formContainer: {
        width: '100%',
        alignItems: 'center',
        gap: 20,
    },
    inputWrapper: {
        width: '100%',
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 1.2,
        marginBottom: 8,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(239, 234, 225, 0.15)',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: '#FFFFFF',
        fontSize: 15,
        justifyContent: 'center',
    },
    inputText: {
        color: '#FFFFFF',
        fontSize: 15,
    },
    placeholderText: {
        color: '#64748B',
        fontSize: 15,
    },
    primaryButton: {
        backgroundColor: '#FF4B82',
        width: '72%',
        paddingVertical: 14,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 14,
        shadowColor: '#FF4B82',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 5,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    modalContainer: {
        backgroundColor: '#1E293B',
        borderRadius: 20,
        padding: 20,
        maxHeight: height * 0.7,
    },
    modalTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    searchInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: '#FFFFFF',
        marginBottom: 12,
    },
    countryItem: {
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    countryText: {
        color: '#E2E8F0',
        fontSize: 15,
    },
    closeModalButton: {
        marginTop: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    closeModalText: {
        color: '#FF4B82',
        fontWeight: '600',
    },
});