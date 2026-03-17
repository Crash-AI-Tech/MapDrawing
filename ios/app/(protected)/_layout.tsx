import { Redirect, Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';

export default function ProtectedLayout() {
    const { session, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Loading...</Text>
            </View>
        );
    }

    if (!session) {
        return <Redirect href="/login" />;
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="profile" options={{ headerShown: false }} />
            <Stack.Screen name="blocked" options={{ headerShown: false }} />
        </Stack>
    );
}