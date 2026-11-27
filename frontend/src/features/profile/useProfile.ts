import { useCallback, useEffect, useState } from 'react';
import {
    deleteUser,
    getAuth,
    linkWithCredential,
    PhoneAuthProvider,
    signInWithPhoneNumber,
    signOut as firebaseSignOut,
    updatePassword,
} from '@react-native-firebase/auth';
import { processAndUploadImage } from '../../shared/imageUpload';
import { forgetEverything, forgetProfile } from '../auth/session';
import { profileApi } from './api';

export type PhoneConfirmation = Awaited<ReturnType<typeof signInWithPhoneNumber>>;

export interface ProfileView {
    displayName: string;
    username: string;
    email: string;
    photoUrl: string;
    phoneNumber: string;
    isTwoFactorEnabled: boolean;
    isPhoneVerified: boolean;
}

const EMPTY: ProfileView = {
    displayName: '',
    username: '',
    email: '',
    photoUrl: '',
    phoneNumber: '',
    isTwoFactorEnabled: false,
    isPhoneVerified: false,
};

function currentUser() {
    const user = getAuth().currentUser;
    if (!user) throw new Error('No user authenticated.');
    return user;
}

export function useProfile(userId: string | null) {
    const [profile, setProfile] = useState<ProfileView>(EMPTY);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = getAuth().currentUser;
        if (!user) {
            setLoading(false);
            return;
        }
        profileApi
            .get()
            .then((data) =>
                setProfile({
                    displayName: data.displayName || user.displayName || 'Traveler',
                    username: data.username || '',
                    email: user.email || data.email || 'No email',
                    photoUrl: data.photoUrl || user.photoURL || '',
                    phoneNumber: data.phoneNumber || '',
                    isTwoFactorEnabled: data.isTwoFactorEnabled,
                    isPhoneVerified: data.isPhoneVerified,
                })
            )
            .catch(() => undefined)
            .finally(() => setLoading(false));
    }, [userId]);

    const updateNames = useCallback(async (displayName: string, username: string) => {
        const data = await profileApi.update({ displayName, username });
        setProfile((previous) => ({ ...previous, displayName: data.displayName, username: data.username }));
    }, []);

    const changePhoto = useCallback(async (pickedUri: string) => {
        const photoUrl = await processAndUploadImage(pickedUri, currentUser().uid, 'profiles');
        await profileApi.update({ photoUrl });
        setProfile((previous) => ({ ...previous, photoUrl }));
    }, []);

    const sendPhoneCode = useCallback((phoneNumber: string) => {
        getAuth().settings.appVerificationDisabledForTesting = true;
        return signInWithPhoneNumber(getAuth(), phoneNumber);
    }, []);

    const verifyPhone = useCallback(
        async (confirmation: PhoneConfirmation, code: string, phoneNumber: string) => {
            const credential = PhoneAuthProvider.credential(confirmation.verificationId, code);
            try {
                await linkWithCredential(currentUser(), credential);
            } catch (error) {
                if ((error as { code?: string }).code !== 'auth/provider-already-linked') throw error;
            }
            await profileApi.update({ phoneNumber });
            setProfile((previous) => ({ ...previous, phoneNumber, isPhoneVerified: true }));
        },
        []
    );

    const setTwoFactor = useCallback(async (enable: boolean) => {
        const { isTwoFactorEnabled } = await profileApi.setTwoFactor(enable);
        setProfile((previous) => ({ ...previous, isTwoFactorEnabled }));
    }, []);

    const changePassword = useCallback((password: string) => updatePassword(currentUser(), password), []);

    const signOut = useCallback(async () => {
        await forgetProfile();
        await firebaseSignOut(getAuth());
    }, []);

    const deleteAccount = useCallback(async () => {
        const user = currentUser();
        await profileApi.deleteAccount();
        await deleteUser(user);
        await forgetEverything();
    }, []);

    return {
        profile,
        loading,
        updateNames,
        changePhoto,
        sendPhoneCode,
        verifyPhone,
        setTwoFactor,
        changePassword,
        signOut,
        deleteAccount,
    };
}
