import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useSegments } from 'expo-router';

interface AuthContextType {
    session: string | null;
    isLoading: boolean;
    signIn: (token: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    isLoading: true,
    signIn: async () => { },
    signOut: async () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const rootSegment = useSegments()[0];
    const router = useRouter();

    useEffect(() => {
        async function loadSession() {
            try {
                const storedSession = await SecureStore.getItemAsync('session');
                if (storedSession) {
                    setSession(storedSession);
                }
            } catch (e) {
                console.error('Failed to load session', e);
            } finally {
                setIsLoading(false);
            }
        }
        loadSession();
    }, []);

    useEffect(() => {
        if (isLoading) return;

        // Only redirect FROM auth pages back to app if logged in.
        // Guests can freely access the app (map) without logging in.
        if (session && rootSegment === '(auth)') {
            router.replace('/(app)');
        }
        // Note: we do NOT redirect unauthenticated users to login.
        // Guest access is allowed. Login is prompted when drawing/placing pins.
    }, [session, rootSegment, isLoading]);

    const signIn = async (token: string) => {
        await SecureStore.setItemAsync('session', token);
        setSession(token);
    };

    const signOut = async () => {
        await SecureStore.deleteItemAsync('session');
        setSession(null);
    };

    return (
        <AuthContext.Provider
            value={{
                session,
                isLoading,
                signIn,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
