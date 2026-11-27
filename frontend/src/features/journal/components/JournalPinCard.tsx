import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Photo from '../../../shared/components/Photo';
import { resolvedPhotoUris } from '../../pins/photos';
import { Pin } from '../../pins/types';
import { fullDate } from '../format';

const PINK_ACCENT = '#FF2D55';
const CARD_BG = '#2C2C2E';
const SUBTLE_TEXT = '#8E8E93';

interface JournalPinCardProps {
    pin: Pin;
    onEdit: (pin: Pin) => void;
}

export default function JournalPinCard({ pin, onEdit }: JournalPinCardProps) {
    const photos = resolvedPhotoUris(pin);

    return (
        <View key={pin.id} style={styles.myPinCard}>
            {photos.length > 0 && (
                <View style={styles.pinPhotosContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pinPhotosScroll}>
                        {photos.map((photoUrl, idx) => (
                            <Photo
                                key={idx}
                                uri={photoUrl}
                                style={[
                                    styles.pinPhoto,
                                    photos.length === 1 && styles.pinPhotoSingle,
                                ]}
                            />
                        ))}
                    </ScrollView>
                    {photos.length > 2 && (
                        <View style={styles.morePhotosBadge}>
                            <Text style={styles.morePhotosBadgeText}>+{photos.length - 2}</Text>
                        </View>
                    )}
                </View>
            )}

            <View style={styles.myPinContent}>
                <View style={styles.myPinHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.myPinTitle}>{pin.title}</Text>
                        {pin.location?.placeName && (
                            <View style={styles.locationRow}>
                                <Ionicons name="location" size={12} color={PINK_ACCENT} />
                                <Text style={styles.locationText}>
                                    {pin.location.placeName}
                                    {pin.location.cityName ? `, ${pin.location.cityName}` : ''}
                                </Text>
                            </View>
                        )}
                        <Text style={styles.myPinDate}>{fullDate(pin.createdAt)}</Text>
                    </View>
                    <View style={styles.myPinActions}>
                        {pin.isPrivate && (
                            <View style={styles.privateBadge}>
                                <Ionicons name="lock-closed" size={12} color={SUBTLE_TEXT} />
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => onEdit(pin)}
                        >
                            <Ionicons name="pencil" size={18} color={PINK_ACCENT} />
                        </TouchableOpacity>
                    </View>
                </View>

                {pin.journalEntry && (
                    <Text style={styles.myPinJournal} numberOfLines={3}>
                        {pin.journalEntry}
                    </Text>
                )}

                <View style={styles.myPinFooter}>
                    {pin.category && (
                        <View style={styles.categoryChip}>
                            <Text style={styles.categoryText}>{pin.category}</Text>
                        </View>
                    )}
                    {pin.rating && (
                        <View style={styles.ratingRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Ionicons
                                    key={star}
                                    name={star <= pin.rating! ? 'star' : 'star-outline'}
                                    size={12}
                                    color="#FFD60A"
                                />
                            ))}
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 6,
    },
    locationText: {
        color: SUBTLE_TEXT,
        fontSize: 13,
    },
    ratingRow: {
        flexDirection: 'row',
        gap: 2,
        marginBottom: 6,
    },
    categoryChip: {
        backgroundColor: 'rgba(255, 45, 85, 0.15)',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
    },
    categoryText: {
        color: PINK_ACCENT,
        fontSize: 12,
        fontWeight: '500',
    },
    myPinCard: {
        backgroundColor: CARD_BG,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
    },
    pinPhotosContainer: {
        position: 'relative',
    },
    pinPhotosScroll: {
        height: 180,
        overflow: 'hidden',
    },
    pinPhoto: {
        width: 180,
        height: 180,
        marginRight: 4,
        borderRadius: 8,
        backgroundColor: CARD_BG,
    },
    pinPhotoSingle: {
        width: '100%',
        height: 180,
        borderRadius: 8,
    },
    morePhotosBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    morePhotosBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    myPinContent: {
        padding: 14,
    },
    myPinHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    myPinTitle: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 4,
    },
    myPinDate: {
        color: SUBTLE_TEXT,
        fontSize: 12,
        marginTop: 4,
    },
    myPinActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    privateBadge: {
        backgroundColor: 'rgba(142,142,147,0.2)',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    editButton: {
        padding: 4,
    },
    myPinJournal: {
        color: SUBTLE_TEXT,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 10,
    },
    myPinFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
});
