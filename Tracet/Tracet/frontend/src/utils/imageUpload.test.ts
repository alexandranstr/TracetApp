import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import {
    fitWithin,
    imagePickerOptions,
    ImageUploadError,
    MAX_IMAGE_DIMENSION,
    prepareImageForUpload,
    processAndUploadImage,
} from './imageUpload';

jest.mock('expo-file-system/legacy', () => ({
    getInfoAsync: jest.fn(),
    uploadAsync: jest.fn(),
    FileSystemUploadType: { BINARY_CONTENT: 0 },
}));
jest.mock('expo-image-manipulator', () => ({
    ImageManipulator: { manipulate: jest.fn() },
    SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
}));
jest.mock('expo-image-picker', () => ({
    UIImagePickerPreferredAssetRepresentationMode: { Compatible: 'compatible' },
}));
jest.mock('@react-native-firebase/storage', () => ({ getStorage: jest.fn() }));
jest.mock('@react-native-firebase/auth', () => ({ getAuth: jest.fn() }));

const manipulate = ImageManipulator.manipulate as jest.Mock;
const getInfoAsync = FileSystem.getInfoAsync as jest.Mock;

function fakeImage(width: number, height: number) {
    return { width, height, saveAsync: jest.fn().mockResolvedValue({ uri: 'file:///out.jpg' }) };
}

function decodesTo(original: ReturnType<typeof fakeImage>, resized?: ReturnType<typeof fakeImage>) {
    const resize = jest.fn().mockReturnValue({ renderAsync: jest.fn().mockResolvedValue(resized) });
    manipulate.mockReturnValueOnce({ renderAsync: jest.fn().mockResolvedValue(original) });
    if (resized) manipulate.mockReturnValueOnce({ resize });
    return resize;
}

beforeEach(() => {
    jest.resetAllMocks();
    getInfoAsync.mockResolvedValue({ exists: true, size: 500_000 });
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('fitWithin', () => {
    it('keeps images that already fit', () => {
        expect(fitWithin(1200, 800)).toBeNull();
        expect(fitWithin(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION)).toBeNull();
    });

    it('limits the longer side of a landscape photo', () => {
        expect(fitWithin(8064, 6048)).toEqual({ width: MAX_IMAGE_DIMENSION });
    });

    it('limits the longer side of a portrait photo', () => {
        expect(fitWithin(6048, 8064)).toEqual({ height: MAX_IMAGE_DIMENSION });
    });
});

describe('imagePickerOptions', () => {
    it('asks iOS for the most compatible format and no EXIF', () => {
        expect(imagePickerOptions()).toMatchObject({
            mediaTypes: ['images'],
            exif: false,
            preferredAssetRepresentationMode: 'compatible',
        });
    });

    it('lets screens add their own options', () => {
        expect(imagePickerOptions({ allowsMultipleSelection: true, selectionLimit: 10 })).toMatchObject({
            allowsMultipleSelection: true,
            selectionLimit: 10,
            exif: false,
        });
    });
});

describe('prepareImageForUpload', () => {
    it('re-encodes a HEIC photo as JPEG without resizing when it is small enough', async () => {
        const original = fakeImage(1600, 1200);
        decodesTo(original);

        const result = await prepareImageForUpload('file:///IMG_0001.HEIC');

        expect(manipulate).toHaveBeenCalledWith('file:///IMG_0001.HEIC');
        expect(original.saveAsync).toHaveBeenCalledWith({ format: SaveFormat.JPEG, compress: 0.8 });
        expect(result).toEqual({ uri: 'file:///out.jpg', mimeType: 'image/jpeg' });
    });

    it('resizes a 48 MP photo before saving it', async () => {
        const original = fakeImage(8064, 6048);
        const resized = fakeImage(2048, 1536);
        const resize = decodesTo(original, resized);

        await prepareImageForUpload('file:///big.heic');

        expect(resize).toHaveBeenCalledWith({ width: 2048 });
        expect(resized.saveAsync).toHaveBeenCalledWith({ format: SaveFormat.JPEG, compress: 0.8 });
        expect(original.saveAsync).not.toHaveBeenCalled();
    });

    it.each(['photo.png', 'photo.webp', 'anim.gif'])('converts %s to JPEG', async (file) => {
        const original = fakeImage(800, 600);
        decodesTo(original);

        const result = await prepareImageForUpload(`file:///${file}`);

        expect(original.saveAsync).toHaveBeenCalledWith(expect.objectContaining({ format: SaveFormat.JPEG }));
        expect(result.mimeType).toBe('image/jpeg');
    });

    it('rejects a photo it cannot decode instead of uploading the raw file', async () => {
        manipulate.mockReturnValueOnce({ renderAsync: jest.fn().mockRejectedValue(new Error('decode failed')) });

        await expect(prepareImageForUpload('file:///broken.heic')).rejects.toMatchObject({
            code: 'unsupported',
        });
    });

    it('rejects a photo that is still over 10 MB after processing', async () => {
        decodesTo(fakeImage(1600, 1200));
        getInfoAsync.mockResolvedValue({ exists: true, size: 11 * 1024 * 1024 });

        const error = await prepareImageForUpload('file:///huge.jpg').catch((e) => e);

        expect(error).toBeInstanceOf(ImageUploadError);
        expect(error.code).toBe('too-large');
        expect(error.message).toContain('too large');
    });
});

describe('processAndUploadImage', () => {
    it('does not re-upload an image that is already in storage', async () => {
        const url = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/pins%2Fa.jpg?alt=media';

        await expect(processAndUploadImage(url, 'user-1', 'pins')).resolves.toBe(url);
        expect(manipulate).not.toHaveBeenCalled();
    });

    it('never uploads when the photo cannot be decoded', async () => {
        manipulate.mockReturnValueOnce({ renderAsync: jest.fn().mockRejectedValue(new Error('decode failed')) });

        await expect(processAndUploadImage('file:///broken.heic', 'user-1', 'pins')).rejects.toBeInstanceOf(
            ImageUploadError
        );
        expect(FileSystem.uploadAsync).not.toHaveBeenCalled();
    });
});
