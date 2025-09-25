// App.tsx
import React from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/contexts/AuthContext";
import Navigation from "./src/components/Navigation";

export default function App() {
    return (
        <AuthProvider>
            <Navigation />
            <StatusBar style="auto" />
        </AuthProvider>
    );
}
