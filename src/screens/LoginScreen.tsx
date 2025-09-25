// src/screens/LoginScreen.tsx
import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

interface LoginScreenProps {
    navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
    
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Erro", "Por favor, preencha todos os campos");
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
            // Navigation will be handled by the auth state change
        } catch (error: any) {
            Alert.alert("Erro no Login", error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = () => {
        navigation.navigate("ForgotPassword");
    };

    const handleRegister = () => {
        navigation.navigate("Register");
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Eventos ICM</Text>
            <Text style={styles.subtitle}>Faça login para continuar</Text>

            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <TextInput
                style={styles.input}
                placeholder="Senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.loginButtonText}>Entrar</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
            </TouchableOpacity>

            <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Não tem uma conta? </Text>
                <TouchableOpacity onPress={handleRegister}>
                    <Text style={styles.registerLink}>Cadastre-se</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 20,
        backgroundColor: "#f5f5f5",
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 10,
        color: "#333",
    },
    subtitle: {
        fontSize: 16,
        textAlign: "center",
        marginBottom: 40,
        color: "#666",
    },
    input: {
        backgroundColor: "#fff",
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: "#ddd",
        fontSize: 16,
    },
    loginButton: {
        backgroundColor: "#007AFF",
        paddingVertical: 15,
        borderRadius: 8,
        marginBottom: 20,
    },
    loginButtonText: {
        color: "#fff",
        textAlign: "center",
        fontSize: 16,
        fontWeight: "600",
    },
    forgotPasswordText: {
        textAlign: "center",
        color: "#007AFF",
        marginBottom: 30,
    },
    registerContainer: {
        flexDirection: "row",
        justifyContent: "center",
    },
    registerText: {
        color: "#666",
    },
    registerLink: {
        color: "#007AFF",
        fontWeight: "600",
    },
});
