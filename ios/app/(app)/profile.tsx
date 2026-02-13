import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView, Image, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

export default function ProfileScreen() {
    const router = useRouter();
    const { signOut, session } = useAuth();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setIsDeleting(true);
                        // Simulate API call
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        await signOut();
                        Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
                    }
                }
            ]
        );
    };

    const menuItems = [
        {
            title: 'Terms of Service',
            icon: 'document-text-outline',
            color: '#007AFF',
            onPress: () => {
                Alert.alert(
                    'Terms of Service',
                    'By using NiubiAgent, you agree to our terms. \n\n1. No hate speech or bullying.\n2. No spam or unsolicited advertising.\n3. Respect privacy of others.\n\nViolations will result in account suspension.'
                );
            }
        },
        {
            title: 'Privacy Policy',
            icon: 'shield-checkmark-outline',
            color: '#34C759',
            onPress: () => {
                Alert.alert('Privacy Policy', 'We collect location data only to display your position on the map. We do not sell your data.');
            }
        },
        {
            title: 'Blocked Users',
            icon: 'people-circle-outline',
            color: '#FF9500',
            onPress: () => {
                Alert.alert('Blocked Users', 'No users blocked yet.');
            }
        }
    ];

    return (
        <View style={styles.container}>


            <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>


                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {/* Identity Card */}
                    <View style={styles.identityContainer}>
                        <View style={styles.avatarContainer}>
                            <Image
                                source={require('@/assets/images/react-logo.png')}
                                style={styles.avatar}
                            />
                            <View style={styles.onlineBadge} />
                        </View>
                        <Text style={styles.userName}>Anonymous Agent</Text>
                        <Text style={styles.userHandle}>@{session?.slice(0, 8) || 'unknown'}</Text>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>12</Text>
                                <Text style={styles.statLabel}>Pins</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>48</Text>
                                <Text style={styles.statLabel}>Drawings</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>2.5k</Text>
                                <Text style={styles.statLabel}>Views</Text>
                            </View>
                        </View>
                    </View>

                    {/* Settings Sections */}
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <View style={styles.menuGroup}>
                        <View style={styles.menuItem}>
                            <View style={[styles.menuIconBox, { backgroundColor: "#5856D6" }]}>
                                <Ionicons name="notifications-outline" size={20} color="#fff" />
                            </View>
                            <Text style={styles.menuText}>Notifications</Text>
                            <Switch value={true} trackColor={{ false: "#767577", true: "#34C759" }} />
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Support & Legal</Text>
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
                                <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.footerActions}>
                        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                            <Text style={styles.logoutText}>Log Out</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={handleDeleteAccount}
                            disabled={isDeleting}
                        >
                            <Text style={styles.deleteText}>
                                {isDeleting ? 'Deleting...' : 'Delete Account'}
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
