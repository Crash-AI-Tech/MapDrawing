import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Compliance } from '@/utils/compliance';
import { type MapPin } from '@/lib/api';

interface PinDetailModalProps {
    pin: MapPin | null;
    onClose: () => void;
    visible: boolean;
}

export default function PinDetailModal({ pin, onClose, visible }: PinDetailModalProps) {
    if (!pin) return null;

    const handleReport = () => {
        Compliance.reportContent(pin.id, 'pin', 'Inappropriate content');
        onClose();
    };

    const handleBlockUser = () => {
        Compliance.blockUser(pin.userId);
        onClose();
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.container}>
                            <View style={[styles.header, { borderBottomColor: pin.color }]}>
                                <View style={[styles.avatar, { backgroundColor: pin.color }]}>
                                    <Text style={styles.avatarText}>{pin.userName?.charAt(0).toUpperCase()}</Text>
                                </View>
                                <View style={styles.headerText}>
                                    <Text style={styles.userName}>{pin.userName}</Text>
                                    <Text style={styles.timestamp}>{new Date(pin.createdAt).toLocaleString()}</Text>
                                </View>
                                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                    <Ionicons name="close" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.content}>
                                <Text style={styles.message}>{pin.message}</Text>
                            </View>

                            <View style={styles.actions}>
                                <TouchableOpacity style={styles.actionBtn} onPress={handleReport}>
                                    <Ionicons name="flag-outline" size={20} color="#FF3B30" />
                                    <Text style={[styles.actionText, { color: '#FF3B30' }]}>Report</Text>
                                </TouchableOpacity>
                                <View style={styles.divider} />
                                <TouchableOpacity style={styles.actionBtn} onPress={handleBlockUser}>
                                    <Ionicons name="ban-outline" size={20} color="#FF9500" />
                                    <Text style={[styles.actionText, { color: '#FF9500' }]}>Block User</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 3,
        backgroundColor: '#F9F9F9',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerText: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    timestamp: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    closeBtn: {
        padding: 4,
    },
    content: {
        padding: 20,
        minHeight: 80,
        justifyContent: 'center',
    },
    message: {
        fontSize: 18,
        lineHeight: 24,
        color: '#333',
        textAlign: 'center',
    },
    actions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 8,
        backgroundColor: '#fff',
    },
    divider: {
        width: 1,
        backgroundColor: '#EEE',
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
