import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    TextInput,
    Alert,
    Image,
    ActivityIndicator,
    Modal,
    Linking,
    Clipboard,
    Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    getAuth,
    signOut,
    updatePassword,
    deleteUser,
    PhoneAuthProvider,
    signInWithCredential,
    signInWithPhoneNumber,
    linkWithCredential 
} from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import CountryPicker, { Country, CountryCode } from 'react-native-country-picker-modal';
import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE_URL } from '../config';

const PINK_ACCENT = '#FF2D55';
const DARK_BG = '#1C1C1E';
const CARD_BG = '#2C2C2E';

interface ProfileSettingsProps {
    currentUserId: string | null;
    navigation: any;
}

export default function ProfileSettings({ currentUserId, navigation }: ProfileSettingsProps) {
    const [loading, setLoading] = useState(true);
    const [savingPhone, setSavingPhone] = useState(false);

    const [userData, setUserData] = useState<{
        displayName?: string;
        username?: string;
        email?: string;
        photoUrl?: string;
        phoneNumber?: string;
        isTwoFactorEnabled?: boolean;
        isPhoneVerified?: boolean;
    }>({});

    const [isPhoneModalVisible, setIsPhoneModalVisible] = useState(false);
    const [countryCode, setCountryCode] = useState<CountryCode>('RO');
    const [callingCode, setCallingCode] = useState('40');
    const [rawPhoneNumber, setRawPhoneNumber] = useState('');
    const [pendingPhoneNumber, setPendingPhoneNumber] = useState('');

    const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [confirmResult, setConfirmResult] = useState<any>(null);
    const [verifyingCode, setVerifyingCode] = useState(false);

    const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);
    const [editDisplayName, setEditDisplayName] = useState('');
    const [editUsername, setEditUsername] = useState('');
    const [updatingProfile, setUpdatingProfile] = useState(false);

    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);
    const [isSupportModalVisible, setIsSupportModalVisible] = useState(false);

    const getResolvedPhotoUri = (photoPath?: string) => {
        if (!photoPath) return null;
        if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
            return photoPath;
        }
        const fileName = photoPath.split('/').pop();
        return `${FileSystem.documentDirectory}${fileName}`;
    };

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const currentUser = getAuth().currentUser;
                if (!currentUser) return;

                const idToken = await currentUser.getIdToken();
                const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                    headers: { 'Authorization': `Bearer ${idToken}` },
                });

                if (res.ok) {
                    const data = await res.json();
                    setUserData({
                        displayName: data.displayName || currentUser.displayName || 'Traveler',
                        username: data.username || '',
                        email: currentUser.email || data.email || 'No email',
                        photoUrl: data.photoUrl || currentUser.photoURL || '',
                        phoneNumber: data.phoneNumber || '',
                        isTwoFactorEnabled: data.isTwoFactorEnabled || false,
                        isPhoneVerified: data.isPhoneVerified || false,
                    });
                    setEditDisplayName(data.displayName || currentUser.displayName || '');
                    setEditUsername(data.username || '');
                }
            } catch (err) {
                console.log('Error fetching profile:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [currentUserId]);

    const handleOpenPhoneModal = () => {
        const existingNumber = userData.phoneNumber || '';
        if (existingNumber.startsWith('+')) {
            setRawPhoneNumber(existingNumber.replace(/^\+\d{1,4}/, ''));
        } else {
            setRawPhoneNumber(existingNumber);
        }
        setIsPhoneModalVisible(true);
    };

    const onSelectCountry = (country: Country) => {
        setCountryCode(country.cca2);
        if (country.callingCode && country.callingCode.length > 0) {
            setCallingCode(country.callingCode[0]);
        }
    };

    const handleSendVerificationCode = async () => {
        let cleanedInput = rawPhoneNumber.trim().replace(/\s+/g, '');

        if (!cleanedInput) {
            Alert.alert('Invalid Input', 'Please enter a valid phone number.');
            return;
        }

        if (cleanedInput.startsWith('0')) {
            cleanedInput = cleanedInput.substring(1);
        }

        const formattedPhone = cleanedInput.startsWith('+')
            ? cleanedInput
            : `+${callingCode}${cleanedInput}`;

        try {
            setSavingPhone(true);
            getAuth().settings.appVerificationDisabledForTesting = true;
            const confirmation = await signInWithPhoneNumber(getAuth(), formattedPhone);

            setConfirmResult(confirmation);
            setPendingPhoneNumber(formattedPhone);
            setIsPhoneModalVisible(false);
            setIsVerificationModalVisible(true);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Could not send verification SMS.');
        } finally {
            setSavingPhone(false);
        }
    };

    const handleConfirmVerificationCode = async () => {
        if (!verificationCode || verificationCode.length < 6) {
            Alert.alert('Invalid Code', 'Please enter the 6-digit code received via SMS.');
            return;
        }

        try {
            setVerifyingCode(true);
            const credential = PhoneAuthProvider.credential(
                confirmResult.verificationId,
                verificationCode
            );

            const currentUser = getAuth().currentUser;
            if (!currentUser) throw new Error('No user authenticated.');

            try {
                await linkWithCredential(currentUser, credential);
            } catch (linkError: any) {
                if (linkError.code !== 'auth/provider-already-linked') {
                    throw linkError;
                }
            }

            const phoneToSend = pendingPhoneNumber;
            if (!phoneToSend) {
                throw new Error('Phone number is missing.');
            }

            const idToken = await currentUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({ phoneNumber: phoneToSend }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.log('Server error details:', errorData);
                throw new Error('Failed to update phone number on server.');
            }

            setUserData(prev => ({
                ...prev,
                phoneNumber: phoneToSend,
                isPhoneVerified: true
            }));
            setIsVerificationModalVisible(false);
            setVerificationCode('');
            Alert.alert('Success', 'Phone number verified and saved successfully!');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Invalid verification code.');
        } finally {
            setVerifyingCode(false);
        }
    };

    const handleToggle2FA = async (value: boolean) => {
        if (value && (!userData.phoneNumber || !userData.isPhoneVerified)) {
            Alert.alert('Phone Required', 'Please add and verify a phone number before enabling 2FA.', [
                { text: 'Add Phone', onPress: handleOpenPhoneModal },
                { text: 'Cancel', style: 'cancel' }
            ]);
            return;
        }

        try {
            const currentUser = getAuth().currentUser;
            if (!currentUser) return;
            const idToken = await currentUser.getIdToken();

            const response = await fetch(`${API_BASE_URL}/api/auth/toggle-2fa`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({ enable: value }),
            });

            const data = await response.json();
            if (response.ok) {
                setUserData(prev => ({ ...prev, isTwoFactorEnabled: data.isTwoFactorEnabled }));
                Alert.alert('Success', `2FA has been ${value ? 'enabled' : 'disabled'}.`);
            } else {
                Alert.alert('Error', data.message || 'Could not update 2FA setting.');
            }
        } catch (err) {
            Alert.alert('Error', 'Could not update 2FA setting.');
        }
    };

    const handlePickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert('Permission Required', 'You need to grant permission to access your photo library.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled && result.assets[0]?.uri) {
            const pickerUri = result.assets[0].uri;
            const fileName = `profile_${Date.now()}.jpg`;
            const permanentUri = `${FileSystem.documentDirectory}${fileName}`;

            try {
                await FileSystem.copyAsync({
                    from: pickerUri,
                    to: permanentUri,
                });
                savePhotoUrl(fileName);
            } catch (err) {
                console.log('Error saving image locally:', err);
                Alert.alert('Error', 'Could not save photo locally.');
            }
        }
    };

    const savePhotoUrl = async (fileName: string) => {
        try {
            const currentUser = getAuth().currentUser;
            if (!currentUser) return;

            const idToken = await currentUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({ photoUrl: fileName }),
            });

            if (response.ok) {
                setUserData((prev) => ({ ...prev, photoUrl: fileName }));
                Alert.alert('Success', 'Profile photo updated!');
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to update profile photo.');
        }
    };

    const handleUpdateProfile = async () => {
        if (!editDisplayName.trim() || !editUsername.trim()) {
            Alert.alert('Error', 'Display Name and Username cannot be empty.');
            return;
        }

        try {
            setUpdatingProfile(true);
            const currentUser = getAuth().currentUser;
            if (!currentUser) return;

            const idToken = await currentUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    displayName: editDisplayName.trim(),
                    username: editUsername.trim(),
                }),
            });

            const data = await response.json();
            if (response.ok) {
                setUserData((prev) => ({
                    ...prev,
                    displayName: editDisplayName.trim(),
                    username: data.username || editUsername.trim(),
                }));
                setIsEditProfileVisible(false);
                Alert.alert('Success', 'Profile updated successfully!');
            } else {
                Alert.alert('Error', data.message || 'Failed to update profile.');
            }
        } catch (error) {
            Alert.alert('Error', 'Could not update profile info.');
        } finally {
            setUpdatingProfile(false);
        }
    };

    const handleContactSupport = async () => {
        const email = 'alexandranistor735@yahoo.com';
        const subject = 'Support Request - Tracet App';
        const url = `mailto:${email}?subject=${encodeURIComponent(subject)}`;

        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                setIsSupportModalVisible(true);
            }
        } catch {
            setIsSupportModalVisible(true);
        }
    };

    const handleCopyEmail = () => {
        Clipboard.setString('alexandranistor735@yahoo.com');
        Alert.alert('Copied!', 'Support email address copied to clipboard.');
        setIsSupportModalVisible(false);
    };

    const validatePassword = (pwd: string) => {
        const hasUpperCase = /[A-Z]/.test(pwd);
        const hasNumber = /[0-9]/.test(pwd);
        const isLongEnough = pwd.length >= 6;

        if (!isLongEnough) return 'Password must be at least 6 characters long.';
        if (!hasUpperCase) return 'Password must contain at least one uppercase letter (A-Z).';
        if (!hasNumber) return 'Password must contain at least one number (0-9).';
        return null;
    };

    const handleChangePassword = async () => {
        const errorMsg = validatePassword(newPassword);
        if (errorMsg) {
            Alert.alert('Weak Password', errorMsg);
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match.');
            return;
        }

        try {
            setUpdatingPassword(true);
            const user = getAuth().currentUser;
            if (user) {
                await updatePassword(user, newPassword);
                Alert.alert('Success', 'Password updated successfully!');
                setIsPasswordModalVisible(false);
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update password.');
        } finally {
            setUpdatingPassword(false);
        }
    };

    const handleSignOut = async () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await AsyncStorage.removeItem('userProfile');
                        await signOut(getAuth());
                    } catch (err) {
                        console.log('Error signing out:', err);
                        Alert.alert('Error', 'Failed to sign out. Please try again.');
                    }
                },
            },
        ]);
    };

    const handleDeleteAccount = async () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to permanently delete your account? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const currentUser = getAuth().currentUser;
                            if (!currentUser) return;

                            const idToken = await currentUser.getIdToken();

                            const response = await fetch(`${API_BASE_URL}/api/auth/account`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${idToken}` },
                            });

                            if (!response.ok) {
                                throw new Error('Failed to delete account data from server.');
                            }

                            await deleteUser(currentUser);
                            await AsyncStorage.clear();

                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Welcome' }],
                            });

                            Alert.alert('Account Deleted', 'Your account has been deleted.');
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Requires recent login. Please log out and back in before deleting your account.');
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={PINK_ACCENT} />
            </SafeAreaView>
        );
    }

    const resolvedPhotoUri = getResolvedPhotoUri(userData.photoUrl);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                <View style={styles.profileHeader}>
                    <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickImage} activeOpacity={0.8}>
                        {resolvedPhotoUri ? (
                            <Image source={{ uri: resolvedPhotoUri }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={44} color="#8E8E93" />
                            </View>
                        )}
                        <View style={styles.editBadge}>
                            <Ionicons name="camera" size={14} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.displayName}>{userData.displayName}</Text>
                    <Text style={styles.username}>@{userData.username || 'username'}</Text>

                    <TouchableOpacity style={styles.editProfileBtn} onPress={() => setIsEditProfileVisible(true)}>
                        <Text style={styles.editProfileBtnText}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ACCOUNT INFO</Text>

                    <View style={styles.inputCard}>
                        <Ionicons name="mail" size={20} color={PINK_ACCENT} style={styles.fieldIcon} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Email</Text>
                            <Text style={styles.fieldValue}>{userData.email}</Text>
                        </View>
                    </View>

                    <View style={styles.inputCard}>
                        <Ionicons name="call" size={20} color={PINK_ACCENT} style={styles.fieldIcon} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Phone Number</Text>
                            <Text style={[styles.fieldValue, !userData.phoneNumber && { color: '#8E8E93' }]}>
                                {userData.phoneNumber && userData.phoneNumber.trim().length > 0
                                    ? `${userData.phoneNumber} ${userData.isPhoneVerified ? '✓' : '(Unverified)'}`
                                    : 'Not provided'}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.saveBadge} onPress={handleOpenPhoneModal}>
                            <Text style={styles.saveBadgeText}>
                                {userData.phoneNumber && userData.phoneNumber.trim().length > 0 ? 'Change' : 'Add'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SECURITY</Text>

                    <TouchableOpacity style={styles.actionRow} onPress={() => setIsPasswordModalVisible(true)}>
                        <Ionicons name="key" size={20} color="#FFFFFF" />
                        <Text style={styles.actionText}>Change Password</Text>
                        <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
                    </TouchableOpacity>

                    <View style={styles.actionRow}>
                        <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
                        <Text style={styles.actionText}>Two-Factor Authentication (SMS)</Text>
                        <Switch
                            value={userData.isTwoFactorEnabled || false}
                            onValueChange={handleToggle2FA}
                            trackColor={{ false: '#3A3A3C', true: PINK_ACCENT }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SUPPORT</Text>

                    <TouchableOpacity style={styles.actionRow} onPress={handleContactSupport}>
                        <Ionicons name="mail-unread" size={20} color="#FFFFFF" />
                        <Text style={styles.actionText}>Help & Contact Support</Text>
                        <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ACCOUNT ACTIONS</Text>

                    <TouchableOpacity style={styles.actionRow} onPress={handleSignOut}>
                        <Ionicons name="log-out" size={20} color={PINK_ACCENT} />
                        <Text style={[styles.actionText, { color: PINK_ACCENT }]}>Sign Out</Text>
                        <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionRow} onPress={handleDeleteAccount}>
                        <Ionicons name="trash" size={20} color="#FF3B30" />
                        <Text style={[styles.actionText, { color: '#FF3B30' }]}>Delete Account</Text>
                        <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <Modal visible={isPhoneModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {userData.phoneNumber && userData.phoneNumber.trim().length > 0
                                ? 'Change Phone Number'
                                : 'Add Phone Number'}
                        </Text>

                        <Text style={styles.inputLabel}>Phone Number</Text>

                        <View style={styles.phoneInputRow}>
                            <View style={styles.countryPickerBadge}>
                                <CountryPicker
                                    countryCode={countryCode}
                                    withFilter
                                    withFlag
                                    withCallingCode
                                    withCallingCodeButton
                                    onSelect={onSelectCountry}
                                    theme={{
                                        backgroundColor: DARK_BG,
                                        onBackgroundTextColor: '#FFFFFF',
                                        fontSize: 16,
                                        filterPlaceholderTextColor: '#8E8E93',
                                        activeOpacity: 0.7,
                                        itemHeight: 50,
                                    }}
                                />
                            </View>

                            <TextInput
                                style={styles.phoneTextInput}
                                placeholder="745 764 399"
                                placeholderTextColor="#8E8E93"
                                keyboardType="phone-pad"
                                value={rawPhoneNumber}
                                onChangeText={setRawPhoneNumber}
                            />
                        </View>

                        <TouchableOpacity style={styles.primaryBtn} onPress={handleSendVerificationCode} disabled={savingPhone}>
                            {savingPhone ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={styles.primaryBtnText}>Send SMS Code</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsPhoneModalVisible(false)}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={isVerificationModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Verify Phone Number</Text>
                        <Text style={{ color: '#8E8E93', textAlign: 'center', marginBottom: 16, fontSize: 13 }}>
                            Enter the 6-digit code sent via SMS to your phone.
                        </Text>

                        <Text style={styles.inputLabel}>Verification Code</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="123456"
                            placeholderTextColor="#8E8E93"
                            keyboardType="number-pad"
                            maxLength={6}
                            value={verificationCode}
                            onChangeText={setVerificationCode}
                        />

                        <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirmVerificationCode} disabled={verifyingCode}>
                            {verifyingCode ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={styles.primaryBtnText}>Verify & Save</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsVerificationModalVisible(false)}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={isEditProfileVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Profile Info</Text>

                        <Text style={styles.inputLabel}>Display Name</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Display Name"
                            placeholderTextColor="#8E8E93"
                            value={editDisplayName}
                            onChangeText={setEditDisplayName}
                        />

                        <Text style={styles.inputLabel}>Username</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Username"
                            placeholderTextColor="#8E8E93"
                            autoCapitalize="none"
                            value={editUsername}
                            onChangeText={setEditUsername}
                        />

                        <TouchableOpacity style={styles.primaryBtn} onPress={handleUpdateProfile} disabled={updatingProfile}>
                            <Text style={styles.primaryBtnText}>{updatingProfile ? 'Saving...' : 'Save Changes'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditProfileVisible(false)}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={isPasswordModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Change Password</Text>

                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="New Password"
                                placeholderTextColor="#8E8E93"
                                secureTextEntry={!showNewPassword}
                                value={newPassword}
                                onChangeText={setNewPassword}
                            />
                            <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                                <Ionicons name={showNewPassword ? "eye-off" : "eye"} size={20} color="#8E8E93" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Confirm New Password"
                                placeholderTextColor="#8E8E93"
                                secureTextEntry={!showConfirmPassword}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                            />
                            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#8E8E93" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.primaryBtn} onPress={handleChangePassword} disabled={updatingPassword}>
                            <Text style={styles.primaryBtnText}>{updatingPassword ? 'Updating...' : 'Update Password'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsPasswordModalVisible(false)}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={isSupportModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Contact Support</Text>
                        <Text style={{ color: '#8E8E93', textAlign: 'center', marginBottom: 16 }}>
                            For assistance, send an email to: alexandranistor735@yahoo.com
                        </Text>
                        <TouchableOpacity style={styles.primaryBtn} onPress={handleCopyEmail}>
                            <Text style={styles.primaryBtnText}>Copy Email Address</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsSupportModalVisible(false)}>
                            <Text style={styles.cancelBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: DARK_BG },
    loadingContainer: { flex: 1, backgroundColor: DARK_BG, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 20 },
    profileHeader: { alignItems: 'center', marginBottom: 24 },
    avatarWrapper: { position: 'relative', marginBottom: 12 },
    avatar: { width: 90, height: 90, borderRadius: 45 },
    avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: CARD_BG, justifyContent: 'center', alignItems: 'center' },
    editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: PINK_ACCENT, padding: 6, borderRadius: 12 },
    displayName: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
    username: { color: '#8E8E93', fontSize: 14, marginTop: 2 },
    editProfileBtn: { marginTop: 12, backgroundColor: CARD_BG, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    editProfileBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
    section: { marginBottom: 24 },
    sectionTitle: { color: '#8E8E93', fontSize: 12, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
    inputCard: { backgroundColor: CARD_BG, flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 10 },
    fieldIcon: { marginRight: 12 },
    fieldLabel: { color: '#8E8E93', fontSize: 12 },
    fieldValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '500', marginTop: 2 },
    saveBadge: { backgroundColor: PINK_ACCENT, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    saveBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
    actionRow: { backgroundColor: CARD_BG, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 10 },
    actionText: { flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '500', marginLeft: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { width: '100%', backgroundColor: CARD_BG, borderRadius: 16, padding: 20 },
    modalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
    inputLabel: { color: '#8E8E93', fontSize: 12, marginBottom: 6 },
    modalInput: { backgroundColor: DARK_BG, color: '#FFFFFF', padding: 12, borderRadius: 10, fontSize: 15, marginBottom: 16 },
    phoneInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    countryPickerBadge: { backgroundColor: DARK_BG, borderRadius: 10, paddingHorizontal: 10, height: 48, justifyContent: 'center', marginRight: 8 },
    phoneTextInput: { flex: 1, backgroundColor: DARK_BG, color: '#FFFFFF', height: 48, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: DARK_BG, borderRadius: 10, paddingHorizontal: 12, marginBottom: 12 },
    passwordInput: { flex: 1, color: '#FFFFFF', height: 48, fontSize: 15 },
    primaryBtn: { backgroundColor: PINK_ACCENT, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
    primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
    cancelBtn: { height: 44, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
    cancelBtnText: { color: '#8E8E93', fontSize: 15 }
});