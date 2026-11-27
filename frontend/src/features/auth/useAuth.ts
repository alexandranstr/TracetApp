import {
    createUserWithEmailAndPassword,
    getAuth,
    GoogleAuthProvider,
    signInWithCredential,
    signInWithEmailAndPassword,
} from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { ApiError } from '../../api/client';
import { profileApi } from '../profile/api';
import { UpdateProfileRequest, UserProfile } from '../profile/types';
import { authApi } from './api';
import { rememberSession } from './session';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CANCELLED_GOOGLE_CODES: string[] = [statusCodes.SIGN_IN_CANCELLED, statusCodes.IN_PROGRESS, 'ASYNC_OP_IN_PROGRESS'];

async function syncSession(firebaseUserId: string): Promise<UserProfile> {
    const profile = await authApi.sync();
    await rememberSession(profile?.id || firebaseUserId);
    return profile;
}

async function emailFor(identifier: string): Promise<string> {
    if (EMAIL.test(identifier)) return identifier;
    try {
        return (await authApi.resolveEmail(identifier.replace(/^@/, ''))).email;
    } catch (error) {
        throw new Error(
            error instanceof ApiError && error.status === 404
                ? 'No account uses that username.'
                : 'Could not look up that username. Please try again.'
        );
    }
}

async function signIn(identifier: string, password: string) {
    const email = await emailFor(identifier.trim());
    const { user } = await signInWithEmailAndPassword(getAuth(), email, password);
    return syncSession(user.uid);
}

async function signUp(email: string, password: string) {
    const { user } = await createUserWithEmailAndPassword(getAuth(), email.trim(), password);
    return syncSession(user.uid);
}

// Resolves to null when the user closes the Google sheet.
async function signInWithGoogle(): Promise<UserProfile | null> {
    try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const result = await GoogleSignin.signIn();
        if (!result || (result as { type?: string }).type === 'cancelled') return null;

        const idToken = result.data?.idToken ?? (result as { idToken?: string }).idToken;
        if (!idToken) return null;

        const { user } = await signInWithCredential(getAuth(), GoogleAuthProvider.credential(idToken));
        return syncSession(user.uid);
    } catch (error) {
        if (CANCELLED_GOOGLE_CODES.includes((error as { code?: string }).code ?? '')) return null;
        throw error;
    }
}

async function completeProfile(changes: UpdateProfileRequest) {
    const userId = getAuth().currentUser?.uid;
    if (!userId) throw new Error('No authenticated user session found.');
    const profile = await profileApi.update(changes);
    await rememberSession(profile.id || userId, profile);
    return profile;
}

// Returns false when the user still has to pick a username.
async function finishSignIn(profile: UserProfile): Promise<boolean> {
    if (!profile?.username) return false;
    await rememberSession(profile.id, profile);
    return true;
}

const actions = { signIn, signUp, signInWithGoogle, finishSignIn, completeProfile };

export function useAuth() {
    return actions;
}
