// src/lib/validation/userValidation.ts

/**
 * Valida se todos os dados obrigatórios do usuário estão preenchidos
 * @param userData - Dados do usuário a serem validados
 * @returns {boolean} - True se todos os dados estão completos
 */
export const isUserDataComplete = (userData: {
    name?: string;
    email?: string;
    cpf?: string;
    phone?: string;
    churchId?: string;
}): boolean => {
    return !!(
        userData.name?.trim() &&
        userData.email?.trim() &&
        userData.cpf?.trim() &&
        userData.phone?.trim() &&
        userData.churchId?.trim()
    );
};

/**
 * Valida se um CPF é válido
 * @param cpf - CPF a ser validado (com ou sem formatação)
 * @returns {boolean} - True se o CPF é válido
 */
export const isValidCpf = (cpf: string): boolean => {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cleanCpf)) return false;
    
    // Validação dos dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCpf.charAt(10))) return false;
    
    return true;
};

/**
 * Valida se um telefone tem o formato correto
 * @param phone - Telefone a ser validado (com ou sem formatação)
 * @returns {boolean} - True se o telefone é válido
 */
export const isValidPhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
};

/**
 * Valida se um email tem formato válido
 * @param email - Email a ser validado
 * @returns {boolean} - True se o email é válido
 */
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Formata CPF para exibição (000.000.000-00)
 * @param cpf - CPF a ser formatado
 * @returns {string} - CPF formatado
 */
export const formatCpf = (cpf: string): string => {
    const cleanCpf = cpf.replace(/\D/g, '');
    return cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Formata telefone para exibição
 * @param phone - Telefone a ser formatado
 * @returns {string} - Telefone formatado
 */
export const formatPhone = (phone: string): string => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 11) {
        return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleanPhone.length === 10) {
        return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
};

/**
 * Retorna uma lista de campos faltantes nos dados do usuário
 * @param userData - Dados do usuário a serem verificados
 * @returns {string[]} - Array com nomes dos campos faltantes
 */
export const getMissingFields = (userData: {
    name?: string;
    email?: string;
    cpf?: string;
    phone?: string;
    churchId?: string;
}): string[] => {
    const missing: string[] = [];
    
    if (!userData.name?.trim()) missing.push('Nome');
    if (!userData.email?.trim()) missing.push('Email');
    if (!userData.cpf?.trim()) missing.push('CPF');
    if (!userData.phone?.trim()) missing.push('Telefone');
    if (!userData.churchId?.trim()) missing.push('Igreja');
    
    return missing;
};

/**
 * Valida todos os dados do usuário e retorna erros específicos
 * @param userData - Dados do usuário a serem validados
 * @returns {string[]} - Array com mensagens de erro, vazio se tudo estiver válido
 */
export const validateUserData = (userData: {
    name?: string;
    email?: string;
    cpf?: string;
    phone?: string;
    churchId?: string;
}): string[] => {
    const errors: string[] = [];
    
    // Verificar campos obrigatórios
    const missingFields = getMissingFields(userData);
    if (missingFields.length > 0) {
        errors.push(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
    }
    
    // Validar formato do email
    if (userData.email && !isValidEmail(userData.email)) {
        errors.push('Email inválido');
    }
    
    // Validar CPF
    if (userData.cpf && !isValidCpf(userData.cpf)) {
        errors.push('CPF inválido');
    }
    
    // Validar telefone
    if (userData.phone && !isValidPhone(userData.phone)) {
        errors.push('Telefone inválido');
    }
    
    return errors;
};