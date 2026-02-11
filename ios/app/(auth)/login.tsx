// import * as AppleAuthentication from 'expo-apple-authentication';
import { View, StyleSheet, Text, TextInput, Button, Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

// Hardcoded API URL for development. In production, use env var.
const API_URL = 'http://192.168.124.12:3000'; // Updated to local IP

export default function Login() {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    /*
    const handleAppleSignIn = async () => {
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            if (credential.identityToken) {
                const response = await fetch(`${API_URL}/api/auth/mobile/apple`, {
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
                    // Router replacement is handled in AuthContext, but explicit check here doesn't hurt logic
                } else {
                    console.error('Login Failed', data);
                    alert('Login Failed: ' + (data.error || 'Unknown error'));
                }
            }
        } catch (e: any) {
            if (e.code === 'ERR_REQUEST_CANCELED') {
                // handle that the user canceled the sign-in flow
            } else {
                // handle other errors
                console.error(e);
                alert('Apple Sign In Error: ' + e.message);
            }
        }
    };
    */

    const handleEmailSignIn = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please enter email and password");
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/auth/mobile/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (response.ok && data.token) {
                await signIn(data.token);
            } else {
                Alert.alert("Login Failed", data.error || "Invalid credentials");
            }
        } catch (e: any) {
            Alert.alert("Network Error", e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome back</Text>

            <View style={styles.form}>
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
                <Button title={loading ? "Logging in..." : "Login with Email"} onPress={handleEmailSignIn} disabled={loading} />
            </View>

            <Text style={styles.separator}>OR</Text>

            {/*
            <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={5}
                style={styles.button}
                onPress={handleAppleSignIn}
            />
            */}
            <Text>Apple Sign In Temporarily Disabled</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        marginBottom: 30,
        fontWeight: 'bold'
    },
    button: {
        width: 200,
        height: 44,
    },
    form: {
        width: '100%',
        marginBottom: 20,
        gap: 10
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 5,
        width: '100%'
    },
    separator: {
        marginVertical: 20,
        color: '#666'
    }
});
