import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PINK_ACCENT = '#FF2D55';
const DARK_BG = '#1C1C1E';

interface MapHeaderButtonsProps {
    pendingRequests: number;
    unreadMessages: number;
    onFriends: () => void;
    onMessages: () => void;
    onSharedHistory: () => void;
}

export default function MapHeaderButtons({
    pendingRequests,
    unreadMessages,
    onFriends,
    onMessages,
    onSharedHistory,
}: MapHeaderButtonsProps) {
    return (
        <View style={styles.headerButtons}>
            <RoundButton icon="people" badge={pendingRequests} onPress={onFriends} />
            <RoundButton icon="chatbubbles" badge={unreadMessages} onPress={onMessages} />
            <RoundButton icon="globe" onPress={onSharedHistory} />
        </View>
    );
}

interface RoundButtonProps {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    badge?: number;
    onPress: () => void;
}

function RoundButton({ icon, badge = 0, onPress }: RoundButtonProps) {
    return (
        <TouchableOpacity style={styles.iconButton} onPress={onPress}>
            <Ionicons name={icon} size={20} color="#FFFFFF" />
            {badge > 0 && (
                <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    headerButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: DARK_BG,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    badgeContainer: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: PINK_ACCENT,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: DARK_BG,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
    },
});
