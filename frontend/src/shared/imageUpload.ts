import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { getStorage } from '@react-native-firebase/storage';
import { getAuth } from '@react-native-firebase/auth';

export const MAX_IMAGE_SIZE_MB = 10;
export const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.7;
const UPLOAD_MIME_TYPE = 'image/jpeg';

export type ImageUploadErrorCode = 'unsupported' | 'too-large';

export class ImageUploadError extends Error {
    constructor(public readonly code: ImageUploadErrorCode, message: string) {
        super(message);
        this.name = 'ImageUploadError';
    }
}

// Compatible asks iOS for JPEG instead of HEIC; prepareImageForUpload converts anything else.
export function imagePickerOptions(
    overrides: ImagePicker.ImagePickerOptions = {}
): ImagePicker.ImagePickerOptions {
    return {
        mediaTypes: ['images'],
        quality: 1,
        exif: false,
        shouldDownloadFromNetwork: true,
        preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        ...overrides,
    };
}

export function isFirebaseUrl(uri: string): boolean {
    return uri.startsWith('http://') || uri.startsWith('https://');
}

// Every stored photo lives in Firebase Storage; anything else cannot be shown on another device.
export function resolveImageUri(photoUrl?: string | null): string | null {
    return photoUrl && isFirebaseUrl(photoUrl) ? photoUrl : null;
}

export function fitWithin(
    width: number,
    height: number,
    maxDimension: number = MAX_IMAGE_DIMENSION
): { width: number } | { height: number } | null {
    if (width <= maxDimension && height <= maxDimension) return null;
    return width >= height ? { width: maxDimension } : { height: maxDimension };
}

// Re-encoding strips EXIF/GPS, so never fall back to uploading the raw file.
export async function prepareImageForUpload(uri: string): Promise<{ uri: string; mimeType: string }> {
    let processedUri: string;
    try {
        const original = await ImageManipulator.manipulate(uri).renderAsync();
        const target = fitWithin(original.width, original.height);
        const image = target
            ? await ImageManipulator.manipulate(original).resize(target).renderAsync()
            : original;
        const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
        processedUri = saved.uri;
    } catch (err) {
        console.error('[imageUpload] Could not decode image:', err);
        throw new ImageUploadError('unsupported', 'This photo format is not supported. Please choose another photo.');
    }

    const info = await FileSystem.getInfoAsync(processedUri);
    if (info.exists && info.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        throw new ImageUploadError('too-large', `Image is too large. Maximum size is ${MAX_IMAGE_SIZE_MB}MB.`);
    }

    return { uri: processedUri, mimeType: UPLOAD_MIME_TYPE };
}

export async function uploadImageToStorage(
    uri: string,
    userId: string,
    folder: string,
    mimeType: string,
    onProgress?: (progress: number) => void
): Promise<string> {
    const currentUser = getAuth().currentUser;
    if (!currentUser) {
        throw new Error('No authenticated user found');
    }
    const idToken = await currentUser.getIdToken();

    const bucket = getStorage().app?.options?.storageBucket || 'tracet-c5152.firebasestorage.app';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
    const encodedPath = encodeURIComponent(`${folder}/${userId}/${fileName}`);
    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?uploadType=media`;

    onProgress?.(10);

    const uploadResult = await FileSystem.uploadAsync(uploadUrl, uri, {
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        httpMethod: 'POST',
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': mimeType,
        },
    });

    onProgress?.(90);

    if (uploadResult.status !== 200) {
        throw new Error(`Upload failed with status ${uploadResult.status}`);
    }

    const response = JSON.parse(uploadResult.body);
    if (!response.downloadTokens) {
        throw new Error('No download token in upload response');
    }

    onProgress?.(100);
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media&token=${response.downloadTokens}`;
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

    const prepared = await prepareImageForUpload(uri);
    return uploadImageToStorage(prepared.uri, userId, folder, prepared.mimeType, onProgress);
}

export async function deleteImageFromStorage(downloadUrl: string): Promise<boolean> {
    try {
        const url = new URL(downloadUrl);
        const pathParam = url.pathname.split('/o/')[1];
        const bucket = url.pathname.split('/b/')[1]?.split('/o/')[0];
        if (!pathParam || !bucket) return false;

        const currentUser = getAuth().currentUser;
        if (!currentUser) return false;
        const idToken = await currentUser.getIdToken();

        const decodedPath = decodeURIComponent(pathParam.split('?')[0]);
        const deleteUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(decodedPath)}`;
        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${idToken}` },
        });

        return response.ok || response.status === 404;
    } catch (err) {
        console.error('[imageUpload] Error deleting image:', err);
        return false;
    }
}
