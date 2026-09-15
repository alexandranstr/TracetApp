import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Alert
} from 'react-native';
import { getAuth, signOut } from '@react-native-firebase/auth';

export default function MainTab({ navigation }: any) {
    const user = getAuth().currentUser;

    const handleSignOut = async () => {
        try {
            await signOut(getAuth());
            navigation.reset({
                index: 0,
                routes: [{ name: 'SignIn' }],
            });
        } catch (error: any) {
            Alert.alert('Sign-Out Error', error.message || 'Could not log out.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.content}>
                <Text style={styles.welcomeTitle}>Welcome to Tracet!</Text>
                <Text style={styles.userEmail}>
                    {user?.email ? `Logged in as: ${user.email}` : 'Authentication Successful'}
                </Text>

                <TouchableOpacity
                    style={styles.signOutButton}
                    activeOpacity={0.8}
                    onPress={handleSignOut}
                >
                    <Text style={styles.buttonText}>Sign Out</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0D0E12',
        marginBottom: 8,
    },
    userEmail: {
        fontSize: 14,
        fontWeight: '500',
        color: '#64748B',
        marginBottom: 32,
    },
    signOutButton: {
        backgroundColor: '#FF4B82',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 30,
        elevation: 3,
        shadowColor: '#FF4B82',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});