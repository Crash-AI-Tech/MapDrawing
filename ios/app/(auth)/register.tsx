import { View, StyleSheet, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { useRouter } from 'expo-router';
import { useLang, ts } from '@/lib/i18n';

export default function Register() {
    const { signIn } = useAuth();
    const router = useRouter();
    const [lang] = useLang();
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
            Alert.alert(ts('error', lang), ts('enterEmailPassword', lang));
            return;
        }
        if (password.length < 6) {
            Alert.alert(ts('error', lang), ts('passwordTooShort', lang));
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
                Alert.alert(ts('registrationFailed', lang), data.error || ts('unknownError', lang));
            }
        } catch (e: any) {
            Alert.alert(ts('networkError', lang), e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (code.length !== 6) {
            Alert.alert(ts('error', lang), ts('enterCode', lang));
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
                Alert.alert(ts('verificationFailed', lang), data.error || ts('invalidCode', lang));
            }
        } catch (e: any) {
            Alert.alert(ts('networkError', lang), e.message);
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
                Alert.alert(ts('sent', lang), ts('newCodeSent', lang));
            } else {
                Alert.alert(ts('error', lang), data.error || ts('resendFailed', lang));
            }
        } catch (e: any) {
            Alert.alert(ts('networkError', lang), e.message);
        } finally {
            setResending(false);
        }
    };

    if (step === 'verify') {
        return (
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <Text style={styles.emoji}>📧</Text>
                    <Text style={styles.title}>{ts('verifyEmail', lang)}</Text>
                    <Text style={styles.subtitle}>
                        {ts('weSentCode', lang)}{'\n'}
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
                            <Text style={styles.buttonText}>{loading ? ts('verifying', lang) : ts('verify', lang)}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={handleResend} disabled={resending}>
                        <Text style={styles.link}>{resending ? ts('sending', lang) : ts('resendCode', lang)}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.emoji}>✨</Text>
                <Text style={styles.title}>{ts('createAccount', lang)}</Text>
                <Text style={styles.subtitle}>{ts('joinCommunity', lang)}</Text>

                <View style={styles.form}>
                    <TextInput
                        style={styles.input}
                        placeholder={ts('email', lang)}
                        placeholderTextColor="#999"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder={ts('usernameOptional', lang)}
                        placeholderTextColor="#999"
                        value={userName}
                        onChangeText={setUserName}
                        autoCapitalize="none"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder={ts('passwordMin6', lang)}
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
                        <Text style={styles.buttonText}>{loading ? ts('creating', lang) : ts('createAccount', lang)}</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.link}>{ts('alreadyHaveAccount', lang)}</Text>
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
