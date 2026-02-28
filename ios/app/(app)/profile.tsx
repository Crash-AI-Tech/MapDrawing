import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView, Image, Switch, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { fetchProfile, fetchProfileStats, apiFetch } from '@/lib/api';
import type { UserProfileStats } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';
import { useLang, ts, type Lang } from '@/lib/i18n';

const LANG_LABELS: Record<Lang, string> = { zh: '中文', en: 'English', ja: '日本語' };
const LANG_ORDER: Lang[] = ['en', 'zh', 'ja'];

export default function ProfileScreen() {
    const router = useRouter();
    const { signOut, session } = useAuth();
    const [isDeleting, setIsDeleting] = useState(false);
    const [lang, setLang] = useLang();

    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState<UserProfileStats>({ pins: 0, drawings: 0 });
    const [isUploading, setIsUploading] = useState(false);

    const cycleLang = useCallback(() => {
        const idx = LANG_ORDER.indexOf(lang);
        const next = LANG_ORDER[(idx + 1) % LANG_ORDER.length];
        setLang(next);
    }, [lang, setLang]);

    useFocusEffect(
        useCallback(() => {
            loadProfile();
        }, [])
    );

    const loadProfile = async () => {
        if (!session) return;
        try {
            const [data, statsData] = await Promise.all([
                fetchProfile(),
                fetchProfileStats(),
            ]);
            setProfile(data);
            setStats(statsData);
        } catch (e: any) {
            if (e?.status === 401) {
                await signOut();
                return;
            }
            console.error('Failed to load profile', e);
        }
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0].uri) {
            uploadAvatar(result.assets[0]);
        }
    };

    const uploadAvatar = async (asset: any) => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', {
                uri: asset.uri,
                name: asset.fileName || 'avatar.jpg',
                type: asset.mimeType || 'image/jpeg',
            } as any);

            const res = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session}`
                },
                body: formData,
            });

            if (!res.ok) throw new Error('Upload failed');
            const { url } = await res.json();

            await apiFetch('/api/profile', {
                method: 'PATCH',
                auth: true,
                body: JSON.stringify({ avatarUrl: url })
            });

            await loadProfile();
        } catch (e: any) {
            Alert.alert(ts('uploadFailed', lang), e.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            ts('deleteTitle', lang),
            ts('deleteMsg', lang),
            [
                { text: ts('cancel', lang), style: 'cancel' },
                {
                    text: ts('delete', lang),
                    style: 'destructive',
                    onPress: async () => {
                        setIsDeleting(true);
                        // Simulate API call
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        await signOut();
                        Alert.alert(ts('accountDeleted', lang), ts('accountDeletedMsg', lang));
                    }
                }
            ]
        );
    };

    const menuItems = [
        {
            title: ts('language', lang),
            icon: 'globe-outline',
            color: '#5856D6',
            rightText: LANG_LABELS[lang],
            onPress: cycleLang,
        },
        {
            title: ts('terms', lang),
            icon: 'document-text-outline',
            color: '#007AFF',
            onPress: () => {
                Linking.openURL('https://doc-hosting.flycricket.io/drawmaps-terms-of-use/2197a713-a352-47c7-bf8f-a5a19eee3ddb/terms');
            }
        },
        {
            title: ts('privacy', lang),
            icon: 'shield-checkmark-outline',
            color: '#34C759',
            onPress: () => {
                Linking.openURL('https://doc-hosting.flycricket.io/drawmaps-privacy-policy/ab08a782-7dc0-48b1-97c9-e4ce1ac47c55/privacy');
            }
        },
        {
            title: ts('blocked', lang),
            icon: 'people-circle-outline',
            color: '#FF9500',
            onPress: () => {
                Alert.alert(ts('blocked', lang), ts('blockedEmpty', lang));
            }
        }
    ];

    return (
        <View style={styles.container}>


            <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>


                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {/* Identity Card */}
                    <View style={styles.identityContainer}>
                        <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage} disabled={isUploading}>
                            {isUploading ? (
                                <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E5E5EA' }]}>
                                    <ActivityIndicator size="small" color="#000" />
                                </View>
                            ) : (
                                <Image
                                    source={profile?.avatar_url ? { uri: `${API_BASE_URL}/api/files/${profile.avatar_url.replace(/^\//, '')}` } : require('@/assets/images/react-logo.png')}
                                    style={styles.avatar}
                                />
                            )}
                            <View style={styles.onlineBadge} />
                        </TouchableOpacity>
                        <Text style={styles.userName}>{profile?.user_name || ts('anonymousAgent', lang)}</Text>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{stats.pins}</Text>
                                <Text style={styles.statLabel}>{ts('pins', lang)}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{stats.drawings}</Text>
                                <Text style={styles.statLabel}>{ts('drawings', lang)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Settings Sections */}

                    <Text style={styles.sectionTitle}>{ts('supportLegal', lang)}</Text>
                    <View style={styles.menuGroup}>
                        {menuItems.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.menuItem, index < menuItems.length - 1 && styles.borderBottom]}
                                onPress={item.onPress}
                            >
                                <View style={styles.menuLeft}>
                                    <View style={[styles.menuIconBox, { backgroundColor: item.color }]}>
                                        <Ionicons name={item.icon as any} size={20} color="#fff" />
                                    </View>
                                    <Text style={styles.menuText}>{item.title}</Text>
                                </View>
                                <View style={styles.menuRight}>
                                    {'rightText' in item && item.rightText ? (
                                        <Text style={styles.menuRightText}>{item.rightText}</Text>
                                    ) : null}
                                    <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.footerActions}>
                        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                            <Text style={styles.logoutText}>{ts('logOut', lang)}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={handleDeleteAccount}
                            disabled={isDeleting}
                        >
                            <Text style={styles.deleteText}>
                                {isDeleting ? ts('deleting', lang) : ts('deleteAccount', lang)}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.versionText}>NiubiAgent v1.0.0 (Build 15)</Text>
                    </View>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    safeArea: {
        flex: 1,
    },
    navBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
        zIndex: 100,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    identityContainer: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 30,
    },
    avatarContainer: {
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#fff',
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#34C759',
        borderWidth: 3,
        borderColor: '#fff',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 4,
    },
    userHandle: {
        fontSize: 15,
        color: '#8E8E93',
        marginBottom: 24,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    statItem: {
        alignItems: 'center',
        minWidth: 60,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    statLabel: {
        fontSize: 11,
        color: '#8E8E93',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E5E5EA',
        marginHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6e6e73',
        marginBottom: 8,
        marginLeft: 16,
        textTransform: 'uppercase',
    },
    menuGroup: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 24,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    menuRightText: {
        fontSize: 15,
        color: '#8E8E93',
    },
    menuIconBox: {
        width: 30,
        height: 30,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuText: {
        fontSize: 16,
        fontWeight: '400',
        color: '#000',
    },
    borderBottom: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#C6C6C8',
        // marginLeft: 58, // Removed to fix alignment
    },
    footerActions: {
        marginTop: 20,
        gap: 16,
    },
    logoutButton: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    logoutText: {
        color: '#007AFF',
        fontSize: 17,
        fontWeight: '600',
    },
    deleteButton: {
        padding: 16,
        alignItems: 'center',
    },
    deleteText: {
        color: '#FF3B30',
        fontSize: 15,
        fontWeight: '600',
    },
    versionText: {
        textAlign: 'center',
        color: '#C7C7CC',
        fontSize: 13,
    },
});
