import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { getStorage } from '@react-native-firebase/storage';
import { getAuth } from '@react-native-firebase/auth';
import { API_BASE_URL } from '../config';

const MAX_IMAGE_SIZE_MB = 10;

export function isFirebaseUrl(uri: string): boolean {
    return uri.startsWith('http://') || uri.startsWith('https://');
}

export function isLocalUri(uri: string): boolean {
    return uri.startsWith('file://') || 
           uri.startsWith('assets-library://') || 
           uri.startsWith('ph://') ||
           (!uri.startsWith('http://') && !uri.startsWith('https://'));
}

export function resolveImageUri(photoUrl?: string): string | null {
    if (!photoUrl) return null;

    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
        return photoUrl;
    }

    if (photoUrl.startsWith('data:image/')) {
        return photoUrl;
    }

    if (photoUrl.startsWith('uploads/') || photoUrl.startsWith('/uploads/')) {
        const cleanPath = photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`;
        return `${API_BASE_URL}${cleanPath}`;
    }

    if (photoUrl.startsWith('profile_') && !photoUrl.includes('/')) {
        return `${API_BASE_URL}/uploads/${photoUrl}`;
    }

    return null;
}

export async function validateImageSize(
    uri: string, 
    maxSizeMB: number = MAX_IMAGE_SIZE_MB
): Promise<boolean> {
    try {
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists) return false;
        
        const sizeMB = info.size / (1024 * 1024);
        return sizeMB <= maxSizeMB;
    } catch (err) {
        console.log('[imageUpload] Error validating image size:', err);
        return true;
    }
}

export function getImageFormat(uri: string): { saveFormat: SaveFormat; mimeType: string } {
    const ext = (uri.split('.').pop() || '').toLowerCase().split('?')[0];
    switch (ext) {
        case 'png':
            return { saveFormat: SaveFormat.PNG, mimeType: 'image/png' };
        case 'webp':
            return { saveFormat: SaveFormat.PNG, mimeType: 'image/png' };
        case 'gif':
            return { saveFormat: SaveFormat.PNG, mimeType: 'image/png' };
        default:
            return { saveFormat: SaveFormat.JPEG, mimeType: 'image/jpeg' };
    }
}

export async function stripExifAndCompress(uri: string): Promise<{ uri: string; mimeType: string }> {
    try {
        const { saveFormat, mimeType } = getImageFormat(uri);
        const result = await manipulateAsync(
            uri,
            [],
            {
                compress: 0.8,
                format: saveFormat,
            }
        );
        return { uri: result.uri, mimeType };
    } catch (err) {
        console.log('[imageUpload] Error stripping EXIF, using original:', err);
        const { mimeType } = getImageFormat(uri);
        return { uri, mimeType };
    }
}

export async function uploadImageToStorage(
    uri: string,
    userId: string,
    folder: string,
    mimeType?: string,
    onProgress?: (progress: number) => void
): Promise<string> {
    try {
        console.log('[imageUpload] === Starting Firebase Storage Upload ===');
        console.log('[imageUpload] Source URI:', uri);
        console.log('[imageUpload] Folder:', folder);
        console.log('[imageUpload] User ID:', userId);

        const firebaseAuth = getAuth();
        const currentUser = firebaseAuth.currentUser;
        if (!currentUser) {
            throw new Error('[imageUpload] No authenticated user found');
        }

        const idToken = await currentUser.getIdToken();
        console.log('[imageUpload] Got Firebase ID token');

        const storageInstance = getStorage();
        console.log('[imageUpload] Storage bucket:', storageInstance.app?.options?.storageBucket);

        const { mimeType: detectedMimeType } = getImageFormat(uri);
        const finalMimeType = mimeType || detectedMimeType;
        const ext = finalMimeType === 'image/png' ? 'png' :
                    finalMimeType === 'image/webp' ? 'webp' :
                    finalMimeType === 'image/gif' ? 'gif' : 'jpg';

        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
        const path = `${folder}/${userId}/${fileName}`;

        console.log('[imageUpload] Upload path:', path);
        console.log('[imageUpload] MIME type:', finalMimeType);

        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists) {
            console.log('[imageUpload] File size:', (fileInfo as any).size, 'bytes');
        }

        const bucket = storageInstance.app?.options?.storageBucket || 'tracet-c5152.firebasestorage.app';
        const encodedPath = encodeURIComponent(path);
        const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?uploadType=media`;

        console.log('[imageUpload] Upload URL:', uploadUrl);

        onProgress?.(10);

        const uploadResult = await FileSystem.uploadAsync(
            uploadUrl,
            uri,
            {
                uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
                httpMethod: 'POST',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': finalMimeType,
                },
            }
        );

        onProgress?.(90);

        console.log('[imageUpload] HTTP Status:', uploadResult.status);
        console.log('[imageUpload] Response body:', uploadResult.body);

        if (uploadResult.status !== 200) {
            throw new Error(`[imageUpload] Upload failed with status ${uploadResult.status}: ${uploadResult.body}`);
        }

        const response = JSON.parse(uploadResult.body);
        const downloadUrl = response.downloadTokens 
            ? `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media&token=${response.downloadTokens}`
            : null;

        if (!downloadUrl) {
            throw new Error('[imageUpload] No download URL in response');
        }

        console.log('[imageUpload] ✓ Upload complete!');
        console.log('[imageUpload] Download URL:', downloadUrl);
        onProgress?.(100);

        return downloadUrl;
    } catch (err: any) {
        console.error('[imageUpload] ✗ Error uploading image:', err);
        console.error('[imageUpload] Error message:', err?.message);
        console.error('[imageUpload] Error stack:', err?.stack);
        throw err;
    }
}

export async function processAndUploadImage(
    uri: string,
    userId: string,
    folder: string,
    onProgress?: (progress: number) => void
): Promise<string> {
    if (isFirebaseUrl(uri)) {
        return uri;
    }

    const isValidSize = await validateImageSize(uri);
    if (!isValidSize) {
        throw new Error(`Image is too large. Maximum size is ${MAX_IMAGE_SIZE_MB}MB.`);
    }

    const { uri: processedUri, mimeType } = await stripExifAndCompress(uri);

    const downloadUrl = await uploadImageToStorage(
        processedUri,
        userId,
        folder,
        mimeType,
        onProgress
    );

    return downloadUrl;
}

export async function deleteImageFromStorage(downloadUrl: string): Promise<boolean> {
    try {
        const url = new URL(downloadUrl);
        const pathParam = url.pathname.split('/o/')[1];
        if (!pathParam) {
            console.log('[imageUpload] Could not extract path from URL:', downloadUrl);
            return false;
        }

        const decodedPath = decodeURIComponent(pathParam.split('?')[0]);
        const bucket = url.pathname.split('/b/')[1]?.split('/o/')[0];

        if (!bucket) {
            console.log('[imageUpload] Could not extract bucket from URL:', downloadUrl);
            return false;
        }

        console.log('[imageUpload] Deleting from Storage:', decodedPath);

        const firebaseAuth = getAuth();
        const currentUser = firebaseAuth.currentUser;
        if (!currentUser) {
            console.error('[imageUpload] No authenticated user for delete');
            return false;
        }

        const idToken = await currentUser.getIdToken();

        const encodedPath = encodeURIComponent(decodedPath);
        const deleteUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}`;

        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${idToken}`,
            },
        });

        if (response.ok || response.status === 404) {
            console.log(`[imageUpload] ✓ Deleted from Storage: ${decodedPath}`);
            return true;
        } else {
            console.error(`[imageUpload] ✗ Delete failed with status ${response.status}`);
            return false;
        }
    } catch (err) {
        console.error('[imageUpload] Error deleting image:', err);
        return false;
    }
}
