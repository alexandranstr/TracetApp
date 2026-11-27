import AsyncStorage from '@react-native-async-storage/async-storage';
import { profileApi } from '../profile/api';
import { UserProfile } from '../profile/types';

const USER_ID_KEY = 'userId';
const PROFILE_KEY = 'userProfile';

export const storedUserId = () => AsyncStorage.getItem(USER_ID_KEY);

export async function rememberSession(userId: string, profile?: UserProfile) {
    await AsyncStorage.setItem(USER_ID_KEY, userId);
    if (profile?.username) await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export const forgetProfile = () => AsyncStorage.removeItem(PROFILE_KEY);

export const forgetEverything = () => AsyncStorage.clear();

export async function hasCompletedOnboarding(): Promise<boolean> {
    if (await AsyncStorage.getItem(PROFILE_KEY)) return true;
    try {
        const profile = await profileApi.get();
        if (!profile.username) return false;
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        return true;
    } catch {
        return false;
    }
}
