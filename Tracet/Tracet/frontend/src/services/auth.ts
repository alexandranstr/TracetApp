import { getAuth } from '@react-native-firebase/auth';
import { Platform } from 'react-native';

const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

export const syncUserWithBackend = async (firebaseUser: any) => {
    try {
        const idToken = await firebaseUser.getIdToken(true);

        const response = await fetch(`${API_BASE_URL}/api/auth/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to sync user with backend');
        }

        const data = await response.json();
        return data; 
    } catch (error) {
        console.error('Error syncing user with backend:', error);
        throw error;
    }
};