import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    Switch,
    Alert,
    Platform,
    Image,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat, ImageResult } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import DateTimePicker from '@react-native-community/datetimepicker';

const PINK_ACCENT = '#FF2D55';
const DARK_BG = '#121212';
const CARD_BG = '#1C1C1E';
const TEXT_MUTED = '#8E8E93';


const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

interface Tag {
    id: number;
    name: string;
}

export interface LocationData {
    id?: number;
    latitude: number;
    longitude: number;
    cityName?: string;
    countryName?: string;
    address?: string;
    placeName?: string;
    entityType?: number;
    googlePlaceId?: string;
}

interface CreatePinOverlayProps {
    visible: boolean;
    onClose: () => void;
    currentUserId: string;
    selectedLocation?: LocationData | null;
    onPinCreated?: (newPin: any) => void;
}

export default function CreatePinOverlay({
                                             visible,
                                             onClose,
                                             currentUserId,
                                             selectedLocation,
                                             onPinCreated,
                                         }: CreatePinOverlayProps) {
    const [title, setTitle] = useState('');
    const [journalEntry, setJournalEntry] = useState('');
    const [rating, setRating] = useState<number>(5);
    const [isPrivate, setIsPrivate] = useState<boolean>(false);
    const [visitedAt, setVisitedAt] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [photoUrls, setPhotoUrls] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

    const resetForm = () => {
        setTitle('');
        setJournalEntry('');
        setRating(5);
        setIsPrivate(false);
        setVisitedAt(new Date());
        setPhotoUrls([]);
        setSelectedTagIds([]);
        setShowDatePicker(false);
        setIsSubmitting(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    useEffect(() => {
        let isMounted = true;

        if (visible) {
            fetch(`${API_BASE_URL}/api/tags`)
                .then((res) => (res.ok ? res.json() : []))
                .then((data) => {
                    if (isMounted) setAvailableTags(data);
                })
                .catch((error) => console.log('Error fetching tags:', error));
        } else {
            resetForm();
        }

        return () => {
            isMounted = false;
        };
    }, [visible]);

    const toggleTag = (id: number) => {
        if (selectedTagIds.includes(id)) {
            setSelectedTagIds(selectedTagIds.filter((tId) => tId !== id));
        } else {
            setSelectedTagIds([...selectedTagIds, id]);
        }
    };


    const saveImagePermanently = async (uri: string): Promise<string> => {
        try {
            const filename = uri.split('/').pop() || `${Date.now()}.jpg`;
            const destPath = `${FileSystem.documentDirectory}${filename}`;
            await FileSystem.copyAsync({ from: uri, to: destPath });
            return destPath;
        } catch (err) {
            console.log('Failed to save photo permanently:', err);
            return uri;
        }
    };

    const handlePickPhotos = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Media library access is needed to select photos.');
                return;
            }

            const result: ImagePicker.ImagePickerResult =
                await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsMultipleSelection: true,
                    selectionLimit: 10,
                    quality: 0.8,
                    shouldDownloadFromNetwork: true,
                    preferredAssetRepresentationMode:
                    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Automatic,
                });

            if (!result.canceled && result.assets?.length > 0) {
                const processedUris: string[] = [];

                for (const asset of result.assets) {
                    try {
                        const manipulated: ImageResult = await manipulateAsync(
                            asset.uri,
                            [],
                            {
                                compress: 0.8,
                                format: SaveFormat.JPEG,
                            }
                        );


                        const permanentUri = await saveImagePermanently(manipulated.uri);
                        processedUris.push(permanentUri);
                    } catch (err) {
                        console.log('Manipulator error:', err);
                        const permanentUri = await saveImagePermanently(asset.uri);
                        processedUris.push(permanentUri);
                    }
                }

                setPhotoUrls((prev) => [...prev, ...processedUris]);
            }
        } catch (error) {
            console.log('Error picking image:', error);
            Alert.alert('Error', 'Could not load selected photo. Please try again.');
        }
    };

    const handleRemovePhoto = (index: number) => {
        setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
    };

    const handlePost = async () => {
        if (!title.trim()) {
            Alert.alert('Title Required', 'Please enter a title for your memory.');
            return;
        }

        setIsSubmitting(true);

        const pinPayload = {
            title,
            journalEntry,
            rating,
            isPrivate,
            visitedAt: visitedAt.toISOString(),
            createdAt: new Date().toISOString(),
            userId: currentUserId,
            locationId: selectedLocation?.id || 0,
            location: selectedLocation ? {
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
                cityName: selectedLocation.cityName || '',
                countryName: selectedLocation.countryName || '',
                address: selectedLocation.address || '',
                placeName: selectedLocation.placeName || '',
                entityType: selectedLocation.entityType ?? 0,
                googlePlaceId: selectedLocation.googlePlaceId || '',
            } : null,
            photoUrlsJson: JSON.stringify(photoUrls),
            tagsVectorJson: JSON.stringify(selectedTagIds),
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/pins`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pinPayload),
            });

            if (response.ok) {
                const createdPin = await response.json();
                onPinCreated?.(createdPin);
                handleClose();
            } else {
                Alert.alert('Error', 'Failed to save pin to server.');
            }
        } catch (error) {
            console.log('Error submitting pin payload:', error);
            Alert.alert('Error', 'Could not connect to the server.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const displayLocationName =
        selectedLocation?.placeName ||
        selectedLocation?.cityName ||
        (selectedLocation?.latitude ? `${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}` : null);

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
            <SafeAreaView style={styles.container}>

                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton} disabled={isSubmitting}>
                        <Ionicons name="close" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Add Pin</Text>
                    <TouchableOpacity style={styles.postButton} onPress={handlePost} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.postButtonText}>Post</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

                    {displayLocationName && (
                        <View style={styles.locationContainer}>
                            <Ionicons name="location" size={20} color={PINK_ACCENT} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.locationName}>{displayLocationName}</Text>
                                {selectedLocation?.address && (
                                    <Text style={styles.locationAddress}>{selectedLocation.address}</Text>
                                )}
                            </View>
                        </View>
                    )}


                    <Text style={styles.sectionTitle}>Title</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Name your memory..."
                        placeholderTextColor={TEXT_MUTED}
                        value={title}
                        onChangeText={setTitle}
                    />


                    <Text style={styles.sectionTitle}>Photos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScrollView}>
                        {photoUrls.map((uri, index) => (
                            <View key={`${uri}-${index}`} style={styles.photoContainer}>
                                <Image source={{ uri }} style={styles.photoThumbnail} />
                                <TouchableOpacity
                                    style={styles.removePhotoButton}
                                    onPress={() => handleRemovePhoto(index)}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="close-circle-sharp" size={22} color={PINK_ACCENT} />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addPhotoButton} onPress={handlePickPhotos}>
                            <Ionicons name="camera-outline" size={26} color={PINK_ACCENT} />
                            <Text style={styles.addPhotoText}>Add Photo</Text>
                        </TouchableOpacity>
                    </ScrollView>


                    <Text style={styles.sectionTitle}>Rating</Text>
                    <View style={styles.ratingRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                <Ionicons
                                    name={star <= rating ? 'star' : 'star-outline'}
                                    size={30}
                                    color="#FFD700"
                                    style={{ marginRight: 8 }}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>


                    <Text style={styles.sectionTitle}>Visited Date</Text>
                    <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowDatePicker((prev) => !prev)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="calendar-outline" size={20} color={PINK_ACCENT} />
                        <Text style={styles.datePickerText}>{visitedAt.toLocaleDateString()}</Text>
                    </TouchableOpacity>

                    {showDatePicker && (
                        <View style={styles.datePickerContainer}>
                            <DateTimePicker
                                value={visitedAt}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                textColor="#FFFFFF"
                                themeVariant="dark"
                                onChange={(event, date) => {
                                    if (Platform.OS === 'android') {
                                        setShowDatePicker(false);
                                    }
                                    if (date) setVisitedAt(date);
                                }}
                            />
                            {Platform.OS === 'ios' && (
                                <TouchableOpacity
                                    style={styles.datePickerDoneButton}
                                    onPress={() => setShowDatePicker(false)}
                                >
                                    <Text style={styles.datePickerDoneText}>Done</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}


                    {availableTags.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>Tags</Text>
                            <View style={styles.tagsContainer}>
                                {availableTags.map((tag) => {
                                    const isSelected = selectedTagIds.includes(tag.id);
                                    return (
                                        <TouchableOpacity
                                            key={tag.id}
                                            style={[styles.tagChip, isSelected && styles.activeTagChip]}
                                            onPress={() => toggleTag(tag.id)}
                                        >
                                            <Text style={[styles.tagChipText, isSelected && styles.activeTagChipText]}>
                                                {tag.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}


                    <Text style={styles.sectionTitle}>Memories & Notes</Text>
                    <TextInput
                        style={styles.journalInput}
                        multiline
                        numberOfLines={5}
                        placeholder="Write down your experience, thoughts, tips, or memories..."
                        placeholderTextColor={TEXT_MUTED}
                        value={journalEntry}
                        onChangeText={setJournalEntry}
                    />


                    <View style={styles.privacyRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.privacyTitle}>Private Pin</Text>
                            <Text style={styles.privacySubtitle}>Only visible to you on your personal map</Text>
                        </View>
                        <Switch
                            value={isPrivate}
                            onValueChange={setIsPrivate}
                            trackColor={{ false: '#3A3A3C', true: PINK_ACCENT }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: DARK_BG },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    closeButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
    postButton: { backgroundColor: PINK_ACCENT, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
    postButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
    content: { padding: 20, paddingBottom: 40 },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CARD_BG,
        padding: 12,
        borderRadius: 12,
        gap: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    locationName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    locationAddress: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: TEXT_MUTED, marginTop: 18, marginBottom: 8 },
    textInput: {
        backgroundColor: CARD_BG,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: '#FFFFFF',
        fontSize: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    photosScrollView: { flexDirection: 'row', marginVertical: 4 },
    photoContainer: {
        position: 'relative',
        marginRight: 12,
        paddingTop: 8,
        paddingRight: 8,
    },
    photoThumbnail: { width: 88, height: 88, borderRadius: 12 },
    removePhotoButton: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: DARK_BG,
        borderRadius: 11,
        zIndex: 10,
    },
    addPhotoButton: {
        width: 88,
        height: 88,
        borderRadius: 12,
        backgroundColor: CARD_BG,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    addPhotoText: { color: PINK_ACCENT, fontSize: 12, fontWeight: '600', marginTop: 4 },
    ratingRow: { flexDirection: 'row', alignItems: 'center' },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tagChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        backgroundColor: CARD_BG,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    activeTagChip: { backgroundColor: PINK_ACCENT, borderColor: PINK_ACCENT },
    tagChipText: { fontSize: 13, color: '#FFFFFF' },
    activeTagChipText: { fontWeight: '600', color: '#FFFFFF' },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CARD_BG,
        padding: 12,
        borderRadius: 12,
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    datePickerText: { color: '#FFFFFF', fontSize: 15 },
    datePickerContainer: {
        backgroundColor: CARD_BG,
        borderRadius: 12,
        marginTop: 8,
        padding: 12,
    },
    datePickerDoneButton: {
        alignSelf: 'flex-end',
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    datePickerDoneText: {
        color: PINK_ACCENT,
        fontWeight: '700',
        fontSize: 15,
    },
    journalInput: {
        backgroundColor: CARD_BG,
        borderRadius: 12,
        padding: 14,
        height: 120,
        textAlignVertical: 'top',
        color: '#FFFFFF',
        fontSize: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    privacyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    privacyTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
    privacySubtitle: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
});