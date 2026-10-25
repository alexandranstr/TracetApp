import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getAuth } from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import WelcomeScreen from './src/screens/WelcomeScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import OnboardingSetupScreen from './src/screens/OnboardingSetupScreen';
import SignInScreen from "./src/screens/SignInScreen";
import MainTab from "./src/screens/MainTab";
import FriendsScreen from "./src/screens/FriendsScreen";
import ChatScreen from "./src/screens/ChatScreen";
import ConversationsScreen from "./src/screens/ConversationsScreen";
import { API_BASE_URL } from './src/config';

const Stack = createNativeStackNavigator();

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const [needsOnboarding, setNeedsOnboarding] = useState(null);
    const navigationRef = useRef(null);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            setIsAuthenticated(!!user);
            if (user) {
                try {
                    let profile = await AsyncStorage.getItem('userProfile');
                    if (!profile) {
                        try {
                            const idToken = await user.getIdToken();
                            const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${idToken}`,
                                    'Accept': 'application/json',
                                },
                            });
                            if (response.ok) {
                                const dbUser = await response.json();
                                if (dbUser?.username) {
                                    profile = JSON.stringify(dbUser);
                                    await AsyncStorage.setItem('userProfile', profile);
                                }
                            }
                        } catch (error) {
                            console.error('Error fetching profile for onboarding check:', error);
                        }
                    }
                    setNeedsOnboarding(!profile);
                } catch {
                    setNeedsOnboarding(false);
                }
            } else {
                setNeedsOnboarding(false);
            }
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (isAuthenticated === null || needsOnboarding === null || !navigationRef.current) return;

        setTimeout(() => {
            if (!navigationRef.current) return;
            const nav = navigationRef.current;
            if (isAuthenticated && needsOnboarding) {
                const state = nav.getState();
                if (state?.routes?.[state.routes.length - 1]?.name !== 'OnboardingSetup') {
                    nav.reset({
                        index: 0,
                        routes: [{ name: 'OnboardingSetup' }],
                    });
                }
            } else if (isAuthenticated) {
                nav.reset({
                    index: 0,
                    routes: [{ name: 'MainTab' }],
                });
            } else {
                nav.reset({
                    index: 0,
                    routes: [{ name: 'Welcome' }],
                });
            }
        }, 100);
    }, [isAuthenticated, needsOnboarding]);

    if (isAuthenticated === null) {
        return null;
    }

    return (
        <NavigationContainer ref={navigationRef}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="SignIn" component={SignInScreen} />
                <Stack.Screen name="SignUp" component={SignUpScreen} />
                <Stack.Screen name="OnboardingSetup" component={OnboardingSetupScreen} />
                <Stack.Screen name="MainTab" component={MainTab} />
                <Stack.Screen name="Friends" component={FriendsScreen} />
                <Stack.Screen name="Messages" component={ConversationsScreen} />
                <Stack.Screen name="ChatScreen" component={ChatScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}