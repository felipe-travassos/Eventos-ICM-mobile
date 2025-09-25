// src/screens/MyRegistrationsScreen.tsx
import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Alert,
    Modal,
    Linking,
    Clipboard,
} from "react-native";
import { collection, getDocs, query, where, orderBy, doc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase/config";
import { EventRegistration, Event, PaymentData } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { processRegistrationPayment, checkPaymentStatus, updatePaymentStatus } from "../lib/firebase/payments";

interface MyRegistrationsScreenProps {
    navigation: any;
}

export default function MyRegistrationsScreen({ navigation }: MyRegistrationsScreenProps) {
    const [registrations, setRegistrations] = useState<(EventRegistration & { event?: Event })[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [registrationToDelete, setRegistrationToDelete] = useState<EventRegistration & { event?: Event } | null>(null);
    const [processingPayment, setProcessingPayment] = useState<string | null>(null);
    const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const { currentUser, userData } = useAuth();

    const loadRegistrations = async () => {
        if (!currentUser) return;

        try {
            const registrationsQuery = query(
                collection(db, "registrations"),
                where("userId", "==", currentUser.uid),
                orderBy("createdAt", "desc")
            );
            
            const snapshot = await getDocs(registrationsQuery);
            const registrationsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date(),
                approvedAt: doc.data().approvedAt?.toDate(),
                paymentDate: doc.data().paymentDate?.toDate(),
            })) as EventRegistration[];

            // Load event details for each registration
            const registrationsWithEvents = await Promise.all(
                registrationsData.map(async (registration) => {
                    try {
                        const eventQuery = query(
                            collection(db, "events"),
                            where("__name__", "==", registration.eventId)
                        );
                        const eventSnapshot = await getDocs(eventQuery);
                        
                        if (!eventSnapshot.empty) {
                            const eventDoc = eventSnapshot.docs[0];
                            const eventData = {
                                id: eventDoc.id,
                                ...eventDoc.data(),
                                date: eventDoc.data().date?.toDate() || new Date(),
                                createdAt: eventDoc.data().createdAt?.toDate() || new Date(),
                                updatedAt: eventDoc.data().updatedAt?.toDate() || new Date(),
                            } as Event;
                            
                            return { ...registration, event: eventData };
                        }
                    } catch (error) {
                        console.error("Erro ao carregar evento:", error);
                    }
                    return registration;
                })
            );

            setRegistrations(registrationsWithEvents);
        } catch (error) {
            console.error("Erro ao carregar inscrições:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadRegistrations();
    }, [currentUser]);

    const onRefresh = () => {
        setRefreshing(true);
        loadRegistrations();
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "confirmed":
                return "#28a745";
            case "pending":
                return "#ffc107";
            case "approved":
                return "#007AFF";
            case "rejected":
                return "#dc3545";
            case "cancelled":
                return "#6c757d";
            default:
                return "#6c757d";
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "confirmed":
                return "Confirmado";
            case "pending":
                return "Pendente";
            case "approved":
                return "Aprovado";
            case "rejected":
                return "Rejeitado";
            case "cancelled":
                return "Cancelado";
            default:
                return status;
        }
    };

    const getPaymentStatusText = (status: string) => {
        switch (status) {
            case "paid":
                return "Pago";
            case "pending":
                return "Pendente";
            case "refunded":
                return "Reembolsado";
            default:
                return status;
        }
    };

    const canDeleteRegistration = (registration: EventRegistration & { event?: Event }) => {
        // Só pode excluir se o pagamento estiver pendente
        return registration.paymentStatus === "pending";
    };

    const canMakePayment = (registration: EventRegistration & { event?: Event }) => {
        // Pode fazer pagamento se estiver aprovado e pagamento pendente
        return registration.status === "approved" && registration.paymentStatus === "pending" && registration.event?.price && registration.event.price > 0;
    };

    const handlePayment = async (registration: EventRegistration & { event?: Event }) => {
        if (!userData || !registration.event) return;

        console.log('🚀 Iniciando processo de pagamento para:', registration.id);

        // ✅ Verificar se já existe um paymentId
        if (registration.paymentId) {
            console.log('💾 Pagamento já existe, recuperando dados do PIX...');
            console.log('🔍 PaymentId encontrado:', registration.paymentId);
            
            try {
                // Buscar dados do pagamento existente
                const statusUrl = `http://192.168.1.100:3000/api/pix/status?paymentId=${registration.paymentId}&registrationId=${registration.id}`;
                console.log('📡 Fazendo requisição para status:', statusUrl);
                
                const response = await fetch(statusUrl);
                console.log('📊 Status response:', response.status, response.ok);

                if (response.ok) {
                    const statusData = await response.json();
                    console.log('✅ Status data recebido:', statusData);

                    // Buscar dados completos do PIX
                    const pixUrl = `http://192.168.1.100:3000/api/pix/get-payment?paymentId=${registration.paymentId}`;
                    console.log('📡 Fazendo requisição para PIX data:', pixUrl);
                    
                    const pixResponse = await fetch(pixUrl);
                    console.log('📊 PIX response:', pixResponse.status, pixResponse.ok);

                    if (pixResponse.ok) {
                        const pixData = await pixResponse.json();
                        console.log('✅ PIX data recebido:', JSON.stringify(pixData, null, 2));
                        
                        // Verificar se os dados essenciais existem
                        if (!pixData.qr_code || !pixData.qr_code_base64) {
                            console.error('❌ Dados essenciais do PIX não encontrados:', {
                                hasQrCode: !!pixData.qr_code,
                                hasQrCodeBase64: !!pixData.qr_code_base64,
                                hasTicketUrl: !!pixData.ticket_url
                            });
                            // Continuar para criar novo pagamento
                        } else {
                            // Criar PaymentData compatível
                            const existingPaymentData = {
                                registrationId: registration.id,
                                eventId: registration.eventId,
                                amount: registration.event.price || 0,
                                description: `Inscrição: ${registration.event.title}`,
                                qrCode: pixData.qr_code,
                                qrCodeBase64: pixData.qr_code_base64,
                                ticketUrl: pixData.ticket_url,
                                paymentId: pixData.id,
                                externalReference: pixData.external_reference
                            };

                            console.log('🎯 PaymentData criado:', JSON.stringify(existingPaymentData, null, 2));
                            
                            // Verificar se setPaymentData e setShowPaymentModal existem
                            console.log('🔧 Verificando funções:', {
                                hasSetPaymentData: typeof setPaymentData === 'function',
                                hasSetShowPaymentModal: typeof setShowPaymentModal === 'function'
                            });
                            
                            setPaymentData(existingPaymentData);
                            setShowPaymentModal(true);
                            
                            console.log('✅ PIX existente recuperado com sucesso - Modal deve abrir');
                            console.log('🎯 Estado atual:', {
                                paymentDataSet: !!existingPaymentData,
                                modalShouldShow: true
                            });
                            return;
                        }
                    } else {
                        const pixError = await pixResponse.text();
                        console.error('❌ Erro na resposta do PIX:', pixError);
                    }
                } else {
                    const statusError = await response.text();
                    console.error('❌ Erro na resposta do status:', statusError);
                }

                // Se não conseguir buscar, continuar para criar novo
                console.log('⚠️ Não foi possível recuperar PIX existente, criando novo...');
            } catch (error) {
                console.error('❌ Erro ao recuperar PIX existente:', error);
                // Continuar para criar novo pagamento
            }
        }

        // Se não existe paymentId ou não conseguiu recuperar, criar novo
        setProcessingPayment(registration.id);

        try {
            const paymentResult = await processRegistrationPayment(
                registration.id,
                registration.event,
                userData
            );

            setPaymentData(paymentResult);
            setShowPaymentModal(true);

            console.log('✅ Novo pagamento processado com sucesso');

        } catch (error: any) {
            console.error('❌ Erro no processo de pagamento:', error);
            Alert.alert('Erro', `Erro ao processar pagamento: ${error.message}`);
        } finally {
            setProcessingPayment(null);
        }
    };

    const handleCopyPix = () => {
        if (paymentData?.qrCode) {
            Clipboard.setString(paymentData.qrCode);
            Alert.alert('Sucesso', 'Código PIX copiado para a área de transferência!');
        }
    };

    const handleCheckPaymentStatus = async () => {
        if (!paymentData?.paymentId) return;

        try {
            console.log('🔍 Verificando status do pagamento...');

            const statusResult = await checkPaymentStatus(paymentData.paymentId, paymentData.registrationId);

            if (statusResult.status === 'approved') {
                // Atualizar status no Firestore
                await updatePaymentStatus(paymentData.registrationId, 'paid');

                // Atualizar estado local
                setRegistrations(prev => prev.map(reg =>
                    reg.id === paymentData.registrationId
                        ? { ...reg, paymentStatus: 'paid' }
                        : reg
                ));

                Alert.alert('Sucesso', '✅ Pagamento confirmado! Inscrição ativada.');
                setShowPaymentModal(false);
                setPaymentData(null);
            } else {
                Alert.alert('Aguarde', `⚠️ Pagamento ainda não confirmado. Status: ${statusResult.status}. Tente novamente em alguns instantes.`);
            }
        } catch (error: any) {
            console.error('❌ Erro ao verificar status:', error);
            Alert.alert('Erro', `Erro ao verificar status: ${error.message}`);
        }
    };

    const handleDeletePress = (registration: EventRegistration & { event?: Event }) => {
        setRegistrationToDelete(registration);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!registrationToDelete) return;

        setDeletingId(registrationToDelete.id);
        setShowDeleteModal(false);

        try {
            // Excluir do Firebase
            await deleteDoc(doc(db, "registrations", registrationToDelete.id));
            
            // Atualizar estado local
            setRegistrations(prev => prev.filter(reg => reg.id !== registrationToDelete.id));
            
            Alert.alert("Sucesso", "Inscrição excluída com sucesso!");
        } catch (error) {
            console.error("Erro ao excluir inscrição:", error);
            Alert.alert("Erro", "Não foi possível excluir a inscrição. Tente novamente.");
        } finally {
            setDeletingId(null);
            setRegistrationToDelete(null);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
        setRegistrationToDelete(null);
    };

    const renderRegistrationItem = ({ item }: { item: EventRegistration & { event?: Event } }) => (
        <TouchableOpacity
            style={styles.registrationCard}
            onPress={() => item.event && navigation.navigate("EventDetails", { eventId: item.event.id })}
        >
            <View style={styles.registrationHeader}>
                <Text style={styles.eventTitle}>
                    {item.event?.title || "Evento não encontrado"}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
                </View>
            </View>
            
            {item.event && (
                <>
                    <Text style={styles.eventDate}>{formatDate(item.event.date)}</Text>
                    <Text style={styles.eventLocation}>{item.event.location}</Text>
                </>
            )}
            
            <View style={styles.registrationFooter}>
                <View style={styles.footerInfo}>
                    <Text style={styles.paymentStatus}>
                        Pagamento: {getPaymentStatusText(item.paymentStatus)}
                    </Text>
                    <Text style={styles.registrationDate}>
                        Inscrito em: {formatDate(item.createdAt)}
                    </Text>
                </View>
                
                <View style={styles.buttonsContainer}>
                    {canMakePayment(item) && (
                        <TouchableOpacity
                            style={[styles.payButton, processingPayment === item.id && styles.payButtonDisabled]}
                            onPress={() => handlePayment(item)}
                            disabled={processingPayment === item.id}
                        >
                            <Text style={styles.payButtonText}>
                                {processingPayment === item.id 
                                    ? "Processando..." 
                                    : item.paymentId 
                                        ? "Ver PIX" 
                                        : "Pagar"
                                }
                            </Text>
                        </TouchableOpacity>
                    )}
                    
                    {canDeleteRegistration(item) && (
                        <TouchableOpacity
                            style={[styles.deleteButton, deletingId === item.id && styles.deleteButtonDisabled]}
                            onPress={() => handleDeletePress(item)}
                            disabled={deletingId === item.id}
                        >
                            <Text style={styles.deleteButtonText}>
                                {deletingId === item.id ? "Excluindo..." : "Excluir"}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Carregando inscrições...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={registrations}
                renderItem={renderRegistrationItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Você ainda não tem inscrições</Text>
                        <TouchableOpacity
                            style={styles.browseEventsButton}
                            onPress={() => navigation.navigate("Events")}
                        >
                            <Text style={styles.browseEventsText}>Ver Eventos Disponíveis</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
            
            {/* Modal de confirmação de exclusão */}
            <Modal
                visible={showDeleteModal}
                transparent={true}
                animationType="fade"
                onRequestClose={handleDeleteCancel}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Confirmar Exclusão</Text>
                        <Text style={styles.modalMessage}>
                            Tem certeza que deseja excluir sua inscrição para o evento{" "}
                            <Text style={styles.modalEventTitle}>
                                {registrationToDelete?.event?.title || "este evento"}
                            </Text>?
                        </Text>
                        <Text style={styles.modalWarning}>
                            Esta ação não pode ser desfeita.
                        </Text>
                        
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={handleDeleteCancel}
                            >
                                <Text style={styles.modalCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={styles.modalConfirmButton}
                                onPress={handleDeleteConfirm}
                            >
                                <Text style={styles.modalConfirmText}>Excluir</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal de pagamento PIX */}
            <Modal
                visible={showPaymentModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowPaymentModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.pixModalContent}>
                        <Text style={styles.pixModalTitle}>Pagamento PIX</Text>
                        
                        {paymentData && (
                            <>
                                <View style={styles.pixPaymentInfo}>
                                    <View style={styles.pixInfoRow}>
                                        <Text style={styles.pixInfoLabel}>Valor:</Text>
                                        <Text style={styles.pixInfoValue}>R$ {paymentData.amount.toFixed(2)}</Text>
                                    </View>
                                    <View style={styles.pixInfoRow}>
                                        <Text style={styles.pixInfoLabel}>Evento:</Text>
                                        <Text style={styles.pixInfoValue} numberOfLines={2}>
                                            {paymentData.eventName}
                                        </Text>
                                    </View>
                                </View>
                                
                                <View style={styles.pixQrContainer}>
                                    <Text style={styles.pixQrCode} numberOfLines={4}>
                                        {paymentData.qrCode}
                                    </Text>
                                </View>
                                
                                <Text style={styles.pixInstructions}>
                                    1. Copie o código PIX acima{'\n'}
                                    2. Abra seu app bancário{'\n'}
                                    3. Cole o código na área PIX{'\n'}
                                    4. Confirme o pagamento{'\n'}
                                    5. Volte aqui e clique em "Verificar Status"
                                </Text>
                                
                                <View style={styles.pixModalButtons}>
                                    <TouchableOpacity
                                        style={styles.pixCopyButton}
                                        onPress={handleCopyPix}
                                    >
                                        <Text style={styles.pixCopyButtonText}>📋 Copiar PIX</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity
                                        style={styles.pixCheckButton}
                                        onPress={handleCheckPaymentStatus}
                                    >
                                        <Text style={styles.pixCheckButtonText}>🔍 Verificar Status</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity
                                        style={styles.pixCloseButton}
                                        onPress={() => setShowPaymentModal(false)}
                                    >
                                        <Text style={styles.pixCloseButtonText}>Fechar</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    listContainer: {
        padding: 16,
    },
    registrationCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    registrationHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        flex: 1,
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    eventDate: {
        fontSize: 14,
        color: "#007AFF",
        marginBottom: 4,
    },
    eventLocation: {
        fontSize: 14,
        color: "#666",
        marginBottom: 12,
    },
    registrationFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
    },
    footerInfo: {
        flex: 1,
    },
    paymentStatus: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    registrationDate: {
        fontSize: 12,
        color: '#999',
    },
    buttonsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    deleteButton: {
        backgroundColor: '#FF4444',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    deleteButtonDisabled: {
        backgroundColor: '#CCCCCC',
    },
    deleteButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    payButton: {
        backgroundColor: '#28A745',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    payButtonDisabled: {
        backgroundColor: '#CCCCCC',
    },
    payButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    // Estilos do modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
        marginBottom: 12,
        textAlign: 'center',
    },
    modalEventTitle: {
        fontWeight: '600',
        color: '#333',
    },
    modalWarning: {
        fontSize: 14,
        color: '#FF4444',
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalCancelText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    modalConfirmButton: {
        flex: 1,
        backgroundColor: '#FF4444',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalConfirmText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
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
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        marginBottom: 20,
    },
    browseEventsButton: {
        backgroundColor: "#007AFF",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    browseEventsText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    // Estilos do modal PIX
    pixModalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 24,
        width: '90%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    pixModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    pixPaymentInfo: {
        marginBottom: 20,
    },
    pixInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        alignItems: 'center',
    },
    pixInfoLabel: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
    },
    pixInfoValue: {
        fontSize: 16,
        color: '#333',
        fontWeight: 'bold',
    },
    pixQrContainer: {
        alignItems: 'center',
        marginBottom: 20,
        padding: 16,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
    },
    pixQrCode: {
        fontSize: 11,
        color: '#333',
        textAlign: 'center',
        fontFamily: 'monospace',
        lineHeight: 16,
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        width: '100%',
    },
    pixInstructions: {
        fontSize: 14,
        color: '#666',
        textAlign: 'left',
        lineHeight: 22,
        marginBottom: 24,
        paddingHorizontal: 8,
    },
    pixModalButtons: {
        gap: 12,
    },
    pixCopyButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 8,
    },
    pixCopyButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    pixCheckButton: {
        backgroundColor: '#28A745',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 8,
    },
    pixCheckButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    pixCloseButton: {
        backgroundColor: '#F5F5F5',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    pixCloseButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
});
