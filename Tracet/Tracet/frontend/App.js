import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WelcomeScreen from './src/screens/WelcomeScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import OnboardingSetupScreen from './src/screens/OnboardingSetupScreen';
import SignInScreen from "./src/screens/SignInScreen";
import MainTab from "./src/screens/MainTab";

const Stack = createNativeStackNavigator();

export default function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="SignUp" component={SignUpScreen} />
                <Stack.Screen name="SignIn" component={SignInScreen} />
                <Stack.Screen name="OnboardingSetup" component={OnboardingSetupScreen} />
                <Stack.Screen name="MainTab" component={MainTab} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}