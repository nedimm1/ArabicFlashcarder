import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { loadData, saveData, clearStorage } from "../utils/storage";

export const DataContext = React.createContext();

export const DataProvider = ({ children }) => {
  const [decks, setDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studySessions, setStudySessions] = useState({});

  // Function to check and reset expired cards globally
  const checkAndResetExpiredCards = (decks) => {
    if (!decks || !Array.isArray(decks)) return decks;

    const now = new Date();
    const twoMinutesInMs = 2 * 60 * 1000; // 2 minutes in milliseconds

    let hasChanges = false;
    const updatedDecks = decks.map((deck) => {
      const updatedCards = deck.cards.map((card) => {
        let updatedCard = { ...card };

        // Check for mastered cards that need reset (dynamic timeout based on timesMastered)
        if (card.masteredIndex && card.masteredAt) {
          const masteredTime = new Date(card.masteredAt);
          const timeDiff = now.getTime() - masteredTime.getTime();

          // Calculate dynamic timeout: 5 minutes * 2^timesMastered
          const baseTimeout = 5 * 60 * 1000; // 5 minutes in milliseconds
          const dynamicTimeout =
            baseTimeout * Math.pow(2, card.timesMastered || 0);

          if (timeDiff >= dynamicTimeout) {
            console.log(
              `[DataContext] Resetting expired mastered card: ${
                card.front
              } after ${Math.round(
                timeDiff / 1000 / 60
              )} minutes (timeout was ${Math.round(
                dynamicTimeout / 1000 / 60
              )} minutes, timesMastered: ${card.timesMastered || 0})`
            );
            hasChanges = true;
            updatedCard = {
              ...updatedCard,
              cardIndex: 4,
              reviewedIndex: false,
              reviewedAt: null,
              masteredIndex: false,
              masteredAt: null,
            };
          }
        }

        // Check for reviewed cards that need reset (2 minutes) - only if not mastered
        if (card.reviewedIndex && card.reviewedAt && !card.masteredIndex) {
          const reviewedTime = new Date(card.reviewedAt);
          const timeDiff = now.getTime() - reviewedTime.getTime();

          if (timeDiff >= twoMinutesInMs) {
            console.log(
              `[DataContext] Resetting expired reviewed card: ${
                card.front
              } after ${Math.round(timeDiff / 1000 / 60)} minutes`
            );
            hasChanges = true;
            updatedCard = {
              ...updatedCard,
              cardIndex: 4,
              reviewedIndex: false,
              reviewedAt: null,
            };
          }
        }

        return updatedCard;
      });

      return {
        ...deck,
        cards: updatedCards,
      };
    });

    if (hasChanges) {
      console.log(`[DataContext] Reset expired cards globally`);
    }

    return updatedDecks;
  };

  const migrateCards = (decks) => {
    if (!decks || !Array.isArray(decks)) return decks;

    console.log(`[DataContext] Starting card migration...`);
    let migrationCount = 0;

    const migratedDecks = decks.map((deck) => {
      const migratedCards = deck.cards.map((card) => {
        let migratedCard = { ...card };

        // Add cardIndex if missing
        if (migratedCard.cardIndex === undefined) {
          migratedCard.cardIndex = 0;
          migrationCount++;
        }

        // Add reviewedIndex if missing
        if (migratedCard.reviewedIndex === undefined) {
          migratedCard.reviewedIndex = false;
          migrationCount++;
        }

        // Add reviewedAt if missing
        if (migratedCard.reviewedAt === undefined) {
          migratedCard.reviewedAt = null;
          migrationCount++;
        }

        // Add masteredIndex if missing
        if (migratedCard.masteredIndex === undefined) {
          migratedCard.masteredIndex = false;
          migrationCount++;
        }

        // Add masteredAt if missing
        if (migratedCard.masteredAt === undefined) {
          migratedCard.masteredAt = null;
          migrationCount++;
        }

        // Add timesMastered if missing
        if (migratedCard.timesMastered === undefined) {
          migratedCard.timesMastered = 0;
          migrationCount++;
        }

        return migratedCard;
      });

      return {
        ...deck,
        cards: migratedCards,
      };
    });

    console.log(
      `[DataContext] Migration complete. Updated ${migrationCount} cards`
    );
    return migratedDecks;
  };

  const fetchData = async () => {
    try {
      // Load existing data from storage
      const savedDecks = await loadData("flashcards_data");
      const savedSessions = await loadData("studySessions");

      // Migrate existing cards to include cardIndex
      const migratedDecks = migrateCards(savedDecks);

      // Check and reset expired cards globally
      const updatedDecks = checkAndResetExpiredCards(migratedDecks);

      // Save migrated data if there were changes
      if (JSON.stringify(updatedDecks) !== JSON.stringify(migratedDecks)) {
        await saveData(updatedDecks, "flashcards_data");
      }

      setDecks(updatedDecks);
      setStudySessions(savedSessions);
    } catch (error) {
      console.error("Error loading data:", error);
      setDecks([]);
      setStudySessions({});
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on app start
  useEffect(() => {
    fetchData();
  }, []);

  // Save data whenever decks change
  const updateDecks = async (newDecks) => {
    // Check for expired cards before saving
    const now = new Date();
    const twoMinutesInMs = 2 * 60 * 1000;

    let hasChanges = false;
    const updatedDecks = newDecks.map((deck) => {
      const updatedCards = deck.cards.map((card) => {
        let updatedCard = { ...card };

        // Check for mastered cards that need reset (dynamic timeout based on timesMastered)
        if (card.masteredIndex && card.masteredAt) {
          const masteredTime = new Date(card.masteredAt);
          const timeDiff = now.getTime() - masteredTime.getTime();

          // Calculate dynamic timeout: 5 minutes * 2^timesMastered
          const baseTimeout = 5 * 60 * 1000; // 5 minutes in milliseconds
          const dynamicTimeout =
            baseTimeout * Math.pow(2, card.timesMastered || 0);

          if (timeDiff >= dynamicTimeout) {
            console.log(
              `[updateDecks] Resetting expired mastered card: ${
                card.front
              } after ${Math.round(
                timeDiff / 1000 / 60
              )} minutes (timeout was ${Math.round(
                dynamicTimeout / 1000 / 60
              )} minutes, timesMastered: ${card.timesMastered || 0})`
            );
            hasChanges = true;
            updatedCard = {
              ...updatedCard,
              cardIndex: 4,
              reviewedIndex: false,
              reviewedAt: null,
              masteredIndex: false,
              masteredAt: null,
            };
          }
        }

        // Check for reviewed cards that need reset (2 minutes) - only if not mastered
        if (card.reviewedIndex && card.reviewedAt && !card.masteredIndex) {
          const reviewedTime = new Date(card.reviewedAt);
          const timeDiff = now.getTime() - reviewedTime.getTime();

          if (timeDiff >= twoMinutesInMs) {
            console.log(
              `[updateDecks] Resetting expired reviewed card: ${
                card.front
              } after ${Math.round(timeDiff / 1000 / 60)} minutes`
            );
            hasChanges = true;
            updatedCard = {
              ...updatedCard,
              cardIndex: 4,
              reviewedIndex: false,
              reviewedAt: null,
            };
          }
        }

        return updatedCard;
      });

      return {
        ...deck,
        cards: updatedCards,
      };
    });

    const finalDecks = hasChanges ? updatedDecks : newDecks;
    setDecks(finalDecks || []);
    await saveData(finalDecks || [], "flashcards_data");
  };

  // Save and update study session
  const updateStudySession = async (deckId, sessionData) => {
    if (!sessionData) {
      const newSessions = { ...studySessions };
      delete newSessions[deckId];
      setStudySessions(newSessions);
      await saveData(newSessions, "studySessions");
    } else {
      const newSessions = {
        ...studySessions,
        [deckId]: sessionData,
      };
      setStudySessions(newSessions);
      await saveData(newSessions, "studySessions");
    }
  };

  // Clear study session
  const clearStudySession = (deckId) => {
    updateStudySession(deckId, null);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1a1a1a", padding: 20 }}>
        <Text style={{ color: "#fff" }}>Loading...</Text>
      </View>
    );
  }

  return (
    <DataContext.Provider
      value={{
        decks,
        updateDecks,
        studySessions,
        updateStudySession,
        clearStudySession,
        fetchData, // Add fetchData to the context value
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
