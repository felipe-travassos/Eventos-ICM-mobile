// src/lib/firebase/userRegistrationValidation.ts
import { User } from '@/types';
import { isUserDataComplete, validateUserData, getMissingFields } from '../validation/userValidation';

/**
 * Verifica se o usuário pode se inscrever em eventos
 * @param user - Dados do usuário
 * @returns {boolean} - True se o usuário pode se inscrever
 */
export const canUserRegisterForEvents = (user: User | null): boolean => {
    if (!user) return false;
    
    return isUserDataComplete({
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        phone: user.phone,
        churchId: user.churchId
    });
};

/**
 * Retorna os campos faltantes nos dados do usuário
 * @param user - Dados do usuário
 * @returns {string[]} - Array com nomes dos campos faltantes
 */
export const getMissingUserFields = (user: User | null): string[] => {
    if (!user) return ['Usuário não encontrado'];
    
    return getMissingFields({
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        phone: user.phone,
        churchId: user.churchId
    });
};

/**
 * Gera mensagem de erro personalizada para inscrição em eventos
 * @param user - Dados do usuário
 * @returns {string} - Mensagem de erro ou string vazia se não há erros
 */
export const getRegistrationErrorMessage = (user: User | null): string => {
    if (!user) {
        return 'Usuário não encontrado. Faça login novamente.';
    }
    
    const errors = validateUserData({
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        phone: user.phone,
        churchId: user.churchId
    });
    
    if (errors.length === 0) return '';
    
    const missingFields = getMissingUserFields(user);
    
    if (missingFields.length > 0) {
        return `Para se inscrever em eventos, você precisa completar seu perfil com os seguintes dados: ${missingFields.join(', ')}. Acesse seu perfil para atualizar essas informações.`;
    }
    
    return `Dados inválidos: ${errors.join(', ')}. Acesse seu perfil para corrigir essas informações.`;
};

/**
 * Hook personalizado para verificar elegibilidade de inscrição
 * @param user - Dados do usuário
 * @returns {object} - Objeto com status de elegibilidade e mensagem de erro
 */
export const useRegistrationEligibility = (user: User | null) => {
    const canRegister = canUserRegisterForEvents(user);
    const errorMessage = canRegister ? '' : getRegistrationErrorMessage(user);
    const missingFields = getMissingUserFields(user);
    
    return {
        canRegister,
        errorMessage,
        missingFields,
        hasErrors: !canRegister
    };
};