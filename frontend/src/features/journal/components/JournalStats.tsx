import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PinStatistics } from '../../pins/types';
import { monthName } from '../format';

const PINK_ACCENT = '#FF2D55';
const PURPLE_ACCENT = '#AF52DE';
const CARD_BG = '#2C2C2E';
const SUBTLE_TEXT = '#8E8E93';

export default function JournalStats({ statistics }: { statistics: PinStatistics | null }) {
    const maxMonthlyPins = statistics?.pinsByMonth.reduce((max, m) => Math.max(max, m.count), 0) || 1;

    return (
            <View style={styles.statsSection}>
                <Text style={styles.sectionTitle}>Your Travel Stats</Text>

                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255, 45, 85, 0.2)' }]}>
                            <Ionicons name="location" size={22} color={PINK_ACCENT} />
                        </View>
                        <Text style={styles.statValue}>{statistics?.totalPins || 0}</Text>
                        <Text style={styles.statLabel}>Total Pins</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: 'rgba(175, 82, 222, 0.2)' }]}>
                            <Ionicons name="globe" size={22} color={PURPLE_ACCENT} />
                        </View>
                        <Text style={styles.statValue}>{statistics?.countriesVisited || 0}</Text>
                        <Text style={styles.statLabel}>Countries</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.2)' }]}>
                            <Ionicons name="business" size={22} color="#FF9500" />
                        </View>
                        <Text style={styles.statValue}>{statistics?.citiesVisited || 0}</Text>
                        <Text style={styles.statLabel}>Cities</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255, 214, 10, 0.2)' }]}>
                            <Ionicons name="star" size={22} color="#FFD60A" />
                        </View>
                        <Text style={styles.statValue}>{statistics?.averageRating?.toFixed(1) || '0'}</Text>
                        <Text style={styles.statLabel}>Avg Rating</Text>
                    </View>
                </View>

                {statistics?.pinsByMonth && statistics.pinsByMonth.some(m => m.count > 0) && (
                    <View style={styles.chartCard}>
                        <View style={styles.chartHeader}>
                            <Ionicons name="trending-up" size={18} color={PINK_ACCENT} />
                            <Text style={styles.chartTitle}>Activity (Last 12 Months)</Text>
                        </View>
                        <View style={styles.chartContainer}>
                            {statistics.pinsByMonth.map((month, index) => {
                                const isActive = month.count > 0;
                                return (
                                    <View key={index} style={styles.chartBarContainer}>
                                        {isActive && (
                                            <Text style={styles.chartValue}>{month.count}</Text>
                                        )}
                                        <View style={styles.chartBar}>
                                            <View
                                                style={[
                                                    styles.chartFill,
                                                    {
                                                        height: `${(month.count / maxMonthlyPins) * 100}%`,
                                                        opacity: isActive ? 1 : 0.15
                                                    }
                                                ]}
                                            />
                                        </View>
                                        <Text style={[styles.chartLabel, isActive && styles.chartLabelActive]}>{monthName(month.month)}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {statistics?.topCountries && statistics.topCountries.length > 0 && (
                    <View style={styles.listCard}>
                        <Text style={styles.listTitle}>Top Countries</Text>
                        {statistics.topCountries.map((item, index) => (
                            <View key={index} style={styles.listItem}>
                                <View style={styles.listItemLeft}>
                                    <View style={[styles.rankBadge, { backgroundColor: index === 0 ? '#FFD60A' : index === 1 ? '#8E8E93' : '#FF9500' }]}>
                                        <Text style={styles.rankText}>{index + 1}</Text>
                                    </View>
                                    <Text style={styles.listItemText}>{item.country}</Text>
                                </View>
                                <Text style={styles.listItemCount}>{item.count} pins</Text>
                            </View>
                        ))}
                    </View>
                )}

                {statistics?.topCities && statistics.topCities.length > 0 && (
                    <View style={styles.listCard}>
                        <Text style={styles.listTitle}>Top Cities</Text>
                        {statistics.topCities.map((item, index) => (
                            <View key={index} style={styles.listItem}>
                                <View style={styles.listItemLeft}>
                                    <Text style={styles.listItemText}>{item.city}</Text>
                                </View>
                                <Text style={styles.listItemCount}>{item.count}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {statistics?.topCategories && statistics.topCategories.length > 0 && (
                    <View style={styles.listCard}>
                        <Text style={styles.listTitle}>Favorite Categories</Text>
                        {statistics.topCategories.map((item, index) => (
                            <View key={index} style={styles.listItem}>
                                <View style={styles.listItemLeft}>
                                    <Text style={styles.listItemText}>{item.category}</Text>
                                </View>
                                <Text style={styles.listItemCount}>{item.count}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {statistics?.topTags && statistics.topTags.length > 0 && (
                    <View style={styles.listCard}>
                        <Text style={styles.listTitle}>Most Used Tags</Text>
                        <View style={styles.tagsContainer}>
                            {statistics.topTags.map((tag, index) => (
                                <View key={index} style={styles.tagChip}>
                                    <Text style={styles.tagText}>{tag.tagName}</Text>
                                    <Text style={styles.tagCount}>{tag.count}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </View>
    );
}

const styles = StyleSheet.create({
    statsSection: {
        paddingHorizontal: 16,
        paddingTop: 24,
    },
    sectionTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    statCard: {
        width: '48%',
        backgroundColor: 'rgba(44, 44, 46, 0.8)',
        borderRadius: 20,
        padding: 18,
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    statValue: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '700',
        marginTop: 4,
    },
    statLabel: {
        color: '#8E8E93',
        fontSize: 13,
        marginTop: 6,
        fontWeight: '500',
    },
    chartCard: {
        backgroundColor: 'rgba(44, 44, 46, 0.8)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    chartHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    chartTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    chartContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 140,
    },
    chartBarContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    chartBar: {
        width: 14,
        height: 90,
        backgroundColor: 'rgba(255, 45, 85, 0.1)',
        borderRadius: 7,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    chartFill: {
        width: '100%',
        backgroundColor: PINK_ACCENT,
        borderRadius: 7,
        position: 'absolute',
        bottom: 0,
    },
    chartLabel: {
        color: SUBTLE_TEXT,
        fontSize: 10,
        marginTop: 8,
        fontWeight: '400',
    },
    chartLabelActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    chartValue: {
        color: PINK_ACCENT,
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 6,
    },
    listCard: {
        backgroundColor: CARD_BG,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    listTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    listItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    listItemText: {
        color: '#FFFFFF',
        fontSize: 14,
    },
    listItemCount: {
        color: SUBTLE_TEXT,
        fontSize: 13,
    },
    rankBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankText: {
        color: '#000000',
        fontSize: 11,
        fontWeight: '700',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tagChip: {
        backgroundColor: 'rgba(175, 82, 222, 0.2)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tagText: {
        color: PURPLE_ACCENT,
        fontSize: 13,
        fontWeight: '500',
    },
    tagCount: {
        color: PURPLE_ACCENT,
        fontSize: 11,
        opacity: 0.7,
    },
});
