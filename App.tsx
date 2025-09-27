// App.tsx
import React from "react";
import { StatusBar } from "expo-status-bar";
import Toast from 'react-native-toast-message';
import { AuthProvider } from "./src/contexts/AuthContext";
import Navigation from "./src/components/Navigation";

export default function App() {
    return (
        <AuthProvider>
            <Navigation />
            <StatusBar style="auto" />
            <Toast />
        </AuthProvider>
    );
}
