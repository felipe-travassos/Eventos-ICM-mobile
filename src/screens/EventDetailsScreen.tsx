// src/screens/EventDetailsScreen.tsx
import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import Toast from 'react-native-toast-message';
import { StackScreenProps } from "@react-navigation/stack";
import { doc, getDoc, collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase/config";
import { Event, EventRegistration } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { getChurchById } from "../lib/firebase/churches";
import { EventsStackParamList, MyRegistrationsStackParamList } from "../components/Navigation";
import { registerForEvent, getActiveEventsWithSync } from "../lib/firebase/events";
import { useRegistrationEligibility } from "../lib/firebase/userRegistrationValidation";

// Tipos para as diferentes rotas que podem levar ao EventDetailsScreen
type EventDetailsScreenProps = 
    | StackScreenProps<EventsStackParamList, 'EventDetails'>
    | StackScreenProps<MyRegistrationsStackParamList, 'EventDetails'>;

export default function EventDetailsScreen({ route, navigation }: EventDetailsScreenProps) {
    const { eventId } = route.params;
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [userRegistration, setUserRegistration] = useState<EventRegistration | null>(null);
    const { currentUser, userData } = useAuth();
    const { canRegister: canUserRegister, errorMessage } = useRegistrationEligibility(userData);

    useEffect(() => {
        loadEventDetails();
        checkUserRegistration();
    }, [eventId, currentUser]);

    const loadEventDetails = async () => {
        try {
            const eventDoc = await getDoc(doc(db, "events", eventId));
            
            if (eventDoc.exists()) {
                const eventData = {
                    id: eventDoc.id,
                    ...eventDoc.data(),
                    date: eventDoc.data().date?.toDate() || new Date(),
                    createdAt: eventDoc.data().createdAt?.toDate() || new Date(),
                    updatedAt: eventDoc.data().updatedAt?.toDate() || new Date(),
                } as Event;
                
                setEvent(eventData);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Erro',
                    text2: 'Evento não encontrado'
                });
                navigation.goBack();
            }
        } catch (error) {
            console.error("Erro ao carregar evento:", error);
            Toast.show({
                type: 'error',
                text1: 'Erro',
                text2: 'Não foi possível carregar os detalhes do evento'
            });
        } finally {
            setLoading(false);
        }
    };

    const checkUserRegistration = async () => {
        if (!currentUser) return;

        try {
            const registrationQuery = query(
                collection(db, "registrations"),
                where("eventId", "==", eventId),
                where("userId", "==", currentUser.uid)
            );
            
            const snapshot = await getDocs(registrationQuery);
            
            if (!snapshot.empty) {
                const registrationDoc = snapshot.docs[0];
                const registrationData = {
                    id: registrationDoc.id,
                    ...registrationDoc.data(),
                    createdAt: registrationDoc.data().createdAt?.toDate() || new Date(),
                    updatedAt: registrationDoc.data().updatedAt?.toDate() || new Date(),
                    approvedAt: registrationDoc.data().approvedAt?.toDate(),
                    paymentDate: registrationDoc.data().paymentDate?.toDate(),
                } as EventRegistration;
                
                setUserRegistration(registrationData);
            }
        } catch (error) {
            console.error("Erro ao verificar inscrição:", error);
        }
    };

    const handleRegistration = async () => {
        if (!currentUser || !event || !userData) return;

        // Verificar se o usuário pode se inscrever (dados completos)
        if (!canUserRegister) {
            Toast.show({
                type: 'warning',
                text1: 'Dados Incompletos',
                text2: errorMessage || 'Complete seus dados no perfil antes de se inscrever em eventos.',
                visibilityTime: 4000,
                onPress: () => navigation.navigate("Profile")
            });
            return;
        }

        setRegistering(true);
        
        try {
            const result = await registerForEvent(
                eventId, 
                currentUser.uid,
                {
                    name: userData.name || '',
                    email: userData.email || '',
                    phone: userData.phone || '',
                    church: userData.churchId || '',
                    cpf: userData.cpf || ''
                },
                userData
            );
            
            if (result.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Sucesso!',
                    text2: result.message,
                    onHide: () => {
                        checkUserRegistration();
                        // Recarregar o evento para atualizar o contador
                        loadEventDetails();
                    }
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Erro',
                    text2: result.message
                });
            }
        } catch (error: any) {
            console.error("Erro ao realizar inscrição:", error);
            Toast.show({
                type: 'error',
                text1: 'Erro',
                text2: error.message || 'Não foi possível realizar a inscrição. Tente novamente.'
            });
        } finally {
            setRegistering(false);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(price);
    };

    const getRegistrationButtonText = () => {
        if (!currentUser) return "Faça login para se inscrever";
        if (userRegistration) {
            switch (userRegistration.status) {
                case "confirmed":
                    return "Inscrição Confirmada";
                case "pending":
                    return "Aguardando Aprovação";
                case "approved":
                    return "Aprovado - Pode Pagar";
                case "rejected":
                    return "Inscrição Rejeitada";
                case "cancelled":
                    return "Inscrição Cancelada";
                default:
                    return "Inscrito";
            }
        }
        return "Inscrever-se";
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "confirmed":
                return "#28a745"; // Verde
            case "pending":
                return "#ffc107"; // Amarelo
            case "approved":
                return "#007bff"; // Azul
            case "rejected":
                return "#dc3545"; // Vermelho
            case "cancelled":
                return "#6c757d"; // Cinza
            default:
                return "#6c757d";
        }
    };

    const getStatusMessage = (registration: EventRegistration) => {
        switch (registration.status) {
            case "pending":
                return "Sua inscrição foi enviada e está aguardando aprovação do secretário local, secretário regional ou pastor.";
            case "approved":
                return "Sua inscrição foi aprovada! Agora você pode realizar o pagamento.";
            case "rejected":
                return registration.rejectionReason 
                    ? `Inscrição rejeitada: ${registration.rejectionReason}`
                    : "Sua inscrição foi rejeitada. Entre em contato com a organização para mais informações.";
            case "confirmed":
                return "Inscrição confirmada e pagamento realizado com sucesso!";
            case "cancelled":
                return "Inscrição cancelada.";
            default:
                return "";
        }
    };

    const canShowPaymentButton = () => {
        return userRegistration && 
               userRegistration.status === "approved" && 
               userRegistration.paymentStatus === "pending" &&
               event && event.price > 0;
    };

    const canRegister = () => {
        return currentUser && !userRegistration && event?.status === "active" && canUserRegister;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Carregando evento...</Text>
            </View>
        );
    }

    if (!event) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Evento não encontrado</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>{event.title}</Text>
                
                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Data:</Text>
                        <Text style={styles.infoValue}>{formatDate(event.date)}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Horário:</Text>
                        <Text style={styles.infoValue}>{formatTime(event.date)}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Local:</Text>
                        <Text style={styles.infoValue}>{event.location}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Preço:</Text>
                        <Text style={styles.infoValue}>{formatPrice(event.price)}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Vagas:</Text>
                        <Text style={styles.infoValue}>
                            {event.currentParticipants || 0} / {event.maxParticipants || "Ilimitado"}
                        </Text>
                    </View>
                </View>

                {event.description && (
                    <View style={styles.descriptionSection}>
                        <Text style={styles.sectionTitle}>Descrição</Text>
                        <Text style={styles.description}>{event.description}</Text>
                    </View>
                )}

                {userRegistration && (
                    <View style={styles.registrationStatus}>
                        <Text style={styles.sectionTitle}>Status da Inscrição</Text>
                        <View style={[styles.statusCard, { borderLeftColor: getStatusColor(userRegistration.status), borderLeftWidth: 4 }]}>
                            <View style={styles.statusHeader}>
                                <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(userRegistration.status) }]}>
                                    {getRegistrationButtonText()}
                                </Text>
                            </View>
                            
                            <Text style={styles.statusMessage}>
                                {getStatusMessage(userRegistration)}
                            </Text>
                            
                            <View style={styles.statusDetails}>
                                <Text style={styles.statusDetailText}>
                                    Pagamento: {userRegistration.paymentStatus === "paid" ? "Pago" : "Pendente"}
                                </Text>
                                
                                {userRegistration.approvedBy && userRegistration.approvedAt && (
                                    <Text style={styles.statusDetailText}>
                                        Aprovado em: {new Date(userRegistration.approvedAt).toLocaleDateString('pt-BR')}
                                    </Text>
                                )}
                                
                                <Text style={styles.statusDetailText}>
                                    Inscrito em: {new Date(userRegistration.createdAt).toLocaleDateString('pt-BR')}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Aviso sobre dados incompletos */}
                {currentUser && !canUserRegister && !userRegistration && (
                    <View style={styles.warningSection}>
                        <Text style={styles.warningTitle}>⚠️ Dados Incompletos</Text>
                        <Text style={styles.warningText}>
                            {errorMessage || "Complete seus dados no perfil antes de se inscrever em eventos."}
                        </Text>
                        <TouchableOpacity
                            style={styles.profileButton}
                            onPress={() => navigation.navigate("Profile")}
                        >
                            <Text style={styles.profileButtonText}>Completar Perfil</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity
                    style={[
                        styles.registerButton,
                        !canRegister() && styles.registerButtonDisabled,
                    ]}
                    onPress={handleRegistration}
                    disabled={!canRegister() || registering}
                >
                    {registering ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.registerButtonText}>
                            {getRegistrationButtonText()}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    content: {
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 20,
        textAlign: "center",
    },
    infoSection: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    infoLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
    },
    infoValue: {
        fontSize: 16,
        color: "#666",
        flex: 1,
        textAlign: "right",
    },
    descriptionSection: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 12,
    },
    description: {
        fontSize: 16,
        color: "#666",
        lineHeight: 24,
    },
    registrationStatus: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    statusCard: {
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
        padding: 12,
    },
    statusText: {
        fontSize: 16,
        color: "#333",
        marginBottom: 4,
    },
    registerButton: {
        backgroundColor: "#007AFF",
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        marginTop: 20,
    },
    registerButtonDisabled: {
        backgroundColor: "#ccc",
    },
    registerButtonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: "#666",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: {
        fontSize: 18,
        color: "#666",
    },
    warningSection: {
        backgroundColor: "#fff3cd",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#ffeaa7",
    },
    warningTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#856404",
        marginBottom: 8,
    },
    warningText: {
        fontSize: 14,
        color: "#856404",
        marginBottom: 12,
        lineHeight: 20,
    },
    profileButton: {
        backgroundColor: "#ffc107",
        borderRadius: 8,
        padding: 12,
        alignItems: "center",
    },
    profileButtonText: {
        color: "#212529",
        fontSize: 14,
        fontWeight: "600",
    },
    statusHeader: {
        marginBottom: 12,
    },
    statusBadge: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "bold",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        textAlign: "center",
        alignSelf: "flex-start",
    },
    statusMessage: {
        fontSize: 14,
        color: "#666",
        lineHeight: 20,
        marginBottom: 12,
        fontStyle: "italic",
    },
    statusDetails: {
        borderTopWidth: 1,
        borderTopColor: "#e9ecef",
        paddingTop: 12,
    },
    statusDetailText: {
        fontSize: 13,
        color: "#6c757d",
        marginBottom: 4,
    },
});
