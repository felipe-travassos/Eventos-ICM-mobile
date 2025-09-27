import { checkPaymentStatus, PaymentStatusResponse } from './payments';

export interface PaymentStatusChecker {
    startChecking: (paymentId: string, registrationId: string, onStatusChange: (status: PaymentStatusResponse) => void) => void;
    stopChecking: () => void;
    checkOnce: (paymentId: string, registrationId: string) => Promise<PaymentStatusResponse>;
}

class PaymentStatusCheckerImpl implements PaymentStatusChecker {
    private intervalId: NodeJS.Timeout | null = null;
    private isChecking = false;

    startChecking(
        paymentId: string, 
        registrationId: string, 
        onStatusChange: (status: PaymentStatusResponse) => void
    ): void {
        if (this.isChecking) {
            console.log('⚠️ Verificação de status já está em andamento');
            return;
        }

        this.isChecking = true;
        console.log('🔄 Iniciando verificação automática de status do pagamento');

        // Primeira verificação imediata
        this.checkOnce(paymentId, registrationId)
            .then(onStatusChange)
            .catch(error => console.error('Erro na primeira verificação:', error));

        // Verificações periódicas a cada 10 segundos
        this.intervalId = setInterval(async () => {
            try {
                const status = await this.checkOnce(paymentId, registrationId);
                onStatusChange(status);

                // Para a verificação se o pagamento foi aprovado, rejeitado ou cancelado
                if (['approved', 'rejected', 'cancelled'].includes(status.status)) {
                    console.log(`✅ Status final recebido: ${status.status}. Parando verificação.`);
                    this.stopChecking();
                }
            } catch (error) {
                console.error('❌ Erro na verificação periódica:', error);
            }
        }, 10000); // 10 segundos
    }

    stopChecking(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isChecking = false;
        console.log('⏹️ Verificação de status interrompida');
    }

    async checkOnce(paymentId: string, registrationId: string): Promise<PaymentStatusResponse> {
        return await checkPaymentStatus(paymentId, registrationId);
    }
}

// Singleton instance
export const paymentStatusChecker = new PaymentStatusCheckerImpl();

// Hook para React Native
export const usePaymentStatusChecker = () => {
    return {
        startChecking: paymentStatusChecker.startChecking.bind(paymentStatusChecker),
        stopChecking: paymentStatusChecker.stopChecking.bind(paymentStatusChecker),
        checkOnce: paymentStatusChecker.checkOnce.bind(paymentStatusChecker),
    };
};