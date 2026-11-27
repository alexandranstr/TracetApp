export interface UserProfile {
    id: string;
    email: string;
    displayName: string;
    username: string;
    photoUrl?: string | null;
    homeCountry?: string | null;
    phoneNumber?: string | null;
    isTwoFactorEnabled: boolean;
    isPhoneVerified: boolean;
    isPrivateProfile: boolean;
    createdAt: string;
}

export interface UpdateProfileRequest {
    displayName?: string;
    username?: string;
    homeCountry?: string | null;
    photoUrl?: string | null;
    phoneNumber?: string;
}
