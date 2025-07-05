import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DataContext } from "../context/DataContext";

export default function DeckScreen({ navigation }) {
  const { decks, updateDecks, studySessions } = React.useContext(DataContext);
  const [isAddingDeck, setIsAddingDeck] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState("");

  const createDeck = () => {
    if (!newDeckTitle.trim()) {
      Alert.alert("Error", "Please enter a deck title");
      return;
    }

    const newDeck = {
      id: Date.now().toString(),
      title: newDeckTitle.trim(),
      cards: [],
      createdAt: new Date().toISOString(),
    };

    const updatedDecks = [...decks, newDeck];
    updateDecks(updatedDecks);
    setNewDeckTitle("");
    setIsAddingDeck(false);
  };

  const deleteDeck = (deckId) => {
    Alert.alert(
      "Delete Deck",
      "Are you sure you want to delete this deck? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updatedDecks = decks.filter((deck) => deck.id !== deckId);
            updateDecks(updatedDecks);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Arabic Flashcards</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsAddingDeck(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {isAddingDeck && (
        <View style={styles.addDeckContainer}>
          <TextInput
            style={styles.input}
            value={newDeckTitle}
            onChangeText={setNewDeckTitle}
            placeholder="Enter deck title"
            placeholderTextColor="#666"
            autoFocus
          />
          <View style={styles.addDeckButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setIsAddingDeck(false);
                setNewDeckTitle("");
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.createButton]}
              onPress={createDeck}
            >
              <Text style={styles.buttonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={styles.content}>
        {decks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              You don't have any decks yet.
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Tap the + button to create your first deck!
            </Text>
          </View>
        ) : (
          decks.map((deck) => {
            const hasActiveSession =
              studySessions[deck.id]?.cardsToReview?.length > 0;

            return (
              <View key={deck.id} style={styles.deckCard}>
                <TouchableOpacity
                  style={styles.deckContent}
                  onPress={() =>
                    navigation.navigate("Flashcards", { deckId: deck.id })
                  }
                >
                  <View style={styles.deckInfo}>
                    <View style={styles.deckTitleContainer}>
                      <Text style={styles.deckTitle}>{deck.title}</Text>
                      {hasActiveSession && (
                        <View style={styles.studyBadge}>
                          <Text style={styles.studyBadgeText}>
                            Study in Progress
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardCount}>
                      {deck.cards.length}{" "}
                      {deck.cards.length === 1 ? "card" : "cards"}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => deleteDeck(deck.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  addDeckContainer: {
    padding: 16,
    backgroundColor: "#2a2a2a",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  input: {
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 16,
    marginBottom: 12,
  },
  addDeckButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: "#666",
  },
  createButton: {
    backgroundColor: "#4CAF50",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  deckCard: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  deckInfo: {
    flex: 1,
  },
  deckTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  cardCount: {
    fontSize: 14,
    color: "#999",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  deckTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  studyBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  studyBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  deckContent: {
    flex: 1,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
});
