import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, Image, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { fetchBlockedUsers, unblockUserApi, BlockedUser } from '@/lib/api';
import { ts, useLang } from '@/lib/i18n';
import { API_BASE_URL } from '@/lib/config';

export default function BlockedUsersScreen() {
    const router = useRouter();
    const [lang] = useLang();
    const [blocked, setBlocked] = useState<BlockedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [unblockingId, setUnblockingId] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            loadBlocked();
        }, [])
    );

    const loadBlocked = async () => {
        setIsLoading(true);
        try {
            const { items } = await fetchBlockedUsers();
            setBlocked(items);
        } catch (e: any) {
            console.error('Failed to load blocked users', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnblock = (user: BlockedUser) => {
        Alert.alert(
            'Unblock User',
            `Unblock ${user.userName}? You will see their pins and drawings again.`,
            [
                { text: ts('cancel', lang), style: 'cancel' },
                {
                    text: 'Unblock',
                    style: 'destructive',
                    onPress: async () => {
                        setUnblockingId(user.userId);
                        try {
                            await unblockUserApi(user.userId);
                            setBlocked((prev) => prev.filter((u) => u.userId !== user.userId));
                        } catch (e: any) {
                            Alert.alert('Error', 'Failed to unblock user. Please try again.');
                        } finally {
                            setUnblockingId(null);
                        }
                    }
                }
            ]
        );
    };

    const renderUser = ({ item }: { item: BlockedUser }) => (
        <View style={styles.userRow}>
            <Image
                source={
                    item.avatarUrl
                        ? { uri: `${API_BASE_URL}/api/files/${item.avatarUrl.replace(/^\//, '')}` }
                        : require('@/assets/images/react-logo.png')
                }
                style={styles.avatar}
            />
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.userName}</Text>
                <Text style={styles.blockedDate}>
                    Blocked {new Date(item.blockedAt).toLocaleDateString()}
                </Text>
            </View>
            <TouchableOpacity
                style={styles.unblockButton}
                onPress={() => handleUnblock(item)}
                disabled={unblockingId === item.userId}
            >
                {unblockingId === item.userId ? (
                    <ActivityIndicator size="small" color="#FF9500" />
                ) : (
                    <Text style={styles.unblockText}>Unblock</Text>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
                {/* Nav Bar */}
                <View style={styles.navBar}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.navTitle}>{ts('blocked', lang)}</Text>
                    <View style={{ width: 40 }} />
                </View>

                {isLoading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#8E8E93" />
                    </View>
                ) : blocked.length === 0 ? (
                    <View style={styles.center}>
                        <Ionicons name="people-circle-outline" size={60} color="#C7C7CC" />
                        <Text style={styles.emptyText}>{ts('blockedEmpty', lang)}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={blocked}
                        keyExtractor={(item) => item.userId}
                        renderItem={renderUser}
                        contentContainerStyle={styles.list}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                    />
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    safeArea: { flex: 1 },
    navBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F2F2F7',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
    },
    navTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    emptyText: {
        color: '#8E8E93',
        fontSize: 15,
        textAlign: 'center',
    },
    list: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
    },
    separator: {
        height: 8,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E5E5EA',
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
    },
    blockedDate: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 2,
    },
    unblockButton: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        backgroundColor: '#FFF3E0',
        borderRadius: 8,
        minWidth: 72,
        alignItems: 'center',
    },
    unblockText: {
        color: '#FF9500',
        fontSize: 14,
        fontWeight: '600',
    },
});
