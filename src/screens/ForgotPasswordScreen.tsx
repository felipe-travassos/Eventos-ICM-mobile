// src/screens/ForgotPasswordScreen.tsx
import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ImageBackground,
} from "react-native";
import Toast from 'react-native-toast-message';
import { useAuth } from "../contexts/AuthContext";

interface ForgotPasswordScreenProps {
    navigation: any;
}

export default function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const { resetPassword } = useAuth();

    const handleResetPassword = async () => {
        if (!email) {
            Toast.show({
                type: 'error',
                text1: 'Erro',
                text2: 'Por favor, digite seu email'
            });
            return;
        }

        setLoading(true);
        try {
            await resetPassword(email);
            Toast.show({
                type: 'success',
                text1: 'Sucesso!',
                text2: `Um email com instruções foi enviado para ${email}`,
                onHide: () => navigation.navigate("Login")
            });
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Erro',
                text2: error.message || 'Erro ao enviar email de redefinição'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleBackToLogin = () => {
        navigation.navigate("Login");
    };

    return (
        <ImageBackground 
            source={require('../../assets/logo1.png')} 
            style={styles.backgroundImage}
            resizeMode="contain"
            imageStyle={styles.backgroundImageStyle}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>Esqueci minha senha</Text>
                    <Text style={styles.subtitle}>
                        Digite seu email para receber instruções de redefinição de senha
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <TouchableOpacity
                        style={styles.resetButton}
                        onPress={handleResetPassword}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.resetButtonText}>Enviar Email</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleBackToLogin}>
                        <Text style={styles.backToLoginText}>Voltar ao Login</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
    },
    backgroundImageStyle: {
        opacity: 0.6,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(245, 245, 245, 0.5)',
    },
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 10,
        textAlign: "center",
        textShadowColor: 'rgba(255, 255, 255, 0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        marginBottom: 40,
        textAlign: "center",
        lineHeight: 22,
        textShadowColor: 'rgba(255, 255, 255, 0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    input: {
        width: "100%",
        height: 50,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 20,
        fontSize: 16,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    resetButton: {
        width: "100%",
        height: 50,
        backgroundColor: "#007AFF",
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    resetButtonText: {
        color: "#fff",
        textAlign: "center",
        fontSize: 16,
        fontWeight: "600",
    },
    backToLoginText: {
        textAlign: "center",
        color: "#007AFF",
        fontSize: 16,
        textShadowColor: 'rgba(255, 255, 255, 0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
});