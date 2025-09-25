// src/components/Navigation.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../contexts/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import EventsScreen from "../screens/EventsScreen";
import EventDetailsScreen from "../screens/EventDetailsScreen";
import MyRegistrationsScreen from "../screens/MyRegistrationsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ProfileStack from "../screens/ProfileStackScreen";

// Definindo os tipos de parâmetros para as rotas dos stacks
export type EventsStackParamList = {
    EventsList: undefined;
    EventDetails: { eventId: string };
};

export type MyRegistrationsStackParamList = {
    MyRegistrationsList: undefined;
    EventDetails: { eventId: string };
};

// Tipo para o stack principal da aplicação
export type RootStackParamList = {
    Main: undefined;
    Login: undefined;
};

const Stack = createStackNavigator<EventsStackParamList>();
const MyRegistrationsStackNavigator = createStackNavigator<MyRegistrationsStackParamList>();
const RootStack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Função para retornar o ícone apropriado para cada tab
const getTabIcon = (routeName: string, focused: boolean) => {
    let iconName: keyof typeof Ionicons.glyphMap;
    
    if (routeName === "Events") {
        iconName = focused ? "calendar" : "calendar-outline";
    } else if (routeName === "MyRegistrations") {
        iconName = focused ? "list" : "list-outline";
    } else if (routeName === "Profile") {
        iconName = focused ? "person" : "person-outline";
    } else {
        iconName = "help-outline";
    }
    
    return iconName;
};

function EventsStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="EventsList"
                component={EventsScreen}
                options={{ title: "Eventos" }}
            />
            <Stack.Screen
                name="EventDetails"
                component={EventDetailsScreen}
                options={{ title: "Detalhes do Evento" }}
            />
        </Stack.Navigator>
    );
}

function MyRegistrationsStack() {
    return (
        <MyRegistrationsStackNavigator.Navigator>
            <MyRegistrationsStackNavigator.Screen
                name="MyRegistrationsList"
                component={MyRegistrationsScreen}
                options={{ title: "Minhas Inscrições" }}
            />
            <MyRegistrationsStackNavigator.Screen
                name="EventDetails"
                component={EventDetailsScreen}
                options={{ title: "Detalhes do Evento" }}
            />
        </MyRegistrationsStackNavigator.Navigator>
    );
}

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    const iconName = getTabIcon(route.name, focused);
                    return <Ionicons name={iconName} size={size || 24} color={color} />;
                },
                tabBarActiveTintColor: "#007AFF",
                tabBarInactiveTintColor: "#8E8E93",
                tabBarStyle: {
                    backgroundColor: "#FFFFFF",
                    borderTopWidth: 1,
                    borderTopColor: "#E5E5EA",
                    paddingBottom: 5,
                    paddingTop: 5,
                    height: 60,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: "500",
                },
                headerShown: false,
            })}
        >
            <Tab.Screen
                name="Events"
                component={EventsStack}
                options={{ 
                    tabBarLabel: "Eventos",
                    tabBarBadge: undefined, // Pode ser usado para mostrar notificações
                }}
            />
            <Tab.Screen
                name="MyRegistrations"
                component={MyRegistrationsStack}
                options={{ 
                    tabBarLabel: "Inscrições",
                    tabBarBadge: undefined, // Pode ser usado para mostrar número de inscrições
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileStack}
                options={{ 
                    tabBarLabel: "Perfil",
                }}
            />
        </Tab.Navigator>
    );
}

export default function Navigation() {
    const { currentUser, loading } = useAuth();

    if (loading) {
        return null; // Ou um componente de loading
    }

    return (
        <NavigationContainer>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
                {currentUser ? (
                    <RootStack.Screen name="Main" component={MainTabs} />
                ) : (
                    <RootStack.Screen name="Login" component={LoginScreen} />
                )}
            </RootStack.Navigator>
        </NavigationContainer>
    );
}
