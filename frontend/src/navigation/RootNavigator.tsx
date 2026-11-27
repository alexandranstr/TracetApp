import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getAuth } from '@react-native-firebase/auth';
import { hasCompletedOnboarding } from '../features/auth/session';
import WelcomeScreen from '../features/auth/screens/WelcomeScreen';
import SignInScreen from '../features/auth/screens/SignInScreen';
import SignUpScreen from '../features/auth/screens/SignUpScreen';
import OnboardingSetupScreen from '../features/auth/screens/OnboardingSetupScreen';
import MainTabs from './MainTabs';
import FriendsScreen from '../features/friends/screens/FriendsScreen';
import ConversationsScreen from '../features/chat/screens/ConversationsScreen';
import ChatScreen from '../features/chat/screens/ChatScreen';
import AiChatScreen from '../features/ai/screens/AiChatScreen';
import PrivacyPolicyScreen from '../features/profile/screens/PrivacyPolicyScreen';
import SharedHistoryScreen from '../features/pins/screens/SharedHistoryScreen';

const Stack = createNativeStackNavigator();

type StartScreen = 'Welcome' | 'OnboardingSetup' | 'MainTab';

export default function RootNavigator() {
    const [startScreen, setStartScreen] = useState<StartScreen | null>(null);
    const navigation = useRef<NavigationContainerRef<Record<string, object | undefined>>>(null);

    useEffect(() => getAuth().onAuthStateChanged(async (user) => {
        if (!user) {
            setStartScreen('Welcome');
            return;
        }
        setStartScreen((await hasCompletedOnboarding()) ? 'MainTab' : 'OnboardingSetup');
    }), []);

    useEffect(() => {
        const nav = navigation.current;
        if (!startScreen || !nav?.isReady()) return;

        const current = nav.getCurrentRoute()?.name;
        if (current !== startScreen) {
            nav.reset({ index: 0, routes: [{ name: startScreen }] });
        }
    }, [startScreen]);

    if (!startScreen) return null;

    return (
        <NavigationContainer ref={navigation}>
            <Stack.Navigator initialRouteName={startScreen} screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="SignIn" component={SignInScreen} />
                <Stack.Screen name="SignUp" component={SignUpScreen} />
                <Stack.Screen name="OnboardingSetup" component={OnboardingSetupScreen} />
                <Stack.Screen name="MainTab" component={MainTabs} />
                <Stack.Screen name="Friends" component={FriendsScreen} />
                <Stack.Screen name="Messages" component={ConversationsScreen} />
                <Stack.Screen name="ChatScreen" component={ChatScreen} />
                <Stack.Screen name="AiChatScreen" component={AiChatScreen} />
                <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
                <Stack.Screen name="SharedHistory" component={SharedHistoryScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
