import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Import screens
import DeckScreen from "./src/screens/LanguageDecksScreen";
import FlashcardScreen from "./src/screens/FlashcardScreen";
import AddCardScreen from "./src/screens/AddCardScreen";
import EditCardScreen from "./src/screens/EditCardScreen";

// Import context provider
import { DataProvider } from "./src/context/DataContext";

// Create the stack navigator
const Stack = createNativeStackNavigator();

// Main App Component
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DataProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Decks">
            <Stack.Screen
              name="Decks"
              component={DeckScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Flashcards"
              component={FlashcardScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AddCard"
              component={AddCardScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="EditCard"
              component={EditCardScreen}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
          <StatusBar style="light" />
        </NavigationContainer>
      </DataProvider>
    </GestureHandlerRootView>
  );
}
