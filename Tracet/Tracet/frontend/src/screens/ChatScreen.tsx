import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    ScrollView,
    TouchableOpacity,
    Image,
    SafeAreaView,
    KeyboardAvoidingView,
    StatusBar,
    ActivityIndicator,
    Modal,
    Dimensions,
    TouchableWithoutFeedback,
    Keyboard,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { getAuth } from '@react-native-firebase/auth';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL } from '../config';
import * as signalR from '@microsoft/signalr';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PINK_ACCENT = '#FF2D55';

const BACKGROUND_THEMES = [
    { id: 'default', name: 'Default Dark', source: null },
    { id: 'theme1', name: 'Theme 1', source: require('../../assets/background/theme1.jpg') },
    { id: 'theme2', name: 'Theme 2', source: require('../../assets/background/theme2.jpg') },
    { id: 'theme3', name: 'Theme 3', source: require('../../assets/background/theme3.jpg') },
    { id: 'theme4', name: 'Theme 4', source: require('../../assets/background/theme4.jpg') },
    { id: 'theme5', name: 'Theme 5', source: require('../../assets/background/theme5.jpg') },
    { id: 'theme6', name: 'Theme 6', source: require('../../assets/background/theme6.jpg') },
];

const MESSAGE_COLORS = [
    { name: 'Pink', value: '#FF2D55' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Teal', value: '#14B8A6' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Rose', value: '#F43F5E' },
    { name: 'Cyan', value: '#06B6D4' },
    { name: 'Lime', value: '#84CC16' },
    { name: 'Amber', value: '#F59E0B' },
];

const getResolvedImageUri = (photoUrl?: string) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
        return photoUrl;
    }
    if (photoUrl.startsWith('uploads/') || photoUrl.startsWith('/uploads/')) {
        return `${API_BASE_URL}${photoUrl.startsWith('/') ? '' : '/'}${photoUrl}`;
    }
    const fileName = photoUrl.split('/').pop();
    return `${FileSystem.documentDirectory}${fileName}`;
};

interface ChatMessage {
    id: number;
    senderId: string;
    text: string;
    imageUrl?: string;
    isRead?: boolean;
    sentAt: string;
}

export default function ChatScreen({ navigation, route }: any) {
    const { conversationId: initialConvId, partnerId, partnerName, partnerPhoto, currentUserId } = route.params || {};

    const [conversationId, setConversationId] = useState<number | null>(initialConvId || null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [backgroundTheme, setBackgroundTheme] = useState<string>('default');
    const [messageColor, setMessageColor] = useState<string>('#FF2D55');

    const [isThemeModalVisible, setIsThemeModalVisible] = useState(false);
    const [selectedThemeCandidate, setSelectedThemeCandidate] = useState<string>('default');
    const [selectedColorCandidate, setSelectedColorCandidate] = useState<string>('#FF2D55');

    const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [imageCaption, setImageCaption] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);

    const [viewingFullImage, setViewingFullImage] = useState<string | null>(null);

    const [partnerTyping, setPartnerTyping] = useState(false);
    const [signalRConnection, setSignalRConnection] = useState<signalR.HubConnection | null>(null);

    const scrollViewRef = useRef<ScrollView>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const typingSendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const getAuthToken = async () => {
        try {
            const user = getAuth().currentUser;
            if (!user) return null;
            return await user.getIdToken();
        } catch (err) {
            console.log('Error getting auth token:', err);
            return null;
        }
    };


    const setupSignalR = useCallback(async (convId: number) => {
        try {
            const user = getAuth().currentUser;
            if (!user) return;
            const token = await user.getIdToken();

            const connection = new signalR.HubConnectionBuilder()
                .withUrl(`${API_BASE_URL}/chathub`, {
                    accessTokenFactory: () => token
                })
                .withAutomaticReconnect()
                .build();

            connection.on('ReceiveMessage', async (msg: any) => {
                if (msg.conversationId === convId) {
                    setMessages((prev) => {
                        if (prev.find(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });

                    if (msg.senderId !== currentUserId) {
                        try {
                            await fetch(`${API_BASE_URL}/api/messages/mark-message-read`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ messageId: msg.id, conversationId: convId })
                            });
                        } catch (e) {
                            console.log('Error marking message read:', e);
                        }
                    }
                }
            });

            connection.on('UserTyping', (userId: string) => {
                if (userId === partnerId) {
                    setPartnerTyping(true);
                }
            });

            connection.on('UserStopTyping', (userId: string) => {
                if (userId === partnerId) {
                    setPartnerTyping(false);
                }
            });

            connection.on('MessageMarkedRead', (messageId: number, readBy: string) => {
                if (readBy === partnerId) {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === messageId ? { ...m, isRead: true } : m
                        )
                    );
                }
            });

            connection.on('MessagesMarkedRead', (convIdFromServer: number, readBy: string) => {
                if (convIdFromServer === convId && readBy === partnerId) {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.senderId !== currentUserId ? { ...m, isRead: true } : m
                        )
                    );
                }
            });

            await connection.start();
            await connection.invoke('JoinConversation', convId);
            setSignalRConnection(connection);
        } catch (err) {
            console.log('SignalR connection error:', err);
        }
    }, [currentUserId, partnerId]);

    const sendTypingStatus = useCallback(() => {
        if (signalRConnection && conversationId && signalRConnection.state === signalR.HubConnectionState.Connected) {
            signalRConnection.invoke('StartTyping', conversationId).catch(console.log);
        }
    }, [signalRConnection, conversationId]);

    useFocusEffect(
        useCallback(() => {
            const initChat = async () => {
                try {
                    let activeId = conversationId;
                    const token = await getAuthToken();
                    const authHeaders: Record<string, string> = {
                        'Content-Type': 'application/json'
                    };
                    if (token) {
                        authHeaders['Authorization'] = `Bearer ${token}`;
                    }

                    if (!activeId && partnerId) {
                        const res = await fetch(`${API_BASE_URL}/api/messages/get-or-create`, {
                            method: 'POST',
                            headers: authHeaders,
                            body: JSON.stringify({ partnerId })
                        });

                        if (res.ok) {
                            const data = await res.json();
                            activeId = data.conversationId;
                            setConversationId(activeId);
                            if (data.backgroundTheme) {
                                setBackgroundTheme(data.backgroundTheme);
                                setSelectedThemeCandidate(data.backgroundTheme);
                            }
                            if (data.messageColor) {
                                setMessageColor(data.messageColor);
                                setSelectedColorCandidate(data.messageColor);
                            }
                        }
                    }

                    if (activeId) {
                        const historyRes = await fetch(`${API_BASE_URL}/api/messages/history/${activeId}`, {
                            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
                        });
                        if (historyRes.ok) {
                            const historyData = await historyRes.json();
                            setMessages(historyData.messages || []);
                            if (historyData.backgroundTheme) {
                                setBackgroundTheme(historyData.backgroundTheme);
                                setSelectedThemeCandidate(historyData.backgroundTheme);
                            }
                            if (historyData.messageColor) {
                                setMessageColor(historyData.messageColor);
                                setSelectedColorCandidate(historyData.messageColor);
                            }
                        }

                        await fetch(`${API_BASE_URL}/api/messages/mark-as-read`, {
                            method: 'POST',
                            headers: authHeaders,
                            body: JSON.stringify({ conversationId: activeId })
                        });

                        setupSignalR(activeId);
                    }
                } catch (err) {
                    console.log('Error initializing chat:', err);
                } finally {
                    setLoading(false);
                }
            };

            initChat();

            return () => {
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                if (typingSendTimeoutRef.current) clearTimeout(typingSendTimeoutRef.current);
            };
        }, [])
    );

    useEffect(() => {
        if (conversationId && !initialConvId && signalRConnection === null) {
            setupSignalR(conversationId);
        }
    }, [conversationId, initialConvId, signalRConnection, setupSignalR]);

    useEffect(() => {
        return () => {
            if (signalRConnection) {
                if (conversationId) {
                    signalRConnection.invoke('LeaveConversation', conversationId).catch(console.log);
                }
                signalRConnection.stop().catch(console.log);
            }
        };
    }, [signalRConnection, conversationId]);

    useEffect(() => {
        if (isThemeModalVisible) {
            setSelectedThemeCandidate(backgroundTheme);
            setSelectedColorCandidate(messageColor);
        }
    }, [isThemeModalVisible, backgroundTheme, messageColor]);

    const handleInputChange = (text: string) => {
        setInputText(text);
        sendTypingStatus();

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            if (signalRConnection && conversationId && signalRConnection.state === signalR.HubConnectionState.Connected) {
                signalRConnection.invoke('StopTyping', conversationId).catch(console.log);
            }
        }, 2000);
    };

    const sendMessage = async () => {
        if (!inputText.trim()) return;

        let activeConvId = conversationId;
        const textToSend = inputText.trim();
        setInputText('');

        try {
            const token = await getAuthToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`${API_BASE_URL}/api/messages/send`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    conversationId: activeConvId,
                    text: textToSend
                })
            });

            if (res.ok) {
                const newMsg = await res.json();
                setMessages((prev) => {
                    if (prev.find(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
            }
        } catch (err) {
            console.log('Error sending message:', err);
        }
    };

    const pickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) return;

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'] as ImagePicker.MediaType[],
                allowsEditing: false,
                quality: 0.8,
                preferredAssetRepresentationMode:
                    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                let finalUri = asset.uri;

                // Try ImageManipulator first to convert to JPEG
                // This works for most images and provides compression
                try {
                    const manipResult = await ImageManipulator.manipulateAsync(
                        asset.uri,
                        [],
                        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                    );
                    finalUri = manipResult.uri;
                    setSelectedImage({ ...asset, uri: finalUri });
                    return;
                } catch (manipErr) {
                    console.log('Image manipulation failed, trying base64 fallback:', manipErr);
                }

                // Fallback: read the image as base64 and write to a new file
                // This handles ph:// URIs and formats that ImageManipulator can't process
                try {
                    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                    const fileName = `picked_${Date.now()}.jpg`;
                    const targetPath = `${FileSystem.documentDirectory}${fileName}`;
                    await FileSystem.writeAsStringAsync(targetPath, base64, {
                        encoding: FileSystem.EncodingType.Base64,
                    });
                    finalUri = targetPath;
                } catch (fallbackErr) {
                    console.log('Base64 fallback failed, using original URI:', fallbackErr);
                }

                setSelectedImage({ ...asset, uri: finalUri });
            }
        } catch (err) {
            console.log('Error picking image:', err);
        }
    };

    const confirmAndSendImage = async () => {
        if (!selectedImage) return;

        setUploadingImage(true);
        Keyboard.dismiss();

        try {
            let activeConvId = conversationId;
            const captionToSend = imageCaption.trim() || 'Photo';
            const token = await getAuthToken();

            const uploadHeaders: Record<string, string> = { 'Accept': 'application/json' };
            if (token) {
                uploadHeaders['Authorization'] = `Bearer ${token}`;
            }

            const uploadTask = FileSystem.createUploadTask(
                `${API_BASE_URL}/api/messages/send-image`,
                selectedImage.uri,
                {
                    httpMethod: 'POST',
                    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                    fieldName: 'image',
                    parameters: {
                        conversationId: activeConvId!.toString(),
                        text: captionToSend,
                    },
                    headers: uploadHeaders,
                }
            );

            const result = await uploadTask.uploadAsync();

            if (result && result.status >= 200 && result.status < 300) {
                const newMsg = JSON.parse(result.body);
                setMessages((prev) => {
                    if (prev.find(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
                setSelectedImage(null);
                setImageCaption('');
            }
        } catch (err) {
            console.log('Error sending image:', err);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSaveTheme = async () => {
        if (!conversationId) return;
        try {
            const token = await getAuthToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`${API_BASE_URL}/api/messages/update-theme`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    conversationId,
                    theme: selectedThemeCandidate,
                    messageColor: selectedColorCandidate
                })
            });
            if (res.ok) {
                setBackgroundTheme(selectedThemeCandidate);
                setMessageColor(selectedColorCandidate);
                setIsThemeModalVisible(false);
            }
        } catch (err) {
            console.log('Error updating theme:', err);
        }
    };

    const formatMessageTime = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getDateLabel = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();

        if (date.toDateString() === now.toDateString()) return 'Today';
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const renderHeaderAvatar = () => {
        const resolvedUri = getResolvedImageUri(partnerPhoto);
        if (resolvedUri) {
            return <Image source={{ uri: resolvedUri }} style={styles.avatar} />;
        }
        return (
            <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={18} color="#A1A1AA" />
            </View>
        );
    };

    const renderMessageList = () => {
        let lastDateLabel = '';

        return messages.map((item, index) => {
            const currentDateLabel = getDateLabel(item.sentAt);
            let showDateHeader = false;

            if (currentDateLabel !== lastDateLabel) {
                lastDateLabel = currentDateLabel;
                showDateHeader = true;
            }

            const isMe = item.senderId === currentUserId;
            const imageUri = getResolvedImageUri(item.imageUrl);
            const decryptedText = item.text;
            const isRead = item.isRead ?? false;

            return (
                <React.Fragment key={item.id ? item.id.toString() : index.toString()}>
                    {showDateHeader && (
                        <View style={styles.dateHeaderContainer}>
                            <View style={styles.dateHeaderBadge}>
                                <Text style={styles.dateHeaderText}>{currentDateLabel}</Text>
                            </View>
                        </View>
                    )}
                    <View style={[styles.bubbleContainerWithStatus, isMe ? styles.myBubbleAlign : styles.theirBubbleAlign]}>
                        <View style={styles.bubbleWrapper}>
                            <View style={[styles.bubble, isMe ? { ...styles.myBubble, backgroundColor: messageColor } : styles.theirBubble]}>
                                {imageUri ? (
                                    <TouchableOpacity
                                        activeOpacity={0.9}
                                        onPress={() => setViewingFullImage(imageUri)}
                                    >
                                        <Image
                                            source={{ uri: imageUri }}
                                            style={styles.messageImage}
                                            resizeMode="cover"
                                        />
                                    </TouchableOpacity>
                                ) : null}
                                {decryptedText && decryptedText !== 'Photo' ? (
                                    <Text style={styles.messageText}>{decryptedText}</Text>
                                ) : null}
                                <View style={styles.bubbleFooter}>
                                    <Text style={styles.timestamp}>{formatMessageTime(item.sentAt)}</Text>
                                    {isMe && (
                                        <Ionicons
                                            name={isRead ? 'checkmark-done' : 'checkmark'}
                                            size={14}
                                            color={isRead ? '#3B82F6' : 'rgba(255,255,255,0.6)'}
                                            style={{ marginLeft: 4 }}
                                        />
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>
                </React.Fragment>
            );
        });
    };

    const activeThemeObj = BACKGROUND_THEMES.find(t => t.id === backgroundTheme);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {activeThemeObj && activeThemeObj.source ? (
                <Image source={activeThemeObj.source} style={styles.backgroundImage} resizeMode="cover" />
            ) : (
                <View style={[styles.backgroundImage, { backgroundColor: '#000000' }]} />
            )}

            <SafeAreaView style={styles.headerSafeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>

                    {renderHeaderAvatar()}

                    <View style={styles.partnerInfo}>
                        <Text style={styles.partnerName} numberOfLines={1}>{partnerName}</Text>
                        {partnerTyping && (
                            <Text style={styles.typingText}>typing...</Text>
                        )}
                    </View>

                    <TouchableOpacity onPress={() => setIsThemeModalVisible(true)} style={styles.themeBtn}>
                        <Ionicons name="color-palette-outline" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={PINK_ACCENT} style={{ marginTop: 40 }} />
                ) : (
                    <ScrollView
                        ref={scrollViewRef}
                        contentContainerStyle={styles.messageList}
                        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                    >
                        {renderMessageList()}
                    </ScrollView>
                )}

                <SafeAreaView style={styles.bottomSafeArea}>
                    <View style={styles.inputContainer}>
                        <TouchableOpacity onPress={pickImage} style={styles.attachBtn}>
                            <Ionicons name="image-outline" size={22} color="#FFFFFF" />
                        </TouchableOpacity>

                        <TextInput
                            style={styles.textInput}
                            placeholder="Message..."
                            placeholderTextColor="#71717A"
                            value={inputText}
                            onChangeText={handleInputChange}
                            multiline
                        />
                        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} activeOpacity={0.8}>
                            <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </KeyboardAvoidingView>

            <Modal
                visible={!!selectedImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <SafeAreaView style={styles.previewOverlay}>
                        <View style={styles.previewHeader}>
                            <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.previewCloseBtn}>
                                <Ionicons name="close" size={26} color="#FFFFFF" />
                            </TouchableOpacity>
                            <Text style={styles.previewTitle}>Send Photo</Text>
                            <View style={{ width: 40 }} />
                        </View>

                        {selectedImage && (
                            <View style={styles.previewImageContainer}>
                                <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} resizeMode="contain" />
                            </View>
                        )}

                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            style={styles.previewInputContainer}
                        >
                            <TextInput
                                style={styles.previewTextInput}
                                placeholder="Add a caption..."
                                placeholderTextColor="#8E8E93"
                                value={imageCaption}
                                onChangeText={setImageCaption}
                                multiline
                                returnKeyType="done"
                                onSubmitEditing={Keyboard.dismiss}
                            />
                            <TouchableOpacity
                                style={styles.previewSendBtn}
                                onPress={confirmAndSendImage}
                                disabled={uploadingImage}
                            >
                                {uploadingImage ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Ionicons name="paper-plane" size={20} color="#FFFFFF" />
                                )}
                            </TouchableOpacity>
                        </KeyboardAvoidingView>
                    </SafeAreaView>
                </TouchableWithoutFeedback>
            </Modal>

            <Modal
                visible={!!viewingFullImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setViewingFullImage(null)}
            >
                <SafeAreaView style={styles.fullScreenOverlay}>
                    <TouchableOpacity style={styles.fullScreenCloseBtn} onPress={() => setViewingFullImage(null)}>
                        <Ionicons name="close" size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                    {viewingFullImage && (
                        <Image
                            source={{ uri: viewingFullImage }}
                            style={styles.fullScreenImage}
                            resizeMode="contain"
                        />
                    )}
                </SafeAreaView>
            </Modal>

            <Modal
                visible={isThemeModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsThemeModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Choose Chat Theme</Text>

                        <ScrollView contentContainerStyle={styles.themesGrid}>
                            {BACKGROUND_THEMES.map((theme) => {
                                const isSelected = selectedThemeCandidate === theme.id;
                                return (
                                    <TouchableOpacity
                                        key={theme.id}
                                        style={[styles.themeCard, isSelected && styles.themeCardSelected]}
                                        onPress={() => setSelectedThemeCandidate(theme.id)}
                                        activeOpacity={0.8}
                                    >
                                        {theme.source ? (
                                            <Image source={theme.source} style={styles.themeThumbnail} />
                                        ) : (
                                            <View style={[styles.themeThumbnail, { backgroundColor: '#1C1C1E', justifyContent: 'center', alignItems: 'center' }]}>
                                                <Ionicons name="moon" size={24} color="#8E8E93" />
                                            </View>
                                        )}
                                        <Text style={styles.themeName}>{theme.name}</Text>
                                        {isSelected && (
                                            <View style={styles.selectedBadge}>
                                                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <Text style={styles.modalSectionTitle}>Message Bubble Color</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorPickerRow}>
                            {MESSAGE_COLORS.map((color) => {
                                const isSelected = selectedColorCandidate === color.value;
                                return (
                                    <TouchableOpacity
                                        key={color.value}
                                        style={[styles.colorSwatch, isSelected && styles.colorSwatchSelected, isSelected && { borderColor: color.value }]}
                                        onPress={() => setSelectedColorCandidate(color.value)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.colorCircle, { backgroundColor: color.value }]}>
                                            {isSelected && (
                                                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                            )}
                                        </View>
                                        <Text style={styles.colorName}>{color.name}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setIsThemeModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.setButton}
                                onPress={handleSaveTheme}
                            >
                                <Text style={styles.setButtonText}>Set Theme</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    backgroundImage: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
    headerSafeArea: { backgroundColor: 'rgba(0,0,0,0.3)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 10 : 8, paddingBottom: 12 },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
    avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.12)', justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
    partnerInfo: { flex: 1, marginLeft: 10 },
    partnerName: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
    typingText: { color: PINK_ACCENT, fontSize: 12, fontWeight: '500', marginTop: 1 },
    themeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
    messageList: { paddingHorizontal: 16, paddingVertical: 16 },
    dateHeaderContainer: { alignItems: 'center', marginVertical: 14 },
    dateHeaderBadge: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    dateHeaderText: { color: '#E4E4E7', fontSize: 11, fontWeight: '600' },
    bubbleContainerWithStatus: { marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end' },
    myBubbleAlign: { justifyContent: 'flex-end' },
    theirBubbleAlign: { justifyContent: 'flex-start' },
    bubbleWrapper: { maxWidth: '85%' },
    bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
    myBubble: { backgroundColor: PINK_ACCENT, borderBottomRightRadius: 4 },
    theirBubble: { backgroundColor: 'rgba(24, 24, 27, 0.88)', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    messageText: { color: '#FFFFFF', fontSize: 15, lineHeight: 20 },
    messageImage: { width: 220, height: 160, borderRadius: 12, marginBottom: 6 },
    bubbleFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4, alignSelf: 'flex-end' },
    timestamp: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
    bottomSafeArea: { backgroundColor: 'rgba(13,14,18,0.92)' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
    attachBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    textInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#FFFFFF', fontSize: 15, maxHeight: 100 },
    sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: PINK_ACCENT, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    previewOverlay: { flex: 1, backgroundColor: '#000000', justifyContent: 'space-between' },
    previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    previewCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    previewTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
    previewImageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 10 },
    previewImage: { width: '100%', height: '100%' },
    previewInputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#18181B' },
    previewTextInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#FFFFFF', fontSize: 15, maxHeight: 100 },
    previewSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: PINK_ACCENT, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    fullScreenOverlay: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
    fullScreenCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    fullScreenImage: { width: SCREEN_WIDTH, height: '80%' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '75%' },
    modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
    themesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
    themeCard: { width: (SCREEN_WIDTH - 52) / 2, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 8, borderWidth: 2, borderColor: 'transparent', position: 'relative' },
    themeCardSelected: { borderColor: PINK_ACCENT, backgroundColor: 'rgba(255, 45, 85, 0.1)' },
    themeThumbnail: { width: '100%', height: 110, borderRadius: 10, marginBottom: 8 },
    themeName: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', textAlign: 'center' },
    selectedBadge: { position: 'absolute', top: 14, right: 14, backgroundColor: PINK_ACCENT, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    cancelButton: { flex: 1, paddingVertical: 14, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, alignItems: 'center' },
    cancelButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
    setButton: { flex: 1, paddingVertical: 14, backgroundColor: PINK_ACCENT, borderRadius: 16, alignItems: 'center' },
    setButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    modalSectionTitle: { color: '#A1A1AA', fontSize: 13, fontWeight: '600', marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    colorPickerRow: { paddingHorizontal: 4, paddingBottom: 4 },
    colorSwatch: { width: 54, marginRight: 12, alignItems: 'center', paddingVertical: 6, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
    colorSwatchSelected: { backgroundColor: 'rgba(255,255,255,0.08)' },
    colorCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    colorName: { color: '#D4D4D8', fontSize: 10, fontWeight: '500', textAlign: 'center' }
});