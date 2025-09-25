// src/lib/firebase/churches.ts
import { 
    doc, 
    getDoc, 
    updateDoc, 
    collection, 
    getDocs, 
    query, 
    where,
    orderBy,
    Timestamp 
} from "firebase/firestore";
import { db } from "./config";
import { Church, User } from "../../types";

/**
 * Busca todas as igrejas ordenadas por nome
 */
export const getAllChurches = async (): Promise<Church[]> => {
    try {
        const churchesCollection = collection(db, "churches");
        const q = query(churchesCollection, orderBy("name"));
        const churchesSnapshot = await getDocs(q);
        
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
        console.error("Erro ao buscar todas as igrejas:", error);
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
        console.error("Erro ao buscar igreja por ID:", error);
        throw error;
    }
};

/**
 * Busca igrejas por região
 */
export const getChurchesByRegion = async (region: string): Promise<Church[]> => {
    try {
        const churchesCollection = collection(db, "churches");
        const q = query(
            churchesCollection, 
            where("region", "==", region),
            orderBy("name")
        );
        const churchesSnapshot = await getDocs(q);
        
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
        console.error("Erro ao buscar igrejas por região:", error);
        throw error;
    }
};

/**
 * Vincula um pastor a uma igreja
 */
export const linkPastorToChurch = async (
    churchId: string, 
    pastorId: string, 
    pastorName: string
): Promise<void> => {
    try {
        const churchRef = doc(db, "churches", churchId);
        
        await updateDoc(churchRef, {
            pastorId,
            pastorName,
            updatedAt: Timestamp.now(),
        });
    } catch (error) {
        console.error("Erro ao vincular pastor à igreja:", error);
        throw error;
    }
};

/**
 * Remove o vínculo de pastor de uma igreja
 */
export const unlinkPastorFromChurch = async (churchId: string): Promise<void> => {
    try {
        const churchRef = doc(db, "churches", churchId);
        
        await updateDoc(churchRef, {
            pastorId: null,
            pastorName: null,
            updatedAt: Timestamp.now(),
        });
    } catch (error) {
        console.error("Erro ao desvincular pastor da igreja:", error);
        throw error;
    }
};

/**
 * Busca o pastor de uma igreja específica
 */
export const getChurchPastor = async (churchId: string): Promise<User | null> => {
    try {
        const church = await getChurchById(churchId);
        
        if (!church || !church.pastorId) {
            return null;
        }
        
        const pastorDoc = await getDoc(doc(db, "users", church.pastorId));
        
        if (pastorDoc.exists()) {
            const data = pastorDoc.data();
            return {
                id: pastorDoc.id,
                uid: data.uid,
                name: data.name || "",
                email: data.email || "",
                phone: data.phone || "",
                cpf: data.cpf || "",
                churchId: data.churchId || "",
                role: data.role || "pastor",
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
                churchName: data.churchName || "",
            } as User;
        }
        
        return null;
    } catch (error) {
        console.error("Erro ao buscar pastor da igreja:", error);
        throw error;
    }
};

/**
 * Busca todas as regiões disponíveis
 */
export const getAllRegions = async (): Promise<string[]> => {
    try {
        const churchesCollection = collection(db, "churches");
        const churchesSnapshot = await getDocs(churchesCollection);
        
        const regions = new Set<string>();
        
        churchesSnapshot.docs.forEach(doc => {
            const region = doc.data().region;
            if (region) {
                regions.add(region);
            }
        });
        
        return Array.from(regions).sort();
    } catch (error) {
        console.error("Erro ao buscar regiões:", error);
        throw error;
    }
};