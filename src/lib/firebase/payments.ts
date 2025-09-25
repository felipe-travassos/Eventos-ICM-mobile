// src/lib/firebase/payments.ts
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './config';

// URL base da API do projeto NextJS - ajuste conforme necessário
const API_BASE_URL = 'http://192.168.100.4:3000'; // ou sua URL de produção

export interface PaymentData {
    registrationId: string;
    eventId: string;
    amount: number;
    description: string;
    qrCode?: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
    paymentId?: string;
    externalReference?: string;
}

export interface PaymentRequest {
    transaction_amount: number;
    description: string;
    payment_method_id: string;
    payer: {
        email: string;
        first_name: string;
        last_name: string;
    };
    metadata: {
        registrationId: string;
        eventId: string;
        eventName: string;
        userId: string;
        userName: string;
    };
}

/**
 * Cria um pagamento PIX através da API do NextJS
 */
export const createPixPayment = async (paymentRequest: PaymentRequest): Promise<PaymentData> => {
    try {
        console.log('🔄 Criando pagamento PIX...', paymentRequest);

        const response = await fetch(`${API_BASE_URL}/api/pix/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentRequest),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao criar pagamento');
        }

        const paymentResult = await response.json();

        return {
            registrationId: paymentRequest.metadata.registrationId,
            eventId: paymentRequest.metadata.eventId,
            amount: paymentRequest.transaction_amount,
            description: paymentRequest.description,
            qrCode: paymentResult.qr_code,
            qrCodeBase64: paymentResult.qr_code_base64,
            ticketUrl: paymentResult.ticket_url,
            paymentId: paymentResult.id,
            externalReference: paymentResult.external_reference,
        };
    } catch (error) {
        console.error('❌ Erro ao criar pagamento PIX:', error);
        throw error;
    }
};

/**
 * Verifica o status de um pagamento
 */
export const checkPaymentStatus = async (paymentId: string, registrationId: string) => {
    try {
        console.log('🔍 Verificando status do pagamento...', paymentId);

        const response = await fetch(`${API_BASE_URL}/api/pix/status?paymentId=${paymentId}&registrationId=${registrationId}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao verificar status');
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Erro ao verificar status do pagamento:', error);
        throw error;
    }
};

/**
 * Busca dados completos de um pagamento
 */
export const getPaymentData = async (paymentId: string) => {
    try {
        console.log('📄 Buscando dados do pagamento...', paymentId);

        const response = await fetch(`${API_BASE_URL}/api/pix/get-payment?paymentId=${paymentId}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao buscar dados do pagamento');
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Erro ao buscar dados do pagamento:', error);
        throw error;
    }
};

/**
 * Atualiza o paymentId de uma inscrição no Firestore
 */
export const updateRegistrationPaymentId = async (registrationId: string, paymentId: string) => {
    try {
        console.log('💾 Atualizando paymentId da inscrição...', { registrationId, paymentId });

        const registrationRef = doc(db, 'registrations', registrationId);
        await updateDoc(registrationRef, {
            paymentId,
            updatedAt: new Date(),
        });

        console.log('✅ PaymentId atualizado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao atualizar paymentId:', error);
        throw error;
    }
};

/**
 * Atualiza o status de pagamento de uma inscrição
 */
export const updatePaymentStatus = async (registrationId: string, paymentStatus: 'pending' | 'paid' | 'refunded') => {
    try {
        console.log('💾 Atualizando status de pagamento...', { registrationId, paymentStatus });

        const registrationRef = doc(db, 'registrations', registrationId);
        const updateData: any = {
            paymentStatus,
            updatedAt: new Date(),
        };

        if (paymentStatus === 'paid') {
            updateData.paymentDate = new Date();
        }

        await updateDoc(registrationRef, updateData);

        console.log('✅ Status de pagamento atualizado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao atualizar status de pagamento:', error);
        throw error;
    }
};

/**
 * Busca dados de uma inscrição
 */
export const getRegistrationData = async (registrationId: string) => {
    try {
        const registrationRef = doc(db, 'registrations', registrationId);
        const registrationDoc = await getDoc(registrationRef);

        if (!registrationDoc.exists()) {
            throw new Error('Inscrição não encontrada');
        }

        return {
            id: registrationDoc.id,
            ...registrationDoc.data(),
        };
    } catch (error) {
        console.error('❌ Erro ao buscar dados da inscrição:', error);
        throw error;
    }
};

/**
 * Processa o pagamento completo para uma inscrição
 */
export const processRegistrationPayment = async (
    registrationId: string,
    eventData: any,
    userData: any
): Promise<PaymentData> => {
    try {
        console.log('🚀 Iniciando processamento de pagamento para inscrição:', registrationId);

        // Buscar dados da inscrição
        const registrationData = await getRegistrationData(registrationId);

        // Verificar se já existe um pagamento
        if (registrationData.paymentId) {
            console.log('💳 Pagamento já existe, buscando dados...');
            
            try {
                // Verificar status do pagamento existente
                const statusData = await checkPaymentStatus(registrationData.paymentId, registrationId);
                
                // Buscar dados completos do PIX
                const pixData = await getPaymentData(registrationData.paymentId);
                
                return {
                    registrationId,
                    eventId: eventData.id,
                    amount: eventData.price || 0,
                    description: `Inscrição: ${eventData.title}`,
                    qrCode: pixData.qr_code,
                    qrCodeBase64: pixData.qr_code_base64,
                    ticketUrl: pixData.ticket_url,
                    paymentId: pixData.id,
                    externalReference: pixData.external_reference,
                };
            } catch (error) {
                console.log('⚠️ Erro ao buscar pagamento existente, criando novo...');
            }
        }

        // Criar novo pagamento
        const paymentRequest: PaymentRequest = {
            transaction_amount: eventData.price || 0,
            description: `Inscrição: ${eventData.title} - ${userData.name}`,
            payment_method_id: 'pix',
            payer: {
                email: userData.email || 'usuario@igreja.com',
                first_name: userData.name.split(' ')[0],
                last_name: userData.name.split(' ').slice(1).join(' ') || '',
            },
            metadata: {
                registrationId,
                eventId: eventData.id,
                eventName: eventData.title,
                userId: userData.uid,
                userName: userData.name,
            },
        };

        const paymentData = await createPixPayment(paymentRequest);

        // Atualizar inscrição com o paymentId
        await updateRegistrationPaymentId(registrationId, paymentData.paymentId!);

        console.log('✅ Pagamento processado com sucesso');
        return paymentData;

    } catch (error) {
        console.error('❌ Erro no processamento de pagamento:', error);
        throw error;
    }
};