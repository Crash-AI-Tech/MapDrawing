import { View, StyleSheet, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState } from 'react';
import { API_BASE_URL } from '@/lib/config';
import { useRouter } from 'expo-router';
import { useLang, ts } from '@/lib/i18n';

export default function ForgotPassword() {
    const router = useRouter();
    const [lang] = useLang();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    // Steps: 'email' → 'code' → 'done'
    const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const handleRequestCode = async () => {
        if (!email) {
            Alert.alert(ts('error', lang), ts('enterEmail', lang));
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/mobile/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();

            if (res.ok && data.step === 'code') {
                setStep('code');
            } else {
                Alert.alert(ts('error', lang), data.error || ts('failedToSendCode', lang));
            }
        } catch (e: any) {
            Alert.alert(ts('networkError', lang), e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (code.length !== 6) {
            Alert.alert(ts('error', lang), ts('enterCode', lang));
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert(ts('error', lang), ts('passwordTooShort', lang));
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/mobile/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, password: newPassword }),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setStep('done');
            } else {
                Alert.alert(ts('error', lang), data.error || ts('failedToResetPassword', lang));
            }
        } catch (e: any) {
            Alert.alert('Network Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    if (step === 'done') {
        return (
            <View style={styles.container}>
                <View style={styles.scrollContent}>
                    <Text style={styles.emoji}>✅</Text>
                    <Text style={styles.title}>{ts('passwordReset', lang)}</Text>
                    <Text style={styles.subtitle}>{ts('passwordResetMsg', lang)}</Text>
                    <TouchableOpacity
                        style={styles.button}
                            onPress={() => router.replace('/login')}
                    >
                        <Text style={styles.buttonText}>{ts('backToLogin', lang)}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (step === 'code') {
        return (
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <Text style={styles.emoji}>🔑</Text>
                    <Text style={styles.title}>{ts('resetPassword', lang)}</Text>
                    <Text style={styles.subtitle}>
                        {ts('enterCodeSentTo', lang)}{'\n'}
                        <Text style={styles.emailHighlight}>{email}</Text>
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
                        <TextInput
                            style={styles.input}
                            placeholder={ts('newPasswordMin6', lang)}
                            placeholderTextColor="#999"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry
                        />
                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleResetPassword}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>{loading ? ts('resetting', lang) : ts('resetPassword', lang)}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.link}>{ts('backToLogin', lang)}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.emoji}>🔐</Text>
                <Text style={styles.title}>{ts('forgotPasswordTitle', lang)}</Text>
                <Text style={styles.subtitle}>{ts('forgotPasswordSubtitle', lang)}</Text>

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
                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleRequestCode}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>{loading ? ts('sending', lang) : ts('sendResetCode', lang)}</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.link}>{ts('backToLogin', lang)}</Text>
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
