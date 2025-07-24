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

function AddCardScreen({ route, navigation }) {
  const { deckId } = route.params;
  const { decks, updateDecks } = React.useContext(DataContext);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [example, setExample] = useState("");
  const [pronunciation, setPronunciation] = useState("");

  // Find the current deck
  const deckIndex = decks.findIndex((d) => d.id === deckId);
  const deck = decks[deckIndex];

  const getInputLabel = (isArabic) => {
    if (isArabic) {
      return "Front (Arabic)";
    }
    return "Back (English)";
  };

  const handleSave = () => {
    if (!front.trim() || !back.trim()) {
      Alert.alert("Error", "Please fill in both Arabic and English text");
      return;
    }

    const newCard = {
      id: Date.now().toString(),
      front: front,
      back: back,
      example: example.trim(),
      pronunciation: pronunciation.trim(),
      cardIndex: 0,
      reviewedIndex: false,
      reviewedAt: null,
      masteredIndex: false,
      masteredAt: null,
      timesMastered: 0,
      createdAt: new Date().toISOString(),
    };

    console.log(
      `[AddCard] Created new card: ${newCard.front} | cardIndex: ${newCard.cardIndex} | reviewedIndex: ${newCard.reviewedIndex} | reviewedAt: ${newCard.reviewedAt} | masteredIndex: ${newCard.masteredIndex} | masteredAt: ${newCard.masteredAt} | timesMastered: ${newCard.timesMastered}`
    );

    const updatedDeck = { ...deck };
    updatedDeck.cards = [...deck.cards, newCard];

    const updatedDecks = decks.map((d) => (d.id === deckId ? updatedDeck : d));

    updateDecks(updatedDecks);
    Alert.alert("Success", "Card added successfully!");
    setFront("");
    setBack("");
    setExample("");
    setPronunciation("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView style={addCardStyles.container}>
          <View style={addCardStyles.header}>
            <TouchableOpacity
              style={addCardStyles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={addCardStyles.headerTitle}>Add New Card</Text>
            <TouchableOpacity
              style={[addCardStyles.actionButton, addCardStyles.saveButton]}
              onPress={handleSave}
            >
              <Text style={addCardStyles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={addCardStyles.content}>
            <View style={addCardStyles.inputContainer}>
              <Text style={addCardStyles.label}>{getInputLabel(true)}</Text>
              <TextInput
                style={[
                  addCardStyles.input,
                  {
                    textAlign: "right",
                    writingDirection: "rtl",
                    fontFamily: Platform.OS === "ios" ? "Arial" : "sans-serif",
                    fontSize: 20,
                  },
                ]}
                value={front}
                onChangeText={setFront}
                placeholder="Write Arabic text here..."
                placeholderTextColor="#666"
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={[addCardStyles.label, { marginTop: 15 }]}>
                {getInputLabel(false)}
              </Text>
              <TextInput
                style={[
                  addCardStyles.input,
                  {
                    textAlign: "left",
                    writingDirection: "ltr",
                  },
                ]}
                value={back}
                onChangeText={setBack}
                placeholder="Enter English translation..."
                placeholderTextColor="#666"
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={[addCardStyles.label, { marginTop: 15 }]}>
                Pronunciation (Optional)
              </Text>
              <TextInput
                style={addCardStyles.input}
                value={pronunciation}
                onChangeText={setPronunciation}
                placeholder="Enter pronunciation..."
                placeholderTextColor="#666"
                multiline={true}
                numberOfLines={2}
                textAlignVertical="top"
              />

              <Text style={[addCardStyles.label, { marginTop: 15 }]}>
                Example (Optional)
              </Text>
              <TextInput
                style={addCardStyles.input}
                value={example}
                onChangeText={setExample}
                placeholder="Enter an example sentence..."
                placeholderTextColor="#666"
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const addCardStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
  },
  backButton: {
    padding: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    padding: 16,
    color: "#fff",
    fontSize: 16,
    minHeight: 100,
  },
});

export default AddCardScreen;
