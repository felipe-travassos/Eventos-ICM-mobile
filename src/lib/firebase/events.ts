// src/lib/firebase/events.ts
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    query,
    where,
    orderBy,
    Timestamp,
    increment
} from 'firebase/firestore';
import { db } from './config';
import { Event, EventRegistration, User } from '@/types';
import { canUserRegisterForEvents, getRegistrationErrorMessage } from './userRegistrationValidation';

/**
 * Busca todos os eventos ativos com sincronização automática dos contadores de participantes
 * @returns Promise<Event[]> - Array de eventos ativos com contadores sincronizados
 */
export const getActiveEventsWithSync = async (): Promise<Event[]> => {
    try {
        console.log('🔄 Iniciando carregamento de eventos com sincronização...');
        
        const eventsRef = collection(db, 'events');
        const q = query(
            eventsRef,
            where('status', '==', 'active'),
            orderBy('date', 'asc')
        );

        const querySnapshot = await getDocs(q);
        const events: Event[] = [];

        // Primeiro, carregar todos os eventos
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            events.push({
                id: doc.id,
                title: data.title,
                description: data.description,
                date: data.date.toDate(),
                endDate: data.endDate?.toDate(),
                location: data.location,
                maxParticipants: data.maxParticipants,
                currentParticipants: data.currentParticipants || 0,
                price: data.price,
                churchId: data.churchId,
                churchName: data.churchName,
                status: data.status,
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
                imageURL: data.imageURL || '',
                createdBy: data.createdBy || ''
            });
        });

        // Sincronizar contadores de participantes
        const syncPromises = events.map(async (event) => {
            try {
                console.log(`🔍 Verificando evento ${event.id}: ${event.title}`);

                // Buscar inscrições reais para este evento
                const registrationsQuery = query(
                    collection(db, 'registrations'),
                    where('eventId', '==', event.id),
                    where('status', 'in', ['pending', 'approved', 'confirmed', 'paid'])
                );

                const registrationsSnapshot = await getDocs(registrationsQuery);
                const actualParticipants = registrationsSnapshot.size;

                console.log(`📊 Evento ${event.id}:`, {
                    contadorAtual: event.currentParticipants,
                    inscricoesReais: actualParticipants,
                    precisaCorrecao: event.currentParticipants !== actualParticipants
                });

                // Corrigir se houver diferença
                if (event.currentParticipants !== actualParticipants) {
                    console.log(`🔄 Corrigindo evento ${event.id}: de ${event.currentParticipants} para ${actualParticipants} participantes`);

                    await updateDoc(doc(db, 'events', event.id), {
                        currentParticipants: actualParticipants,
                        updatedAt: new Date()
                    });

                    // Atualizar também no array local
                    event.currentParticipants = actualParticipants;

                    console.log(`✅ Evento ${event.id} sincronizado: ${actualParticipants} participantes reais`);
                } else {
                    console.log(`✓ Evento ${event.id} já está sincronizado: ${actualParticipants} participantes`);
                }
            } catch (error) {
                console.error(`❌ Erro ao sincronizar evento ${event.id}:`, error);
            }
        });

        // Executar todas as sincronizações
        await Promise.all(syncPromises);
        console.log('✅ Sincronização de eventos concluída');

        return events;
    } catch (error) {
        console.error('❌ Erro ao buscar e sincronizar eventos:', error);
        return [];
    }
};

/**
 * Busca todos os eventos ativos (versão sem sincronização - mantida para compatibilidade)
 * @returns Promise<Event[]> - Array de eventos ativos
 */
export const getActiveEvents = async (): Promise<Event[]> => {
    try {
        const eventsRef = collection(db, 'events');
        const q = query(
            eventsRef,
            where('status', '==', 'active'),
            orderBy('date', 'asc')
        );

        const querySnapshot = await getDocs(q);
        const events: Event[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            events.push({
                id: doc.id,
                title: data.title,
                description: data.description,
                date: data.date.toDate(),
                endDate: data.endDate?.toDate(),
                location: data.location,
                maxParticipants: data.maxParticipants,
                currentParticipants: data.currentParticipants || 0,
                price: data.price,
                churchId: data.churchId,
                churchName: data.churchName,
                status: data.status,
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate(),
                imageURL: data.imageURL,
                createdBy: data.createdBy
            });
        });

        return events;
    } catch (error) {
        console.error('Erro ao buscar eventos:', error);
        throw error;
    }
};

/**
 * Busca um evento específico por ID
 * @param eventId - ID do evento
 * @returns Promise<Event | null> - Evento encontrado ou null
 */
export const getEventById = async (eventId: string): Promise<Event | null> => {
    try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        
        if (!eventDoc.exists()) {
            return null;
        }

        const data = eventDoc.data();
        return {
            id: eventDoc.id,
            title: data.title,
            description: data.description,
            date: data.date.toDate(),
            endDate: data.endDate?.toDate(),
            location: data.location,
            maxParticipants: data.maxParticipants,
            currentParticipants: data.currentParticipants || 0,
            price: data.price,
            churchId: data.churchId,
            churchName: data.churchName,
            status: data.status,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
            imageURL: data.imageURL,
            createdBy: data.createdBy
        };
    } catch (error) {
        console.error('Erro ao buscar evento:', error);
        throw error;
    }
};

/**
 * Registra um usuário em um evento
 * @param eventId - ID do evento
 * @param userId - ID do usuário
 * @param userData - Dados do usuário (nome, email, telefone, igreja)
 * @param fullUserData - Dados completos do usuário para validação
 * @returns Promise<{success: boolean, message: string}> - Resultado da operação
 */
export const registerForEvent = async (
    eventId: string,
    userId: string,
    userData: { name: string; email: string; phone: string; church: string; cpf?: string },
    fullUserData?: User
): Promise<{ success: boolean; message: string }> => {
    try {
        // Validar se o usuário tem dados completos para se inscrever
        if (fullUserData) {
            const canRegister = canUserRegisterForEvents(fullUserData);
            if (!canRegister) {
                const errorMessage = getRegistrationErrorMessage(fullUserData);
                return { success: false, message: errorMessage };
            }
        }

        // Validações de dados obrigatórios
        if (!userData.phone || userData.phone.length < 10) {
            return { success: false, message: 'Número de celular inválido' };
        }

        if (!userData.church) {
            return { success: false, message: 'Igreja não informada' };
        }

        console.log('Iniciando registro para evento:', eventId, userId);

        // Verificar se o evento existe
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (!eventDoc.exists()) {
            return { success: false, message: 'Evento não encontrado' };
        }

        const eventData = eventDoc.data();
        
        // Verificar se o evento está ativo
        if (eventData.status !== 'active') {
            return { success: false, message: 'Este evento não está mais disponível para inscrições' };
        }

        // Verificar se ainda há vagas
        const currentParticipants = eventData.currentParticipants || 0;
        if (currentParticipants >= eventData.maxParticipants) {
            return { success: false, message: 'Evento lotado' };
        }

        // Verificar se o usuário já está inscrito
        const existingRegistrationQuery = query(
            collection(db, 'registrations'),
            where('eventId', '==', eventId),
            where('userId', '==', userId)
        );
        
        const existingRegistrations = await getDocs(existingRegistrationQuery);
        if (!existingRegistrations.empty) {
            return { success: false, message: 'Você já está inscrito neste evento' };
        }

        // Verificar se já existe inscrição com o mesmo CPF
        if (userData.cpf) {
            const cpfQuery = query(
                collection(db, 'registrations'),
                where('eventId', '==', eventId),
                where('userCpf', '==', userData.cpf)
            );
            
            const cpfRegistrations = await getDocs(cpfQuery);
            if (!cpfRegistrations.empty) {
                return { success: false, message: 'Já existe uma inscrição com este CPF para este evento' };
            }
        }

        // Buscar dados da igreja do usuário
        let churchName = userData.church;
        let pastorName = '';
        
        if (fullUserData?.churchId) {
            try {
                const churchDoc = await getDoc(doc(db, 'churches', fullUserData.churchId));
                if (churchDoc.exists()) {
                    const churchData = churchDoc.data();
                    churchName = churchData.name;
                    pastorName = churchData.pastorName || '';
                }
            } catch (error) {
                console.warn('Erro ao buscar dados da igreja:', error);
            }
        }

        // Criar a inscrição
        const registrationData = {
            eventId,
            userId,
            userName: userData.name,
            userEmail: userData.email,
            userPhone: userData.phone,
            userChurch: fullUserData?.churchId || '',
            churchName,
            pastorName,
            status: 'pending' as const,
            paymentStatus: 'pending' as const,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        // Adicionar a inscrição
        await addDoc(collection(db, 'registrations'), registrationData);

        // Atualizar contador de participantes do evento
        await updateDoc(doc(db, 'events', eventId), {
            currentParticipants: increment(1),
            updatedAt: Timestamp.now()
        });

        console.log('Registro criado com sucesso');
        return { success: true, message: 'Inscrição realizada com sucesso!' };

    } catch (error) {
        console.error('Erro ao registrar para evento:', error);
        return { success: false, message: 'Erro interno do servidor' };
    }
};

/**
 * Busca todas as inscrições de um usuário
 * @param userId - ID do usuário
 * @returns Promise<EventRegistration[]> - Array de inscrições do usuário
 */
export const getUserRegistrations = async (userId: string): Promise<EventRegistration[]> => {
    try {
        const registrationsRef = collection(db, 'registrations');
        const q = query(
            registrationsRef,
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const registrations: EventRegistration[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            registrations.push({
                id: doc.id,
                eventId: data.eventId,
                userId: data.userId,
                userType: data.userType,
                seniorId: data.seniorId,
                userName: data.userName,
                userEmail: data.userEmail,
                userPhone: data.userPhone,
                userChurch: data.userChurch,
                churchName: data.churchName,
                userCpf: data.userCpf,
                pastorName: data.pastorName,
                status: data.status,
                paymentStatus: data.paymentStatus,
                paymentDate: data.paymentDate?.toDate(),
                registeredBy: data.registeredBy,
                registeredByName: data.registeredByName,
                registrationType: data.registrationType,
                paymentId: data.paymentId || '',
                approvedBy: data.approvedBy,
                approvedAt: data.approvedAt?.toDate(),
                rejectionReason: data.rejectionReason,
                rejectedBy: data.rejectedBy,
                checkedIn: data.checkedIn,
                checkedInAt: data.checkedInAt?.toDate(),
                checkedInBy: data.checkedInBy,
                checkedInByName: data.checkedInByName,
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate()
            } as EventRegistration);
        });

        return registrations;
    } catch (error) {
        console.error('Erro ao buscar inscrições do usuário:', error);
        throw error;
    }
};

/**
 * Verifica se um usuário já está inscrito em um evento
 * @param eventId - ID do evento
 * @param userId - ID do usuário
 * @returns Promise<boolean> - True se usuário já está inscrito
 */
export const checkUserRegistration = async (eventId: string, userId: string): Promise<boolean> => {
    try {
        const q = query(
            collection(db, 'registrations'),
            where('eventId', '==', eventId),
            where('userId', '==', userId),
            where('status', 'in', ['pending', 'approved', 'confirmed'])
        );

        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error) {
        console.error('Erro ao verificar inscrição do usuário:', error);
        return false;
    }
};