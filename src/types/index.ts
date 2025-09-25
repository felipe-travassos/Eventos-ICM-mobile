// src/types/index.ts
import { User as FirebaseUser } from "firebase/auth";

export interface Event {
    id: string;
    title: string;
    description: string;
    date: Date;
    endDate?: Date;
    location: string;
    maxParticipants: number;
    currentParticipants: number;
    price: number;
    churchId: string;
    churchName: string;
    status: "active" | "canceled" | "completed" | "ended";
    createdAt: Date;
    updatedAt: Date;
    imageURL?: string;
    createdBy?: string;
}

export interface EventRegistration {
    id: string;
    eventId: string;
    userId: string;
    userType: "user" | "senior";
    seniorId?: string;
    userName: string;
    userEmail: string;
    userPhone: string;
    userChurch: string;
    churchName: string;
    userCpf: string;
    pastorName: string;
    status: "pending" | "approved" | "rejected" | "confirmed" | "cancelled";
    paymentStatus: "pending" | "paid" | "refunded";
    paymentDate?: Date;
    registeredBy: string;
    registeredByName: string;
    registrationType: "self" | "secretary";
    paymentId: string;
    approvedBy?: string;
    approvedAt?: Date;
    rejectionReason?: string;
    rejectedBy?: string;
    checkedIn?: boolean;
    checkedInAt?: Date;
    checkedInBy?: string;
    checkedInByName?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface User {
    id: string;
    uid: string;
    churchId: string;
    cpf: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
    churchName?: string;
}

export interface Church {
    id: string;
    name: string;
    address: string;
    region: string;
    pastorId: string | null;
    pastorName: string | null;
    createdAt: Date;
    updatedAt?: Date;
}

export type UserRole = "membro" | "secretario_local" | "pastor" | "secretario_regional";

export interface AuthContextType {
    currentUser: FirebaseUser | null;
    userData: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}

export interface PaymentData {
    registrationId: string;
    eventId: string;
    amount: number;
    description: string;
    qrCode?: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
    paymentId?: string;
}

export interface FirebaseTimestamp {
    seconds: number;
    nanoseconds: number;
    toDate: () => Date;
}

export type MaybeFirebaseDate = Date | string | FirebaseTimestamp | null | undefined;
