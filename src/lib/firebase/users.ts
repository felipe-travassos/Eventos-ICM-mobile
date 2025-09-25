// src/lib/firebase/users.ts
import { 
    doc, 
    getDoc, 
    updateDoc, 
    collection, 
    getDocs, 
    query, 
    where,
    Timestamp 
} from "firebase/firestore";
import { db } from "./config";
import { User, Church } from "../../types";

/**
 * Busca os dados completos de um usuário pelo UID
 */
export const getUserData = async (uid: string): Promise<User | null> => {
    try {
        const userDoc = await getDoc(doc(db, "users", uid));
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            return {
                id: userDoc.id,
                uid: data.uid,
                name: data.name || "",
                email: data.email || "",
                phone: data.phone || "",
                cpf: data.cpf || "",
                churchId: data.churchId || "",
                role: data.role || "membro",
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
                churchName: data.churchName || "",
            } as User;
        }
        
        return null;
    } catch (error) {
        console.error("Erro ao buscar dados do usuário:", error);
        throw error;
    }
};

/**
 * Atualiza os dados do perfil do usuário
 */
export const updateProfileData = async (
    uid: string, 
    profileData: Partial<User>
): Promise<void> => {
    try {
        const userRef = doc(db, "users", uid);
        
        // Preparar dados para atualização
        const updateData = {
            ...profileData,
            updatedAt: Timestamp.now(),
        };
        
        // Remover campos que não devem ser atualizados diretamente
        delete updateData.id;
        delete updateData.uid;
        delete updateData.createdAt;
        
        await updateDoc(userRef, updateData);
    } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
        throw error;
    }
};

/**
 * Busca todas as igrejas disponíveis
 */
export const getChurches = async (): Promise<Church[]> => {
    try {
        const churchesCollection = collection(db, "churches");
        const churchesSnapshot = await getDocs(churchesCollection);
        
        return churchesSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || "",
            address: doc.data().address || "",
            region: doc.data().region || "",
            pastorId: doc.data().pastorId || null,
            pastorName: doc.data().pastorName || null,
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as Church[];
    } catch (error) {
        console.error("Erro ao buscar igrejas:", error);
        throw error;
    }
};

/**
 * Busca uma igreja específica pelo ID
 */
export const getChurchById = async (churchId: string): Promise<Church | null> => {
    try {
        if (!churchId) return null;
        
        const churchDoc = await getDoc(doc(db, "churches", churchId));
        
        if (churchDoc.exists()) {
            const data = churchDoc.data();
            return {
                id: churchDoc.id,
                name: data.name || "",
                address: data.address || "",
                region: data.region || "",
                pastorId: data.pastorId || null,
                pastorName: data.pastorName || null,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            } as Church;
        }
        
        return null;
    } catch (error) {
        console.error("Erro ao buscar igreja:", error);
        throw error;
    }
};

/**
 * Busca usuários por tipo (para funcionalidades administrativas)
 */
export const getUsersByRole = async (role: string): Promise<User[]> => {
    try {
        const usersCollection = collection(db, "users");
        const q = query(usersCollection, where("role", "==", role));
        const usersSnapshot = await getDocs(q);
        
        return usersSnapshot.docs.map(doc => ({
            id: doc.id,
            uid: doc.data().uid,
            name: doc.data().name || "",
            email: doc.data().email || "",
            phone: doc.data().phone || "",
            cpf: doc.data().cpf || "",
            churchId: doc.data().churchId || "",
            role: doc.data().role || "membro",
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            churchName: doc.data().churchName || "",
        })) as User[];
    } catch (error) {
        console.error("Erro ao buscar usuários por role:", error);
        throw error;
    }
};

/**
 * Valida se um CPF já está em uso por outro usuário
 */
export const validateCpfUnique = async (cpf: string, currentUid: string): Promise<boolean> => {
    try {
        if (!cpf) return true; // CPF vazio é válido
        
        const usersCollection = collection(db, "users");
        const q = query(usersCollection, where("cpf", "==", cpf));
        const usersSnapshot = await getDocs(q);
        
        // Verifica se existe algum usuário com este CPF que não seja o atual
        const existingUser = usersSnapshot.docs.find(doc => doc.data().uid !== currentUid);
        
        return !existingUser; // Retorna true se não existe outro usuário com este CPF
    } catch (error) {
        console.error("Erro ao validar CPF:", error);
        return false;
    }
};