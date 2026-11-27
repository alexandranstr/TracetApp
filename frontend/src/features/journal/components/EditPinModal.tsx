import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getAuth } from '@react-native-firebase/auth';
import Photo from '../../../shared/components/Photo';
import { imagePickerOptions, processAndUploadImage, resolveImageUri } from '../../../shared/imageUpload';
import { photoUrls } from '../../pins/photos';
import { Pin } from '../../pins/types';
import { usePinActions } from '../../pins/usePinActions';

const PINK_ACCENT = '#FF2D55';
const CARD_BG = '#2C2C2E';
const SUBTLE_TEXT = '#8E8E93';

interface EditPinModalProps {
    pin: Pin | null;
    onClose: () => void;
    onSaved: (pin: Pin) => void;
}

const MAX_PHOTOS = 10;

export default function EditPinModal({ pin, onClose, onSaved }: EditPinModalProps) {
    const { update } = usePinActions();
    const [editTitle, setEditTitle] = useState('');
    const [editJournal, setEditJournal] = useState('');
    const [editIsPrivate, setEditIsPrivate] = useState(false);
    const [editPhotoUrls, setEditPhotoUrls] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!pin) return;
        setEditTitle(pin.title);
        setEditJournal(pin.journalEntry);
        setEditIsPrivate(pin.isPrivate);
        setEditPhotoUrls(photoUrls(pin));
    }, [pin]);

    const closeEditModal = () => {
        if (!isSaving) onClose();
    };

    const handlePickPhotos = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Media library access is needed to select photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync(
            imagePickerOptions({ allowsMultipleSelection: true, selectionLimit: MAX_PHOTOS })
        );
        if (result.canceled || !result.assets?.length) return;
        if (editPhotoUrls.length + result.assets.length > MAX_PHOTOS) {
            Alert.alert('Limit Reached', `You can add up to ${MAX_PHOTOS} photos per pin.`);
            return;
        }

        const userId = getAuth().currentUser?.uid || '';
        for (const asset of result.assets) {
            try {
                const url = await processAndUploadImage(asset.uri, userId, 'pins');
                setEditPhotoUrls((previous) => [...previous, url]);
            } catch (error) {
                Alert.alert('Upload Failed', error instanceof Error ? error.message : 'Could not upload photo. Please try again.');
            }
        }
    };

    const handleRemoveEditPhoto = (index: number) => {
        setEditPhotoUrls((previous) => previous.filter((_, i) => i !== index));
    };

    const handleSaveEdit = async () => {
        if (!pin || !editTitle.trim()) {
            Alert.alert('Title Required', 'Please enter a title for your pin.');
            return;
        }

        setIsSaving(true);
        try {
            onSaved(
                await update(pin.id, {
                    title: editTitle,
                    journalEntry: editJournal,
                    isPrivate: editIsPrivate,
                    photoUrlsJson: JSON.stringify(editPhotoUrls),
                })
            );
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update pin.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal visible={pin !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeEditModal}>
            <SafeAreaView style={styles.editModalContainer}>
                <View style={styles.editModalHeader}>
                    <TouchableOpacity onPress={closeEditModal} style={styles.editModalClose} disabled={isSaving}>
                        <Ionicons name="close" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.editModalTitle}>Edit Pin</Text>
                    <TouchableOpacity style={styles.editModalSave} onPress={handleSaveEdit} disabled={isSaving}>
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.editModalSaveText}>Save</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.editModalContent} keyboardShouldPersistTaps="handled">
                    <Text style={styles.editLabel}>Title</Text>
                    <TextInput
                        style={styles.editInput}
                        placeholder="Pin title..."
                        placeholderTextColor={SUBTLE_TEXT}
                        value={editTitle}
                        onChangeText={setEditTitle}
                    />

                    <Text style={styles.editLabel}>Photos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.editPhotosScroll}>
                        {editPhotoUrls.map((uri, index) => {
                            const displayUri = resolveImageUri(uri);
                            if (!displayUri) return null;
                            return (
                            <View key={`${uri}-${index}`} style={styles.editPhotoContainer}>
                                <Photo uri={displayUri} style={styles.editPhotoThumbnail} />
                                <TouchableOpacity
                                    style={styles.editRemovePhoto}
                                    onPress={() => handleRemoveEditPhoto(index)}
                                >
                                    <Ionicons name="close-circle-sharp" size={22} color={PINK_ACCENT} />
                                </TouchableOpacity>
                            </View>
                            );
                        })}
                        <TouchableOpacity style={styles.editAddPhoto} onPress={handlePickPhotos}>
                            <Ionicons name="camera-outline" size={26} color={PINK_ACCENT} />
                            <Text style={styles.editAddPhotoText}>Add</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    <Text style={styles.editLabel}>Notes</Text>
                    <TextInput
                        style={styles.editJournalInput}
                        multiline
                        numberOfLines={5}
                        placeholder="Your memories and notes..."
                        placeholderTextColor={SUBTLE_TEXT}
                        value={editJournal}
                        onChangeText={setEditJournal}
                    />

                    <View style={styles.editPrivacyRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.editPrivacyTitle}>Private Pin</Text>
                            <Text style={styles.editPrivacySubtitle}>Only visible to you</Text>
                        </View>
                        <Switch
                            value={editIsPrivate}
                            onValueChange={setEditIsPrivate}
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
    editModalContainer: {
        flex: 1,
        backgroundColor: '#121212',
    },
    editModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    editModalClose: { padding: 4 },
    editModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    editModalSave: {
        backgroundColor: PINK_ACCENT,
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
    },
    editModalSaveText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
    },
    editModalContent: {
        padding: 20,
        paddingBottom: 40,
    },
    editLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: SUBTLE_TEXT,
        marginTop: 16,
        marginBottom: 8,
    },
    editInput: {
        backgroundColor: CARD_BG,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: '#FFFFFF',
        fontSize: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    editPhotosScroll: {
        flexDirection: 'row',
        marginVertical: 4,
    },
    editPhotoContainer: {
        position: 'relative',
        marginRight: 12,
        paddingTop: 8,
        paddingRight: 8,
    },
    editPhotoThumbnail: {
        width: 88,
        height: 88,
        borderRadius: 12,
    },
    editRemovePhoto: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#121212',
        borderRadius: 11,
        zIndex: 10,
    },
    editAddPhoto: {
        width: 88,
        height: 88,
        borderRadius: 12,
        backgroundColor: CARD_BG,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editAddPhotoText: {
        color: PINK_ACCENT,
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
    editJournalInput: {
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
    editPrivacyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    editPrivacyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    editPrivacySubtitle: {
        fontSize: 12,
        color: SUBTLE_TEXT,
        marginTop: 2,
    },
});
