import * as AppleAuthentication from 'expo-apple-authentication';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { useRouter } from 'expo-router';
import { useLang, ts } from '@/lib/i18n';

export default function Login() {
    const { signIn } = useAuth();
    const router = useRouter();
    const [lang] = useLang();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Verify step (when login detects unverified email)
    const [step, setStep] = useState<'login' | 'verify'>('login');
    const [verifyEmail, setVerifyEmail] = useState('');
    const [code, setCode] = useState('');

    const handleAppleSignIn = async () => {
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            if (credential.identityToken) {
                const response = await fetch(`${API_BASE_URL}/api/auth/mobile/apple`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        identityToken: credential.identityToken,
                        user: JSON.stringify({
                            name: {
                                firstName: credential.fullName?.givenName,
                                lastName: credential.fullName?.familyName
                            },
                            email: credential.email
                        })
                    }),
                });

                const data = await response.json();

                if (response.ok && data.token) {
                    await signIn(data.token);
                } else {
                    Alert.alert(ts('loginFailed', lang), data.error || ts('unknownError', lang));
                }
            }
        } catch (e: any) {
            if (e.code === 'ERR_REQUEST_CANCELED') {
                // User canceled — do nothing
            } else {
                Alert.alert(ts('appleSignInError', lang), e.message);
            }
        }
    };

    const handleEmailSignIn = async () => {
        if (!email || !password) {
            Alert.alert(ts('error', lang), ts('enterEmailPassword', lang));
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/mobile/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok && data.token) {
                await signIn(data.token);
            } else if (data.step === 'verify') {
                // Email not verified — show verify step
                setVerifyEmail(data.email || email);
                setStep('verify');
            } else {
                Alert.alert(ts('loginFailed', lang), data.error || ts('invalidCredentials', lang));
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

    if (step === 'verify') {
        return (
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <Text style={styles.emoji}>📧</Text>
                    <Text style={styles.title}>{ts('verifyEmail', lang)}</Text>
                    <Text style={styles.subtitle}>
                        {ts('enterCodeSentTo', lang)}{'\n'}
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

                    <TouchableOpacity onPress={() => setStep('login')}>
                        <Text style={styles.link}>{ts('backToLogin', lang)}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.emoji}>🎨</Text>
                <Text style={styles.title}>{ts('welcomeBack', lang)}</Text>
                <Text style={styles.subtitle}>{ts('signInSubtitle', lang)}</Text>

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
                        placeholder={ts('password', lang)}
                        placeholderTextColor="#999"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleEmailSignIn}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>{loading ? ts('signingIn', lang) : ts('signIn', lang)}</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                    <Text style={styles.link}>{ts('forgotPassword', lang)}</Text>
                </TouchableOpacity>

                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>{ts('or', lang)}</Text>
                    <View style={styles.dividerLine} />
                </View>

                <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={12}
                    style={styles.appleButton}
                    onPress={handleAppleSignIn}
                />

                <TouchableOpacity style={styles.registerLink} onPress={() => router.push('/(auth)/register')}>
                    <Text style={styles.registerText}>
                        {ts('noAccount', lang)}<Text style={styles.registerHighlight}>{ts('signUp', lang)}</Text>
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.skipLink} onPress={() => router.replace('/(app)')}>
                    <Text style={styles.skipText}>{ts('continueAsGuest', lang)}</Text>
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
        marginBottom: 16,
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
        fontSize: 14,
        marginBottom: 8,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginVertical: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#e0e0e0',
    },
    dividerText: {
        marginHorizontal: 12,
        color: '#999',
        fontSize: 13,
        fontWeight: '500',
    },
    appleButton: {
        width: '100%',
        height: 50,
    },
    registerLink: {
        marginTop: 24,
    },
    registerText: {
        color: '#666',
        fontSize: 15,
    },
    registerHighlight: {
        color: '#007AFF',
        fontWeight: '600',
    },
    skipLink: {
        marginTop: 16,
    },
    skipText: {
        color: '#999',
        fontSize: 14,
    },
});
