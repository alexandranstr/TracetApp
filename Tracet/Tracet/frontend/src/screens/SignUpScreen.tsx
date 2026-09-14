import React, { useEffect, useState } from 'react';
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
    Alert
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { getAuth, signInWithCredential, GoogleAuthProvider, createUserWithEmailAndPassword } from '@react-native-firebase/auth';
import { syncUserWithBackend } from '../services/auth';

const { width, height } = Dimensions.get('window');

export default function SignUpScreen({ navigation }: any) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        });
    }, []);

    const handleSignUp = async () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

        if (!emailRegex.test(email.trim())) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }

        if (!passwordRegex.test(password)) {
            Alert.alert(
                'Weak Password',
                'Password must be at least 8 characters long and contain at least 1 uppercase letter and 1 number.'
            );
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(getAuth(), email.trim(), password);
            const dbUser = await syncUserWithBackend(userCredential.user);
            if (!dbUser?.username) {
                navigation.navigate('OnboardingSetup');
            } else {
                navigation.navigate('MainTab');
            }
        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
                Alert.alert('Sign-Up Error', 'That email address is already in use.');
            } else {
                Alert.alert('Sign-Up Error', error.message || 'Could not create account.');
            }
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            const signInResult = await GoogleSignin.signIn();

            if (!signInResult || (signInResult as any).type === 'cancelled') {
                console.log('User cancelled Google login flow');
                return;
            }

            const idToken = signInResult.data?.idToken || (signInResult as any).idToken;

            if (!idToken) {
                console.log('No ID token received:', signInResult);
                return;
            }

            const googleCredential = GoogleAuthProvider.credential(idToken);
            const userCredential = await signInWithCredential(getAuth(), googleCredential);

            const dbUser = await syncUserWithBackend(userCredential.user);
            if (!dbUser?.username) {
                navigation.navigate('OnboardingSetup');
            } else {
                navigation.navigate('MainTab');
            }
        } catch (error: any) {
            if (
                error.code === statusCodes.SIGN_IN_CANCELLED ||
                error.code === 'ASYNC_OP_IN_PROGRESS' ||
                error.code === statusCodes.IN_PROGRESS
            ) {
                console.log('Google Sign-In was cancelled or in progress by user.');
                return;
            }

            Alert.alert('Error', error.message || 'Google Sign-In failed');
        }
    };

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
                            <Text style={styles.title}>CREATE ACCOUNT</Text>
                            <Text style={styles.subtitle}>START TRACING YOUR JOURNEYS</Text>
                        </View>

                        <View style={styles.formContainer}>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.label}>EMAIL</Text>
                                <TextInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.inputWrapper}>
                                <Text style={styles.label}>PASSWORD</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={[styles.input, styles.passwordInput]}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!isPasswordVisible}
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeButton}
                                        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                                        activeOpacity={0.7}
                                    >
                                        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            {isPasswordVisible ? (
                                                <>
                                                    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <Circle cx="12" cy="12" r="3" />
                                                </>
                                            ) : (
                                                <>
                                                    <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                    <Path d="M1 1l22 22" />
                                                </>
                                            )}
                                        </Svg>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.primaryButton}
                                activeOpacity={0.85}
                                onPress={handleSignUp}
                            >
                                <Text style={styles.primaryButtonText}>Continue</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.dividerContainer}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <TouchableOpacity
                            style={styles.googleButton}
                            activeOpacity={0.8}
                            onPress={handleGoogleSignIn}
                        >
                            <Svg width="18" height="18" viewBox="0 0 24 24">
                                <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                            </Svg>
                            <Text style={styles.socialButtonText}>Continue with Google</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.textButton}
                            activeOpacity={0.7}
                            onPress={() => navigation?.navigate('SignIn')}
                        >
                            <Text style={styles.secondaryText}>
                                Already have an account? <Text style={styles.signInLink}>Sign In</Text>
                            </Text>
                        </TouchableOpacity>

                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
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
        paddingTop: height * 0.12,
        paddingBottom: 60,
        alignItems: 'center',
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
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
    formContainer: {
        width: '100%',
        alignItems: 'center',
        gap: 22,
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
    },
    passwordContainer: {
        position: 'relative',
        justifyContent: 'center',
    },
    passwordInput: {
        paddingRight: 48,
    },
    eyeButton: {
        position: 'absolute',
        right: 14,
        padding: 6,
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
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 44,
        marginBottom: 28,
        width: '100%',
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(239, 234, 225, 0.12)',
    },
    dividerText: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '600',
        paddingHorizontal: 12,
        letterSpacing: 1,
    },
    googleButton: {
        width: '72%',
        paddingVertical: 14,
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 36,
    },
    socialButtonText: {
        color: '#0D0E12',
        fontSize: 15,
        fontWeight: '600',
    },
    textButton: {
        paddingVertical: 12,
    },
    secondaryText: {
        color: '#94A3B8',
        fontSize: 14,
        fontWeight: '400',
    },
    signInLink: {
        color: '#FF4B82',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});