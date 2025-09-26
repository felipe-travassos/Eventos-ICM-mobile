// src/screens/EventsScreen.tsx
import React, { useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { Event } from "../types";
import { getActiveEventsWithSync, checkUserRegistration } from "../lib/firebase/events";
import { useAuth } from "../contexts/AuthContext";

interface EventsScreenProps {
    navigation: any;
}

export default function EventsScreen({ navigation }: EventsScreenProps) {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userRegistrations, setUserRegistrations] = useState<Set<string>>(new Set());
    const { currentUser } = useAuth();

    const loadEvents = async () => {
        try {
            console.log('🔄 Carregando eventos com sincronização...');
            const eventsData = await getActiveEventsWithSync();
            setEvents(eventsData);
            
            // Verificar inscrições do usuário para cada evento
            if (currentUser) {
                await checkUserRegistrations(eventsData);
            }
        } catch (error) {
            console.error("Erro ao carregar eventos:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const checkUserRegistrations = async (eventsData: Event[]) => {
        if (!currentUser) return;
        
        try {
            const registrationPromises = eventsData.map(async (event) => {
                const isRegistered = await checkUserRegistration(event.id, currentUser.uid);
                return { eventId: event.id, isRegistered };
            });
            
            const results = await Promise.all(registrationPromises);
            const registeredEventIds = new Set(
                results.filter(result => result.isRegistered).map(result => result.eventId)
            );
            
            setUserRegistrations(registeredEventIds);
        } catch (error) {
            console.error("Erro ao verificar inscrições do usuário:", error);
        }
    };

    useEffect(() => {
        loadEvents();
    }, []);

    // Recarregar eventos quando a tela receber foco
    useFocusEffect(
        React.useCallback(() => {
            if (currentUser) {
                loadEvents();
            }
        }, [currentUser])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadEvents();
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(price);
    };

    const renderEventItem = ({ item }: { item: Event }) => {
        const isUserRegistered = userRegistrations.has(item.id);
        
        return (
            <TouchableOpacity
                style={styles.eventCard}
                onPress={() => navigation.navigate("EventDetails", { eventId: item.id })}
            >
                {item.imageURL && (
                    <Image source={{ uri: item.imageURL }} style={styles.eventImage} />
                )}
                <View style={styles.eventContent}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <Text style={styles.eventDate}>{formatDate(item.date)}</Text>
                    <Text style={styles.eventLocation}>{item.location}</Text>
                    <Text style={styles.eventChurch}>{item.churchName}</Text>
                    
                    {isUserRegistered && (
                        <TouchableOpacity 
                            style={styles.registrationBadge}
                            onPress={() => navigation.navigate("MyRegistrations")}
                        >
                            <Text style={styles.registrationBadgeText}>✓ Você está inscrito</Text>
                        </TouchableOpacity>
                    )}
                    
                    <View style={styles.eventFooter}>
                        <Text style={styles.eventPrice}>{formatPrice(item.price)}</Text>
                        <Text style={styles.eventParticipants}>
                            {item.currentParticipants}/{item.maxParticipants} inscritos
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Carregando eventos...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={events}
                renderItem={renderEventItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Nenhum evento disponível</Text>
                    </View>
                }
            />
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
    eventCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
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
    eventImage: {
        width: "100%",
        height: 200,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    eventContent: {
        padding: 16,
    },
    eventTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 8,
        color: "#333",
    },
    eventDate: {
        fontSize: 14,
        color: "#007AFF",
        marginBottom: 4,
    },
    eventLocation: {
        fontSize: 14,
        color: "#666",
        marginBottom: 4,
    },
    eventChurch: {
        fontSize: 14,
        color: "#666",
        marginBottom: 12,
    },
    eventFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    eventPrice: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#28a745",
    },
    eventParticipants: {
        fontSize: 12,
        color: "#666",
    },
    registrationBadge: {
        backgroundColor: "#28a745",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: "flex-start",
        marginBottom: 8,
    },
    registrationBadgeText: {
        color: "#fff",
        fontSize: 12,
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
    },
});
