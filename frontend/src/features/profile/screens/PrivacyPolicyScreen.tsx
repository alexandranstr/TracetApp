import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    StatusBar,
    TouchableOpacity,
} from 'react-native';

export default function PrivacyPolicyScreen({ navigation }: any) {
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation?.goBack()}
                    style={styles.backButton}
                >
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Privacy Policy</Text>
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.lastUpdated}>Last updated: November 20, 2026</Text>

                <Text style={styles.sectionTitle}>1. Introduction</Text>
                <Text style={styles.text}>
                    Tracet ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application ("the App").
                </Text>

                <Text style={styles.sectionTitle}>2. Information We Collect</Text>
                <Text style={styles.text}>
                    <Text style={styles.bold}>Account Information:</Text> When you create an account, we collect your email address, display name, and optionally your phone number and profile photo.
                </Text>
                <Text style={styles.text}>
                    <Text style={styles.bold}>Location Data:</Text> When you add pins to the App, we collect the location name, city, country, coordinates, and category you select. This data is stored to provide personalized travel recommendations.
                </Text>
                <Text style={styles.text}>
                    <Text style={styles.bold}>Travel History:</Text> We store your saved pins, ratings, journal entries, and tags associated with places you visit.
                </Text>
                <Text style={styles.text}>
                    <Text style={styles.bold}>Chat Messages:</Text> Messages you send to other users and AI chat conversations are stored on our servers.
                </Text>
                <Text style={styles.text}>
                    <Text style={styles.bold}>Usage Data:</Text> We may collect information about how you use the App, including features accessed and interaction patterns.
                </Text>

                <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
                <Text style={styles.text}>
                    • Provide, maintain, and improve the App functionality
                </Text>
                <Text style={styles.text}>
                    • Personalize your travel recommendations through our AI assistant (Gemini/Tracey)
                </Text>
                <Text style={styles.text}>
                    • Enable communication between users through the messaging feature
                </Text>
                <Text style={styles.text}>
                    • Send you notifications and updates about the App
                </Text>

                <Text style={styles.sectionTitle}>4. AI Assistant (Gemini)</Text>
                <Text style={styles.text}>
                    When you use the AI chat feature, we send your saved pins (location names, cities, countries, categories, ratings, and tags), your interests (tags), and chat history to Google's Gemini API to generate personalized travel recommendations. We do not send your email, phone number, or exact GPS coordinates to Gemini. Your chat conversations with AI are stored on our servers.
                </Text>

                <Text style={styles.sectionTitle}>5. Data Sharing</Text>
                <Text style={styles.text}>
                    • Your pins and profile information may be visible to your friends on the App, unless you mark them as private.
                </Text>
                <Text style={styles.text}>
                    • We do not sell your personal information to third parties.
                </Text>
                <Text style={styles.text}>
                    • We may share your information with service providers who assist us in operating the App (e.g., Firebase for authentication, Google for AI services).
                </Text>

                <Text style={styles.sectionTitle}>6. Data Retention</Text>
                <Text style={styles.text}>
                    We retain your data for as long as your account is active. When you delete your account, all your personal data (pins, messages, chat history, friendships) is permanently deleted from our servers.
                </Text>

                <Text style={styles.sectionTitle}>7. Your Rights (GDPR)</Text>
                <Text style={styles.text}>
                    If you are located in the European Union, you have the following rights under GDPR:
                </Text>
                <Text style={styles.text}>
                    • Right to access your personal data
                </Text>
                <Text style={styles.text}>
                    • Right to rectification of inaccurate data
                </Text>
                <Text style={styles.text}>
                    • Right to erasure ("right to be forgotten")
                </Text>
                <Text style={styles.text}>
                    • Right to restrict processing
                </Text>
                <Text style={styles.text}>
                    • Right to data portability
                </Text>
                <Text style={styles.text}>
                    • Right to object to processing
                </Text>
                <Text style={styles.text}>
                    To exercise these rights, please contact us at privacy@tracet.app.
                </Text>

                <Text style={styles.sectionTitle}>8. Account Deletion</Text>
                <Text style={styles.text}>
                    You can delete your account at any time from the App settings. Upon deletion, all your personal data including pins, messages, AI chat history, and friendships will be permanently removed from our servers.
                </Text>

                <Text style={styles.sectionTitle}>9. Children's Privacy</Text>
                <Text style={styles.text}>
                    The App is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
                </Text>

                <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
                <Text style={styles.text}>
                    We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy in the App and updating the "Last updated" date.
                </Text>

                <Text style={styles.sectionTitle}>11. Contact Us</Text>
                <Text style={styles.text}>
                    If you have any questions about this Privacy Policy, please contact us at privacy@tracet.app.
                </Text>

                <View style={styles.bottomSpacer} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0D0E12',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(239, 234, 225, 0.12)',
    },
    backButton: {
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    backButtonText: {
        color: '#FF4B82',
        fontSize: 16,
        fontWeight: '600',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        color: '#E2E8F0',
        fontSize: 18,
        fontWeight: '700',
        marginRight: 40,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    lastUpdated: {
        color: '#94A3B8',
        fontSize: 13,
        fontStyle: 'italic',
        marginBottom: 24,
    },
    sectionTitle: {
        color: '#E2E8F0',
        fontSize: 17,
        fontWeight: '700',
        marginTop: 24,
        marginBottom: 8,
    },
    text: {
        color: '#CBD5E1',
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 6,
    },
    bold: {
        fontWeight: '600',
        color: '#E2E8F0',
    },
    bottomSpacer: {
        height: 40,
    },
});
