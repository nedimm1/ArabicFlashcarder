import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../styles/styles";
import { DataContext } from "../context/DataContext";

function EditCardScreen({ route, navigation }) {
  const { deckId, cardIndex } = route.params;
  const { decks, updateDecks } = React.useContext(DataContext);

  // Find the current deck and card
  const deck = decks.find((d) => d.id === deckId);
  const card = deck.cards[cardIndex];

  // Always show Arabic on front, English on back
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [example, setExample] = useState(card.example || "");
  const [pronunciation, setPronunciation] = useState(card.pronunciation || "");

  const saveChanges = () => {
    if (front.trim() && back.trim()) {
      // Create a copy of the current deck
      const updatedDeck = { ...deck };

      // Update the card, always keeping Arabic on front, English on back
      updatedDeck.cards[cardIndex] = {
        ...card,
        front: front,
        back: back,
        example: example.trim() || null,
        pronunciation: pronunciation.trim() || null,
      };

      // Update the decks array
      const updatedDecks = decks.map((d) =>
        d.id === deckId ? updatedDeck : d
      );

      // Update the global state
      updateDecks(updatedDecks);

      // Show success message and navigate back
      Alert.alert("Success", "Card updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert("Error", "Please fill in both sides of the card");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#1a1a1a" }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={editCardStyles.scrollContent}
        >
          <View style={styles.headerWithBack}>
            <TouchableOpacity
              style={styles.backArrow}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerText}>Edit Card</Text>
              <Text style={styles.subHeaderText}>in {deck.title}</Text>
            </View>
          </View>

          <View style={editCardStyles.content}>
            <Text style={editCardStyles.label}>Front ({deck.displayName})</Text>
            <TextInput
              style={editCardStyles.input}
              value={front}
              onChangeText={setFront}
              placeholder={`Enter front text (${deck.displayName})`}
              placeholderTextColor="#666"
              multiline={true}
              numberOfLines={4}
            />

            <Text style={[editCardStyles.label, { marginTop: 15 }]}>
              Back (English)
            </Text>
            <TextInput
              style={editCardStyles.input}
              value={back}
              onChangeText={setBack}
              placeholder={`Enter back text (English)`}
              placeholderTextColor="#666"
              multiline={true}
              numberOfLines={4}
            />

            <Text style={[editCardStyles.label, { marginTop: 15 }]}>
              Pronunciation (Optional)
            </Text>
            <TextInput
              style={editCardStyles.input}
              value={pronunciation}
              onChangeText={setPronunciation}
              placeholder="Enter pronunciation"
              placeholderTextColor="#666"
              multiline={true}
              numberOfLines={2}
            />

            <Text style={[editCardStyles.label, { marginTop: 15 }]}>
              Example (Optional)
            </Text>
            <TextInput
              style={editCardStyles.input}
              value={example}
              onChangeText={setExample}
              placeholder="Enter an example sentence (optional)"
              placeholderTextColor="#666"
              multiline={true}
              numberOfLines={4}
            />

            <TouchableOpacity
              style={editCardStyles.saveButton}
              onPress={saveChanges}
            >
              <Text style={editCardStyles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const editCardStyles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 20,
  },
  label: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    padding: 15,
    color: "#fff",
    fontSize: 16,
    height: 100,
    textAlignVertical: "top",
    marginBottom: 15,
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    marginTop: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default EditCardScreen;
