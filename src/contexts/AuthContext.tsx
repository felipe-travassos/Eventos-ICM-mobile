// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import {
    User as FirebaseUser,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase/config";
import { User, UserRole } from "../types";
import { getChurchById } from "../lib/firebase/users";

interface AuthContextType {
    currentUser: FirebaseUser | null;
    userData: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updateUserData: (newData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [userData, setUserData] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        
                        // Buscar o nome da igreja se o usuário tiver churchId
                        let churchName = data.churchName || "";
                        if (data.churchId && !churchName) {
                            try {
                                const church = await getChurchById(data.churchId);
                                churchName = church?.name || "";
                            } catch (error) {
                                console.error("Erro ao buscar igreja:", error);
                            }
                        }
                        
                        setUserData({
                            id: userDoc.id,
                            uid: user.uid,
                            ...data,
                            churchName,
                            createdAt: data.createdAt?.toDate() || new Date(),
                            updatedAt: data.updatedAt?.toDate() || new Date(),
                        } as User);
                    }
                } catch (error) {
                    console.error("Erro ao buscar dados do usuário:", error);
                }
            } else {
                setUserData(null);
            }
            
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const login = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Erro no login:", error);
            throw error;
        }
    };

    const register = async (email: string, password: string, name: string, cpf?: string, phone?: string, churchId?: string) => {
        try {
            const { user } = await createUserWithEmailAndPassword(auth, email, password);
            
            const newUser: Omit<User, "id"> = {
                uid: user.uid,
                name,
                email,
                phone: phone || "",
                cpf: cpf || "",
                churchId: churchId || "",
                role: "membro" as UserRole,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await setDoc(doc(db, "users", user.uid), newUser);
        } catch (error) {
            console.error("Erro no registro:", error);
            throw error;
        }
    };

    const updateUserData = (newData: Partial<User>) => {
        if (userData) {
            setUserData({ ...userData, ...newData });
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setCurrentUser(null);
            setUserData(null);
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
        }
    };

    const resetPassword = async (email: string) => {
        try {
            if (!email || !email.includes("@")) {
                throw new Error("Por favor, insira um email válido");
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error("Formato de email inválido");
            }

            await sendPasswordResetEmail(auth, email);
        } catch (error: any) {
            console.error("Erro no resetPassword:", error);
            
            let errorMessage = "Erro ao enviar email de redefinição";

            switch (error.code) {
                case "auth/invalid-email":
                    errorMessage = "Email inválido";
                    break;
                case "auth/user-not-found":
                    errorMessage = "Nenhuma conta encontrada com este email";
                    break;
                case "auth/too-many-requests":
                    errorMessage = "Muitas tentativas. Tente novamente mais tarde";
                    break;
                case "auth/network-request-failed":
                    errorMessage = "Erro de conexão. Verifique sua internet";
                    break;
                default:
                    errorMessage = error.message || "Erro desconhecido";
            }

            throw new Error(errorMessage);
        }
    };

    const value = {
        currentUser,
        userData,
        loading,
        login,
        register,
        logout,
        resetPassword,
        updateUserData,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
