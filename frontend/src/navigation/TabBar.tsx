import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PINK_ACCENT = '#FF2D55';
const DARK_BG = '#1C1C1E';

export type Tab = 'Map' | 'AIChat' | 'Journal' | 'Profile';

const TABS: { tab: Tab; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { tab: 'Map', label: 'Map', icon: 'map' },
    { tab: 'AIChat', label: 'AI Chat', icon: 'sparkles' },
    { tab: 'Journal', label: 'Journal', icon: 'book' },
    { tab: 'Profile', label: 'Profile', icon: 'person' },
];

interface TabBarProps {
    active: Tab;
    onChange: (tab: Tab) => void;
}

export default function TabBar({ active, onChange }: TabBarProps) {
    return (
        <View style={styles.bar}>
            {TABS.map(({ tab, label, icon }) => (
                <TouchableOpacity key={tab} style={styles.item} onPress={() => onChange(tab)}>
                    <Ionicons name={icon} size={22} color={active === tab ? PINK_ACCENT : '#8E8E93'} />
                    <Text style={[styles.label, active === tab && styles.activeLabel]}>{label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 28 : 20,
        left: 20,
        right: 20,
        height: 64,
        backgroundColor: DARK_BG,
        borderRadius: 32,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
    },
    item: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    label: {
        color: '#8E8E93',
        fontSize: 11,
        marginTop: 3,
        fontWeight: '500',
    },
    activeLabel: {
        color: PINK_ACCENT,
        fontWeight: '700',
    },
});
