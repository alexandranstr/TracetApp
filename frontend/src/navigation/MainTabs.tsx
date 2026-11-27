import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AiChatScreen from '../features/ai/screens/AiChatScreen';
import { useAuthSync } from '../features/auth/useAuthSync';
import JournalScreen from '../features/journal/screens/JournalScreen';
import MapScreen from '../features/map/screens/MapScreen';
import ProfileScreen from '../features/profile/screens/ProfileScreen';
import TabBar, { Tab } from './TabBar';

export default function MainTabs({ navigation, route }: any) {
    const { userId, ready } = useAuthSync(route?.params?.currentUserId ?? null);
    const [activeTab, setActiveTab] = useState<Tab>('Map');

    return (
        <View style={styles.container}>
            {activeTab === 'Map' && <MapScreen navigation={navigation} userId={userId} ready={ready} />}
            {activeTab === 'AIChat' && <AiChatScreen />}
            {activeTab === 'Journal' && <JournalScreen currentUserId={userId} />}
            {activeTab === 'Profile' && <ProfileScreen currentUserId={userId} navigation={navigation} />}
            <TabBar active={activeTab} onChange={setActiveTab} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
});
