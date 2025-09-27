// src/screens/RegisterScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../contexts/AuthContext';
import { Church } from '../types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { isValidCpf, isValidPhone, isValidEmail, formatCpf, formatPhone } from '../lib/validation/userValidation';

interface RegisterScreenProps {
    navigation: any;
}

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
    const { register } = useAuth();
    const [loading, setLoading] = useState(false);
    const [loadingChurches, setLoadingChurches] = useState(true);
    const [churches, setChurches] = useState<Church[]>([]);
    
    // Form data
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        cpf: '',
        phone: '',
        churchId: '',
        password: '',
        confirmPassword: ''
    });
    
    // Validation errors
    const [errors, setErrors] = useState<{[key: string]: string}>({});

    useEffect(() => {
        loadChurches();
    }, []);

    const loadChurches = async () => {
        try {
            setLoadingChurches(true);
            const churchesSnapshot = await getDocs(collection(db, 'churches'));
            const churchesData = churchesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Church[];
            
            setChurches(churchesData.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (error) {
            console.error('Erro ao carregar igrejas:', error);
            Toast.show({
                type: 'error',
                text1: 'Erro',
                text2: 'Não foi possível carregar a lista de igrejas'
            });
        } finally {
            setLoadingChurches(false);
        }
    };

    const validateForm = (): boolean => {
        const newErrors: {[key: string]: string} = {};

        // Validar nome
        if (!formData.name.trim()) {
            newErrors.name = 'Nome é obrigatório';
        }

        // Validar email
        if (!formData.email.trim()) {
            newErrors.email = 'Email é obrigatório';
        } else if (!isValidEmail(formData.email)) {
            newErrors.email = 'Email inválido';
        }

        // Validar CPF
        if (!formData.cpf.trim()) {
            newErrors.cpf = 'CPF é obrigatório';
        } else if (!isValidCpf(formData.cpf)) {
            newErrors.cpf = 'CPF inválido';
        }

        // Validar telefone
        if (!formData.phone.trim()) {
            newErrors.phone = 'Telefone é obrigatório';
        } else if (!isValidPhone(formData.phone)) {
            newErrors.phone = 'Telefone inválido (deve ter 10 ou 11 dígitos)';
        }

        // Validar igreja
        if (!formData.churchId) {
            newErrors.churchId = 'Selecione uma igreja';
        }

        // Validar senha
        if (!formData.password) {
            newErrors.password = 'Senha é obrigatória';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
        }

        // Validar confirmação de senha
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Senhas não coincidem';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;

        try {
            setLoading(true);
            await register(
                formData.email,
                formData.password,
                formData.name,
                formData.cpf.replace(/\D/g, ''), // Remove formatação do CPF
                formData.phone.replace(/\D/g, ''), // Remove formatação do telefone
                formData.churchId
            );
            
            Toast.show({
                type: 'success',
                text1: 'Sucesso!',
                text2: 'Conta criada com sucesso!'
            });
            
            // Navegar para login após um pequeno delay
            setTimeout(() => {
                navigation.navigate('Login');
            }, 2000);
        } catch (error: any) {
            console.error('Erro no registro:', error);
            Toast.show({
                type: 'error',
                text1: 'Erro',
                text2: error.message || 'Erro ao criar conta'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        let formattedValue = value;
        
        // Aplicar formatação automática
        if (field === 'cpf') {
            formattedValue = formatCpf(value);
        } else if (field === 'phone') {
            formattedValue = formatPhone(value);
        }
        
        setFormData(prev => ({ ...prev, [field]: formattedValue }));
        
        // Limpar erro do campo quando o usuário começar a digitar
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const selectedChurch = churches.find(church => church.id === formData.churchId);

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.header}>
                    <Text style={styles.title}>Criar Conta</Text>
                    <Text style={styles.subtitle}>Preencha todos os dados para se cadastrar</Text>
                </View>

                <View style={styles.form}>
                    {/* Nome */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nome Completo *</Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            value={formData.name}
                            onChangeText={(value) => handleInputChange('name', value)}
                            placeholder="Digite seu nome completo"
                            autoCapitalize="words"
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>

                    {/* Email */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email *</Text>
                        <TextInput
                            style={[styles.input, errors.email && styles.inputError]}
                            value={formData.email}
                            onChangeText={(value) => handleInputChange('email', value)}
                            placeholder="Digite seu email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                    </View>

                    {/* CPF */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>CPF *</Text>
                        <TextInput
                            style={[styles.input, errors.cpf && styles.inputError]}
                            value={formData.cpf}
                            onChangeText={(value) => handleInputChange('cpf', value)}
                            placeholder="000.000.000-00"
                            keyboardType="numeric"
                            maxLength={14}
                        />
                        {errors.cpf && <Text style={styles.errorText}>{errors.cpf}</Text>}
                    </View>

                    {/* Telefone */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Telefone *</Text>
                        <TextInput
                            style={[styles.input, errors.phone && styles.inputError]}
                            value={formData.phone}
                            onChangeText={(value) => handleInputChange('phone', value)}
                            placeholder="(00) 00000-0000"
                            keyboardType="phone-pad"
                            maxLength={15}
                        />
                        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                    </View>

                    {/* Igreja */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Igreja *</Text>
                        {loadingChurches ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color="#007AFF" />
                                <Text style={styles.loadingText}>Carregando igrejas...</Text>
                            </View>
                        ) : (
                            <View style={[styles.pickerContainer, errors.churchId && styles.inputError]}>
                                <Picker
                                    selectedValue={formData.churchId}
                                    onValueChange={(value) => handleInputChange('churchId', value)}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Selecione uma igreja" value="" />
                                    {churches.map((church) => (
                                        <Picker.Item
                                            key={church.id}
                                            label={church.name}
                                            value={church.id}
                                        />
                                    ))}
                                </Picker>
                            </View>
                        )}
                        {errors.churchId && <Text style={styles.errorText}>{errors.churchId}</Text>}
                        {selectedChurch && (
                            <Text style={styles.churchInfo}>
                                Pastor: {selectedChurch.pastorName || 'Não informado'}
                            </Text>
                        )}
                    </View>

                    {/* Senha */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Senha *</Text>
                        <TextInput
                            style={[styles.input, errors.password && styles.inputError]}
                            value={formData.password}
                            onChangeText={(value) => handleInputChange('password', value)}
                            placeholder="Digite sua senha"
                            secureTextEntry
                        />
                        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                    </View>

                    {/* Confirmar Senha */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirmar Senha *</Text>
                        <TextInput
                            style={[styles.input, errors.confirmPassword && styles.inputError]}
                            value={formData.confirmPassword}
                            onChangeText={(value) => handleInputChange('confirmPassword', value)}
                            placeholder="Confirme sua senha"
                            secureTextEntry
                        />
                        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                    </View>

                    {/* Botão de Registro */}
                    <TouchableOpacity
                        style={[styles.registerButton, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.registerButtonText}>Criar Conta</Text>
                        )}
                    </TouchableOpacity>

                    {/* Link para Login */}
                    <TouchableOpacity
                        style={styles.loginLink}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.loginLinkText}>
                            Já tem uma conta? <Text style={styles.loginLinkBold}>Faça login</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    scrollContainer: {
        flexGrow: 1,
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    form: {
        flex: 1,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        padding: 15,
        fontSize: 16,
        color: '#333',
    },
    inputError: {
        borderColor: '#FF3B30',
    },
    pickerContainer: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
    },
    picker: {
        height: 50,
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 14,
        marginTop: 5,
    },
    churchInfo: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
        fontStyle: 'italic',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
    },
    loadingText: {
        marginLeft: 10,
        color: '#666',
    },
    registerButton: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonDisabled: {
        backgroundColor: '#999',
    },
    registerButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    loginLink: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    loginLinkText: {
        fontSize: 16,
        color: '#666',
    },
    loginLinkBold: {
        color: '#007AFF',
        fontWeight: '600',
    },
});