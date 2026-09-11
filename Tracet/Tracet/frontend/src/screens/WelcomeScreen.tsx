import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Image,
    Dimensions
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: any) {
    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" />

            {}
            <View style={styles.backgroundContainer} pointerEvents="none">
                <Svg height={height} width={width} viewBox={`0 0 ${width} ${height}`}>
                    {}
                    <Path
                        d={`M -50 ${height * 0.22} C ${width * 0.35} ${height * 0.18}, ${width * 0.45} ${height * 0.42}, ${width + 50} ${height * 0.48}`}
                        stroke="#EFEAE1" strokeWidth="2.8" strokeOpacity="0.18" fill="none"
                    />
                    <Path
                        d={`M ${width * 0.38} ${height * 0.28} C ${width * 0.65} ${height * 0.32}, ${width * 0.75} ${height * 0.45}, ${width + 50} ${height * 0.58}`}
                        stroke="#EFEAE1" strokeWidth="1.6" strokeOpacity="0.14" fill="none"
                    />

                    {}
                    <Path
                        d={`M -50 ${height * 0.70} C ${width * 0.3} ${height * 0.65}, ${width * 0.6} ${height * 0.85}, ${width + 50} ${height * 0.78}`}
                        stroke="#EFEAE1" strokeWidth="2.2" strokeOpacity="0.16" fill="none"
                    />

                    {}
                    <Path d={`M ${width * 0.15} -20 L ${width * 0.85} ${height + 20}`} stroke="#EFEAE1" strokeWidth="2" strokeOpacity="0.15" fill="none" />
                    <Path d={`M ${width * 0.8} -20 L ${width * 0.1} ${height + 20}`} stroke="#EFEAE1" strokeWidth="1.5" strokeOpacity="0.12" fill="none" />
                    <Path d={`M ${width * 0.4} -20 L ${width * 0.95} ${height + 20}`} stroke="#EFEAE1" strokeWidth="1.8" strokeOpacity="0.14" fill="none" />
                    <Path d={`M ${width * 0.6} -20 L -20 ${height * 0.7}`} stroke="#EFEAE1" strokeWidth="1.5" strokeOpacity="0.12" fill="none" />
                    <Path d={`M -20 ${height * 0.35} L ${width * 0.75} ${height + 20}`} stroke="#EFEAE1" strokeWidth="1.4" strokeOpacity="0.13" fill="none" />

                    {}
                    <Path d={`M -20 ${height * 0.08} L ${width + 20} ${height * 0.18}`} stroke="#EFEAE1" strokeWidth="1.5" strokeOpacity="0.12" fill="none" />
                    <Path d={`M -20 ${height * 0.15} L ${width + 20} ${height * 0.35}`} stroke="#EFEAE1" strokeWidth="1.5" strokeOpacity="0.12" fill="none" />
                    <Path d={`M -20 ${height * 0.38} L ${width + 20} ${height * 0.28}`} stroke="#EFEAE1" strokeWidth="1.5" strokeOpacity="0.12" fill="none" />
                    <Path d={`M -20 ${height * 0.48} L ${width + 20} ${height * 0.62}`} stroke="#EFEAE1" strokeWidth="1.8" strokeOpacity="0.14" fill="none" />
                    <Path d={`M -20 ${height * 0.65} L ${width + 20} ${height * 0.8}`} stroke="#EFEAE1" strokeWidth="2" strokeOpacity="0.15" fill="none" />
                    <Path d={`M -20 ${height * 0.82} L ${width * 0.6} ${height + 20}`} stroke="#EFEAE1" strokeWidth="1.5" strokeOpacity="0.12" fill="none" />
                    <Path d={`M -20 ${height * 0.92} L ${width + 20} ${height * 0.88}`} stroke="#EFEAE1" strokeWidth="1.5" strokeOpacity="0.12" fill="none" />

                    {}
                    <Path d={`M ${width * 0.7} ${height * 0.3} L ${width + 20} ${height * 0.2}`} stroke="#EFEAE1" strokeWidth="1.2" strokeOpacity="0.1" fill="none" />
                    <Path d={`M ${width * 0.05} ${height * 0.02} L ${width * 0.45} ${height * 0.22}`} stroke="#EFEAE1" strokeWidth="1.2" strokeOpacity="0.1" fill="none" />
                    <Path d={`M ${width * 0.3} ${height * 0.55} L ${width * 0.85} ${height * 0.45}`} stroke="#EFEAE1" strokeWidth="1.2" strokeOpacity="0.1" fill="none" />
                    <Path d={`M ${width * 0.1} ${height * 0.75} L ${width * 0.5} ${height * 0.95}`} stroke="#EFEAE1" strokeWidth="1.2" strokeOpacity="0.1" fill="none" />
                    <Path d={`M ${width * 0.6} ${height * 0.6} L ${width + 20} ${height * 0.95}`} stroke="#EFEAE1" strokeWidth="1.5" strokeOpacity="0.12" fill="none" />
                    <Path d={`M ${width * 0.25} ${height * 0.12} L ${width * 0.8} ${height * 0.05}`} stroke="#EFEAE1" strokeWidth="1.3" strokeOpacity="0.11" fill="none" />
                    <Path d={`M ${width * 0.45} ${height * 0.78} L ${width + 20} ${height * 0.72}`} stroke="#EFEAE1" strokeWidth="1.3" strokeOpacity="0.11" fill="none" />
                </Svg>
            </View>

            {}
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.heroContainer}>
                    <View style={styles.logoWrapper}>
                        <Image
                            source={require('../../assets/logo-dark.png')}
                            style={styles.logoImage}
                            resizeMode="cover"
                        />
                    </View>

                    <Text style={styles.tagline}>
                        EVERY PLACE LEAVES A MARK.{'\n'}
                        <Text style={styles.taglineHighlight}>TRACE YOURS.</Text>
                    </Text>
                </View>

                <View style={styles.actionContainer}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        activeOpacity={0.85}
                        onPress={() => navigation?.navigate('SignUp')}
                    >
                        <Text style={styles.primaryButtonText}>Create Account</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.textButton}
                        activeOpacity={0.7}
                        onPress={() => navigation?.navigate('SignIn')}
                    >
                        <Text style={styles.secondaryText}>
                            I already have an account. <Text style={styles.signInLink}>Sign In</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#0D0E12',
    },
    backgroundContainer: {
        ...StyleSheet.absoluteFill,
        zIndex: 1,
    },
    safeArea: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        zIndex: 10,
        elevation: 10,
    },
    heroContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: '100%',
        paddingTop: height * 0.16,
    },
    logoWrapper: {
        width: 162,
        height: 162,
        borderRadius: 81,
        overflow: 'hidden',
        backgroundColor: '#0D0E12',
        marginBottom: 20,
        borderWidth: 1.5,
        borderColor: 'rgba(239, 234, 225, 0.25)',
        shadowColor: '#FF4B82',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 18,
        elevation: 8,
    },
    logoImage: {
        width: '115%', 
        height: '108%',
        marginLeft: '-7%',
        marginTop: '-5%',
        marginBottom: '-5%'
    },
    tagline: {
        fontFamily: 'System',
        fontSize: 13,
        fontWeight: '600',
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 20,
        letterSpacing: 2,
    },
    taglineHighlight: {
        color: '#E2E8F0',
        fontWeight: '700',
    },
    actionContainer: {
        width: '100%',
        alignItems: 'center',
        paddingBottom: 85,
        gap: 16,
    },
    primaryButton: {
        backgroundColor: '#FF4B82',
        width: width * 0.74,
        paddingVertical: 15,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: '#FF4B82',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 5,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    textButton: {
        paddingVertical: 6,
        alignItems: 'center',
    },
    secondaryText: {
        color: '#94A3B8',
        fontSize: 14,
        fontWeight: '400',
    },
    signInLink: {
        color: '#FF4B82',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});