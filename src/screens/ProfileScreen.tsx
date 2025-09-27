// src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Modal,
} from "react-native";
import Toast from 'react-native-toast-message';
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../contexts/AuthContext";
import { updateProfileData, getChurches } from "../lib/firebase/users";
import { Church, User } from "../types";

export default function ProfileScreen() {
    const { currentUser, userData, updateUserData, logout } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [churches, setChurches] = useState<Church[]>([]);
    const [showChurchPicker, setShowChurchPicker] = useState(false);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        cpf: "",
        churchId: "",
    });

    // Load churches and populate form data
    useEffect(() => {
        loadChurches();
        if (userData) {
            setFormData({
                name: userData.name || "",
                phone: userData.phone || "",
                cpf: userData.cpf || "",
                churchId: userData.churchId || "",
            });
        }
    }, [userData]);

    const loadChurches = async () => {
        try {
            const churchesData = await getChurches();
            setChurches(churchesData);
        } catch (error) {
            console.error("Erro ao carregar igrejas:", error);
        }
    };

    const formatCPF = (cpf: string) => {
        const numbers = cpf.replace(/\D/g, "");
        return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    };

    const maskCPF = (cpf: string) => {
        if (!cpf) return "Não informado";
        const numbers = cpf.replace(/\D/g, "");
        if (numbers.length === 11) {
            // Mostra apenas os 3 primeiros e 2 últimos dígitos: 123.***.***-45
            return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4");
        }
        return cpf;
    };

    const formatPhone = (phone: string) => {
        const numbers = phone.replace(/\D/g, "");
        if (numbers.length === 11) {
            return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
        } else if (numbers.length === 10) {
            return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
        }
        return phone;
    };

    const handleCpfChange = (text: string) => {
        const numbers = text.replace(/\D/g, "");
        if (numbers.length <= 11) {
            setFormData({ ...formData, cpf: numbers });
        }
    };

    const handlePhoneChange = (text: string) => {
        const numbers = text.replace(/\D/g, "");
        if (numbers.length <= 11) {
            setFormData({ ...formData, phone: numbers });
        }
    };

    const handleSave = async () => {
        if (!currentUser || !userData) return;

        setLoading(true);
        try {
            // Validate required fields
            if (!formData.name.trim()) {
                Toast.show({
                    type: 'error',
                    text1: 'Erro',
                    text2: 'Nome é obrigatório'
                });
                return;
            }

            // Find church name
            let churchName = "";
            if (formData.churchId) {
                const selectedChurch = churches.find(c => c.id === formData.churchId);
                churchName = selectedChurch?.name || "";
            }

            const updateData: Partial<User> = {
                name: formData.name.trim(),
                phone: formData.phone,
                cpf: formData.cpf,
                churchId: formData.churchId,
                churchName,
            };

            await updateProfileData(currentUser.uid, updateData);
            updateUserData(updateData);
            
            setIsEditing(false);
            Toast.show({
                type: 'success',
                text1: 'Sucesso',
                text2: 'Perfil atualizado com sucesso!'
            });
        } catch (error) {
            console.error("Erro ao salvar perfil:", error);
            Toast.show({
                type: 'error',
                text1: 'Erro',
                text2: 'Não foi possível salvar as alterações'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (userData) {
            setFormData({
                name: userData.name || "",
                phone: userData.phone || "",
                cpf: userData.cpf || "",
                churchId: userData.churchId || "",
            });
        }
        setIsEditing(false);
    };

    const handleLogout = () => {
        Toast.show({
            type: 'info',
            text1: 'Sair',
            text2: 'Tem certeza que deseja sair da sua conta?',
            visibilityTime: 4000,
            onPress: async () => {
                try {
                    await logout();
                } catch (error) {
                    console.error("Erro ao fazer logout:", error);
                    Toast.show({
                        type: 'error',
                        text1: 'Erro',
                        text2: 'Não foi possível sair da conta.'
                    });
                }
            }
        });
    };

    const getRoleDisplayName = (role: string) => {
        const roleNames = {
            membro: "Membro",
            secretario_local: "Secretário Local",
            pastor: "Pastor",
            secretario_regional: "Secretário Regional",
        };
        return roleNames[role as keyof typeof roleNames] || role;
    };

    const getSelectedChurchName = () => {
        if (!formData.churchId) return "Selecionar igreja";
        const church = churches.find(c => c.id === formData.churchId);
        return church?.name || "Igreja não encontrada";
    };

    if (!userData) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Carregando perfil...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <Ionicons name="person-circle" size={80} color="#007AFF" />
                </View>
                <Text style={styles.userName}>
                    {userData.name || currentUser?.displayName || "Usuário"}
                </Text>
                <Text style={styles.userEmail}>{userData.email}</Text>
                <Text style={styles.userRole}>{getRoleDisplayName(userData.role)}</Text>
            </View>

            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Informações Pessoais</Text>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => setIsEditing(!isEditing)}
                    >
                        <Ionicons 
                            name={isEditing ? "close" : "pencil"} 
                            size={20} 
                            color="#007AFF" 
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.infoItem}>
                    <Ionicons name="person-outline" size={20} color="#666" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Nome Completo</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.input}
                                value={formData.name}
                                onChangeText={(text) => setFormData({ ...formData, name: text })}
                                placeholder="Digite seu nome completo"
                            />
                        ) : (
                            <Text style={styles.infoValue}>
                                {userData.name || "Não informado"}
                            </Text>
                        )}
                    </View>
                </View>

                <View style={styles.infoItem}>
                    <Ionicons name="mail-outline" size={20} color="#666" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Email</Text>
                        <Text style={styles.infoValue}>{userData.email}</Text>
                    </View>
                </View>

                <View style={styles.infoItem}>
                    <Ionicons name="call-outline" size={20} color="#666" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Telefone</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.input}
                                value={formatPhone(formData.phone)}
                                onChangeText={handlePhoneChange}
                                placeholder="(00) 00000-0000"
                                keyboardType="phone-pad"
                            />
                        ) : (
                            <Text style={styles.infoValue}>
                                {userData.phone ? formatPhone(userData.phone) : "Não informado"}
                            </Text>
                        )}
                    </View>
                </View>

                <View style={styles.infoItem}>
                    <Ionicons name="card-outline" size={20} color="#666" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>CPF</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.input}
                                value={formatCPF(formData.cpf)}
                                onChangeText={handleCpfChange}
                                placeholder="000.000.000-00"
                                keyboardType="numeric"
                            />
                        ) : (
                            <Text style={styles.infoValue}>
                                {userData.cpf ? maskCPF(userData.cpf) : "Não informado"}
                            </Text>
                        )}
                    </View>
                </View>

                <View style={styles.infoItem}>
                    <Ionicons name="business-outline" size={20} color="#666" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Igreja</Text>
                        {isEditing ? (
                            <TouchableOpacity
                                style={styles.pickerButton}
                                onPress={() => setShowChurchPicker(true)}
                            >
                                <Text style={styles.pickerButtonText}>
                                    {getSelectedChurchName()}
                                </Text>
                                <Ionicons name="chevron-down" size={16} color="#666" />
                            </TouchableOpacity>
                        ) : (
                            <Text style={styles.infoValue}>
                                {userData.churchName || "Não informado"}
                            </Text>
                        )}
                    </View>
                </View>

                <View style={styles.infoItem}>
                    <Ionicons name="shield-outline" size={20} color="#666" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Função</Text>
                        <Text style={styles.infoValue}>
                            {getRoleDisplayName(userData.role)}
                        </Text>
                    </View>
                </View>

                <View style={styles.infoItem}>
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Usa o aplicativo desde</Text>
                        <Text style={styles.infoValue}>
                            {userData.createdAt
                                ? userData.createdAt.toLocaleDateString("pt-BR")
                                : "Não disponível"}
                        </Text>
                    </View>
                </View>

                {isEditing && (
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={handleCancel}
                        >
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.saveButton]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={styles.saveButtonText}>Salvar</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Configurações</Text>
                
                <TouchableOpacity style={styles.menuItem}>
                    <Ionicons name="notifications-outline" size={20} color="#666" />
                    <Text style={styles.menuText}>Notificações</Text>
                    <Ionicons name="chevron-forward" size={16} color="#999" />
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.menuItem}
                    onPress={() => setShowSupportModal(true)}
                >
                    <Ionicons name="help-circle-outline" size={20} color="#666" />
                    <Text style={styles.menuText}>Ajuda e Suporte</Text>
                    <Ionicons name="chevron-forward" size={16} color="#999" />
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.menuItem}
                    onPress={() => setShowAboutModal(true)}
                >
                    <Ionicons name="information-circle-outline" size={20} color="#666" />
                    <Text style={styles.menuText}>Sobre o App</Text>
                    <Ionicons name="chevron-forward" size={16} color="#999" />
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                    <Text style={styles.logoutText}>Sair da Conta</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <View style={styles.appInfo}>
                    <Text style={styles.appName}>Eventos ICM Mobile</Text>
                    <Text style={styles.appVersion}>Versão 1.0.0</Text>
                </View>
                
                <View style={styles.copyrightSection}>
                    <View style={styles.divider} />
                    <Text style={styles.copyrightText}>
                        © 2025 Felipe Travassos
                    </Text>
                    <Text style={styles.copyrightSubtext}>
                        Todos os direitos reservados
                    </Text>
                    <Text style={styles.developedBy}>
                        Sem fins lucrativos
                    </Text>
                </View>
            </View>

            {/* Church Picker Modal */}
            <Modal
                visible={showChurchPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowChurchPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Selecionar Igreja</Text>
                            <TouchableOpacity
                                onPress={() => setShowChurchPicker(false)}
                            >
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        <Picker
                            selectedValue={formData.churchId}
                            onValueChange={(value) => {
                                setFormData({ ...formData, churchId: value });
                                setShowChurchPicker(false);
                            }}
                            style={styles.picker}
                        >
                            <Picker.Item label="Selecionar igreja" value="" />
                            {churches.map((church) => (
                                <Picker.Item
                                    key={church.id}
                                    label={church.name}
                                    value={church.id}
                                />
                            ))}
                        </Picker>
                    </View>
                </View>
            </Modal>

            {/* Support Modal */}
            <Modal
                visible={showSupportModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowSupportModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.supportModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Ajuda e Suporte</Text>
                            <TouchableOpacity
                                onPress={() => setShowSupportModal(false)}
                            >
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.supportContent} showsVerticalScrollIndicator={false}>
                            <View style={styles.supportSection}>
                                <Text style={styles.supportSectionTitle}>
                                    📧 Contato por Email
                                </Text>
                                <TouchableOpacity 
                                    style={styles.contactItem}
                                    onPress={() => {
                                        // Linking.openURL('mailto:ftravaglia@gmail.com');
                                    }}
                                >
                                    <Ionicons name="mail-outline" size={20} color="#007AFF" />
                                    <Text style={styles.contactText}>ftravassos.icm@gmail.com</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.supportSection}>
                                <Text style={styles.supportSectionTitle}>
                                    📱 WhatsApp
                                </Text>
                                <TouchableOpacity 
                                    style={styles.contactItem}
                                    onPress={() => {
                                        // Linking.openURL('https://wa.me/5527999887766');
                                    }}
                                >
                                    <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                                    <Text style={styles.contactText}>(91) 98176-3041</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.supportSection}>
                                <Text style={styles.supportSectionTitle}>
                                    ⏰ Horário de Atendimento
                                </Text>
                                <Text style={styles.supportInfo}>
                                    Segunda a Sexta: 8h às 14h{'\n'}
                                </Text>
                            </View>

                            <View style={styles.supportSection}>
                                <Text style={styles.supportSectionTitle}>
                                    ℹ️ Sobre o Suporte
                                </Text>
                                <Text style={styles.supportInfo}>
                                    Para dúvidas técnicas, problemas com inscrições ou sugestões, 
                                    entre em contato através dos canais de whatsapp ou pelo e-mail. 
                                    Responderemos o mais breve possível!
                                </Text>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* About App Modal */}
            <Modal
                visible={showAboutModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAboutModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.supportModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Sobre o App</Text>
                            <TouchableOpacity
                                onPress={() => setShowAboutModal(false)}
                            >
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.supportContent} showsVerticalScrollIndicator={false}>
                            <View style={styles.aboutSection}>
                                <View style={styles.appIconContainer}>
                                    <Ionicons name="calendar" size={40} color="#007AFF" />
                                </View>
                                <Text style={styles.appTitle}>Eventos ICM Mobile</Text>
                                <Text style={styles.appVersion}>Versão 1.0.0</Text>
                            </View>

                            <View style={styles.supportSection}>
                                <Text style={styles.supportSectionTitle}>
                                    📱 Sobre o Aplicativo
                                </Text>
                                <Text style={styles.supportInfo}>
                                    O Eventos ICM Mobile é o aplicativo para gerenciamento de eventos locais e inscrições. 
                                    Desenvolvido para facilitar a participação dos membros 
                                    em eventos e seminários locais.
                                </Text>
                            </View>

                            <View style={styles.supportSection}>
                                <Text style={styles.supportSectionTitle}>
                                    ⚡ Principais Funcionalidades
                                </Text>
                                <Text style={styles.supportInfo}>
                                    • Visualização de eventos disponíveis{'\n'}
                                    • Inscrições rápidas e seguras{'\n'}
                                    • Histórico de participações{'\n'}
                                    • Notificações de eventos
                                </Text>
                            </View>

                            <View style={styles.supportSection}>
                                <Text style={styles.supportSectionTitle}>
                                    🏛️ Igreja Cristã Maranata
                                </Text>
                                <Text style={styles.supportInfo}>
                                    Desenvolvido com dedicação para servir as igrejas locais, 
                                    promovendo maior participação e engajamento nos eventos da igreja.
                                </Text>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F2F2F7",
    },
    centered: {
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: "#666",
    },
    header: {
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        paddingVertical: 30,
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    avatarContainer: {
        marginBottom: 15,
    },
    userName: {
        fontSize: 24,
        fontWeight: "600",
        color: "#000",
        marginBottom: 5,
    },
    userEmail: {
        fontSize: 16,
        color: "#666",
        marginBottom: 5,
    },
    userRole: {
        fontSize: 14,
        color: "#007AFF",
        fontWeight: "500",
    },
    section: {
        backgroundColor: "#FFFFFF",
        marginBottom: 20,
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#000",
    },
    editButton: {
        padding: 5,
    },
    infoItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
    },
    infoContent: {
        flex: 1,
        marginLeft: 15,
    },
    infoLabel: {
        fontSize: 14,
        color: "#666",
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        color: "#000",
    },
    input: {
        fontSize: 16,
        color: "#000",
        borderWidth: 1,
        borderColor: "#DDD",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#FFF",
    },
    pickerButton: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#DDD",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: "#FFF",
    },
    pickerButtonText: {
        fontSize: 16,
        color: "#000",
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
        gap: 10,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: "#F0F0F0",
    },
    cancelButtonText: {
        color: "#666",
        fontSize: 16,
        fontWeight: "500",
    },
    saveButton: {
        backgroundColor: "#007AFF",
    },
    saveButtonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "500",
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        color: "#000",
        marginLeft: 15,
    },
    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 15,
    },
    logoutText: {
        fontSize: 16,
        color: "#FF3B30",
        marginLeft: 10,
        fontWeight: "500",
    },
    footer: {
        alignItems: "center",
        paddingVertical: 30,
        paddingBottom: 50,
        paddingHorizontal: 20,
    },
    appInfo: {
        alignItems: "center",
        marginBottom: 20,
    },
    appName: {
        fontSize: 16,
        color: "#007AFF",
        fontWeight: "600",
        marginBottom: 4,
    },
    appVersion: {
        fontSize: 12,
        color: "#999",
    },
    copyrightSection: {
        alignItems: "center",
        width: "100%",
    },
    divider: {
        width: "60%",
        height: 1,
        backgroundColor: "#E0E0E0",
        marginBottom: 15,
    },
    copyrightText: {
        fontSize: 14,
        color: "#333",
        fontWeight: "500",
        marginBottom: 4,
    },
    copyrightSubtext: {
        fontSize: 12,
        color: "#666",
        marginBottom: 8,
    },
    developedBy: {
        fontSize: 12,
        color: "#007AFF",
        fontStyle: "italic",
        textAlign: "center",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
        maxHeight: "75%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#000",
    },
    picker: {
        height: 200,
    },
    supportModalContent: {
        backgroundColor: "#FFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
        maxHeight: "75%",
    },
    supportContent: {
        padding: 20,
    },
    supportSection: {
        marginBottom: 25,
    },
    supportSectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 12,
    },
    contactItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8F9FA",
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E9ECEF",
    },
    contactText: {
        fontSize: 16,
        color: "#333",
        marginLeft: 12,
        fontWeight: "500",
    },
    supportInfo: {
        fontSize: 14,
        color: "#666",
        lineHeight: 20,
        backgroundColor: "#F8F9FA",
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E9ECEF",
    },
    aboutSection: {
        alignItems: "center",
        marginBottom: 25,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
    },
    appIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: "#F0F8FF",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 15,
    },
    appTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#007AFF",
        marginBottom: 5,
    },
    appVersion: {
        fontSize: 14,
        color: "#666",
        fontWeight: "500",
    },
});