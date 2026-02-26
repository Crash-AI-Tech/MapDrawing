import { View, StyleSheet, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { useRouter } from 'expo-router';

export default function Register() {
    const { signIn } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(false);

    // Verification step
    const [step, setStep] = useState<'form' | 'verify'>('form');
    const [verifyEmail, setVerifyEmail] = useState('');
    const [code, setCode] = useState('');
    const [resending, setResending] = useState(false);

    const handleRegister = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/mobile/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, userName: userName || undefined }),
            });
            const data = await res.json();

            if (res.ok && data.step === 'verify') {
                setVerifyEmail(data.email);
                setStep('verify');
            } else {
                Alert.alert('Registration Failed', data.error || 'Unknown error');
            }
        } catch (e: any) {
            Alert.alert('Network Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (code.length !== 6) {
            Alert.alert('Error', 'Please enter the 6-digit code');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/mobile/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: verifyEmail, code }),
            });
            const data = await res.json();

            if (res.ok && data.token) {
                await signIn(data.token);
            } else {
                Alert.alert('Verification Failed', data.error || 'Invalid code');
            }
        } catch (e: any) {
            Alert.alert('Network Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/mobile/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: verifyEmail, action: 'resend' }),
            });
            const data = await res.json();
            if (res.ok) {
                Alert.alert('Sent', 'A new verification code has been sent to your email');
            } else {
                Alert.alert('Error', data.error || 'Failed to resend');
            }
        } catch (e: any) {
            Alert.alert('Network Error', e.message);
        } finally {
            setResending(false);
        }
    };

    if (step === 'verify') {
        return (
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <Text style={styles.emoji}>📧</Text>
                    <Text style={styles.title}>Verify Your Email</Text>
                    <Text style={styles.subtitle}>
                        We sent a 6-digit code to{'\n'}
                        <Text style={styles.emailHighlight}>{verifyEmail}</Text>
                    </Text>

                    <View style={styles.form}>
                        <TextInput
                            style={styles.codeInput}
                            placeholder="000000"
                            placeholderTextColor="#999"
                            value={code}
                            onChangeText={setCode}
                            keyboardType="number-pad"
                            maxLength={6}
                            textAlign="center"
                        />
                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleVerify}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify'}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={handleResend} disabled={resending}>
                        <Text style={styles.link}>{resending ? 'Sending...' : 'Resend Code'}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.emoji}>✨</Text>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join the global map drawing community</Text>

                <View style={styles.form}>
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#999"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Username (optional)"
                        placeholderTextColor="#999"
                        value={userName}
                        onChangeText={setUserName}
                        autoCapitalize="none"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Password (min 6 characters)"
                        placeholderTextColor="#999"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Create Account'}</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.link}>Already have an account? Log In</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    emoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#111',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    emailHighlight: {
        fontWeight: '600',
        color: '#333',
    },
    form: {
        width: '100%',
        gap: 12,
        marginBottom: 24,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        backgroundColor: '#f8f9fa',
        padding: 14,
        borderRadius: 12,
        fontSize: 16,
        color: '#111',
    },
    codeInput: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 12,
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: 8,
        color: '#111',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    button: {
        backgroundColor: '#111',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 4,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    link: {
        color: '#007AFF',
        fontSize: 15,
    },
});
