import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pin } from '../../pins/types';
import EditPinModal from '../components/EditPinModal';
import JournalPinCard from '../components/JournalPinCard';
import JournalStats from '../components/JournalStats';
import Pagination from '../components/Pagination';
import { useJournal } from '../useJournal';

const PINK_ACCENT = '#FF2D55';
const SUBTLE_TEXT = '#8E8E93';

export default function JournalScreen({ currentUserId }: { currentUserId?: string | null }) {
    const { statistics, pins, pagination, loading, goToPage, replacePin } = useJournal(currentUserId);
    const [editingPin, setEditingPin] = useState<Pin | null>(null);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={PINK_ACCENT} />
                <Text style={styles.loadingText}>Loading your journal...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <View style={styles.headerIconContainer}>
                    <Ionicons name="book" size={36} color="#FFFFFF" />
                </View>
                <Text style={styles.headerTitle}>Your Travel Journal</Text>
                <Text style={styles.headerSubtitle}>
                    {statistics?.totalPins || 0} pins across {statistics?.countriesVisited || 0} countries
                </Text>
            </View>

            <JournalStats statistics={statistics} />

            <View style={styles.historySection}>
                <View style={styles.historyHeader}>
                    <Text style={styles.sectionTitle}>Your Pins</Text>
                    <Text style={styles.pinCountText}>
                        {pagination.totalItems > 0 ? `${pagination.totalItems} pin${pagination.totalItems !== 1 ? 's' : ''}` : ''}
                    </Text>
                </View>

                {pins.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="pin-outline" size={48} color={SUBTLE_TEXT} />
                        <Text style={styles.emptyTitle}>No pins yet</Text>
                        <Text style={styles.emptySubtitle}>
                            Start adding pins to see your travel history here!
                        </Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.timeline}>
                            {pins.map((pin) => (
                                <JournalPinCard key={pin.id} pin={pin} onEdit={setEditingPin} />
                            ))}
                        </View>
                        {pagination.totalPages > 1 && <Pagination pagination={pagination} onPageChange={goToPage} />}
                    </>
                )}
            </View>

            <EditPinModal
                pin={editingPin}
                onClose={() => setEditingPin(null)}
                onSaved={(pin) => {
                    replacePin(pin);
                    setEditingPin(null);
                }}
            />

            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: SUBTLE_TEXT,
        fontSize: 16,
        marginTop: 12,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(255, 45, 85, 0.08)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: PINK_ACCENT,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: PINK_ACCENT,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
        marginTop: 20,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 26,
        fontWeight: '700',
        marginTop: 16,
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        color: '#8E8E93',
        fontSize: 15,
        marginTop: 6,
        fontWeight: '500',
    },
    sectionTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    historySection: {
        paddingHorizontal: 16,
        paddingTop: 24,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 12,
    },
    emptySubtitle: {
        color: SUBTLE_TEXT,
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 40,
        marginTop: 8,
    },
    timeline: {
        gap: 24,
    },
    pinCountText: {
        color: SUBTLE_TEXT,
        fontSize: 14,
    },
});
