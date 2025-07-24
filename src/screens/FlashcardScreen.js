import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Dimensions,
  Alert,
  I18nManager,
  Platform,
  TextInput,
  ScrollView,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  GestureHandlerRootView,
  PanGestureHandler,
  State,
} from "react-native-gesture-handler";
import { useFocusEffect } from "@react-navigation/native";
import { styles } from "../styles/styles";
import { DataContext } from "../context/DataContext";
import { TextInput as RNTextInput } from "react-native"; // ensure TextInput is imported as RNTextInput for prompt

const windowWidth = Dimensions.get("window").width;

function FlashcardScreen({ route, navigation }) {
  const { deckId } = route.params;
  const {
    decks,
    updateDecks,
    studySessions,
    updateStudySession,
    clearStudySession,
  } = React.useContext(DataContext);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [cardsToReview, setCardsToReview] = useState([]);
  const [cardStatuses, setCardStatuses] = useState({});
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isGalleryMode, setIsGalleryMode] = useState(false);
  // 1. Add useState for selectedCardIds and modal visibility at the top of FlashcardScreen
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [showDeckPicker, setShowDeckPicker] = useState(false);
  const [deckToCopyTo, setDeckToCopyTo] = useState(null);
  // 1. Add state for showing the new deck modal and the deck name input
  const [showNewDeckModal, setShowNewDeckModal] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  // Track which cards have had their cardIndex updated in this study session
  const [updatedCardIndexes, setUpdatedCardIndexes] = useState(new Set());

  // Helper function to create a unique key for card tracking
  const getCardTrackingKey = (card) => {
    if (studyMode && card.studyOrientation) {
      return `${card.id}-${card.studyOrientation}`;
    }
    return card.id;
  };

  // Helper function to get just the card ID for cardIndex tracking
  const getCardId = (card) => {
    return card.id;
  };

  // Check and reset mastered cards when component loads or deck changes
  useEffect(() => {
    if (deck && deck.cards) {
      const updatedCards = checkAndResetCards(deck.cards);
      if (updatedCards) {
        console.log(
          `[useEffect] Some mastered cards were reset after 5 minutes`
        );
        const updatedDeck = { ...deck, cards: updatedCards };
        const updatedDecks = decks.map((d) =>
          d.id === deckId ? updatedDeck : d
        );
        updateDecks(updatedDecks);
      }
    }
  }, [deckId, deck]);

  // Function to check and reset mastered cards after 5 minutes and reviewed cards after 2 minutes
  const checkAndResetCards = (deckCards) => {
    const now = new Date();
    const twoMinutesInMs = 2 * 60 * 1000; // 2 minutes in milliseconds

    let hasChanges = false;
    const updatedCards = deckCards.map((card) => {
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
            `[checkAndResetCards] Resetting mastered card: ${
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
            `[checkAndResetCards] Resetting reviewed card: ${
              card.front
            } after ${Math.round(timeDiff / 1000 / 60)} minutes`
          );
          hasChanges = true;
          updatedCard = {
            ...updatedCard,
            cardIndex: 4, // Keep cardIndex at 4
            reviewedIndex: false,
            reviewedAt: null,
          };
        }
      }

      return updatedCard;
    });

    return hasChanges ? updatedCards : null;
  };

  // Effect to manage study session state and card updates
  useFocusEffect(
    React.useCallback(() => {
      const savedSession = studySessions[deckId];
      const currentDeck = decks.find((d) => d.id === deckId);

      if (!currentDeck) return;

      // Handle session restoration - only run once when component mounts or when studySessions changes
      if (
        savedSession &&
        savedSession.cardsToReview?.length > 0 &&
        !studyMode
      ) {
        // Restore the session cards with their studyOrientation preserved
        const sessionCards = savedSession.cardsToReview.map((card) => {
          // Find the original card in the deck to get updated properties
          const originalCard = currentDeck.cards.find((c) => c.id === card.id);
          if (originalCard) {
            return {
              ...originalCard,
              studyOrientation: card.studyOrientation, // Preserve the studyOrientation
            };
          }
          return card;
        });

        // Batch state updates to prevent multiple re-renders
        setStudyMode(true);
        setCardsToReview(sessionCards);
        setCardStatuses(savedSession.cardStatuses || {});
        setCardsReviewed(savedSession.cardsReviewed || 0);
        setCurrentCardIndex(savedSession.currentCardIndex || 0);
      }
      // Handle card updates for existing study session - only when decks change
      else if (studyMode && cardsToReview.length > 0) {
        const updatedCards = cardsToReview.map((card) => {
          const updatedCard = currentDeck.cards.find((c) => c.id === card.id);
          if (updatedCard) {
            return {
              ...updatedCard,
              studyOrientation: card.studyOrientation, // Preserve the studyOrientation
            };
          }
          return card;
        });

        if (JSON.stringify(updatedCards) !== JSON.stringify(cardsToReview)) {
          setCardsToReview(updatedCards);
        }
      }

      // Cleanup: save session if in study mode
      return () => {
        if (studyMode && cardsToReview.length > 0) {
          const currentSession = studySessions[deckId];
          const hasChanges =
            !currentSession ||
            currentSession.currentCardIndex !== currentCardIndex ||
            currentSession.cardsReviewed !== cardsReviewed ||
            JSON.stringify(currentSession.cardsToReview) !==
              JSON.stringify(cardsToReview);

          if (hasChanges) {
            // Save the cards with their studyOrientation preserved
            updateStudySession(deckId, {
              cardsToReview: cardsToReview,
              cardStatuses,
              cardsReviewed,
              currentCardIndex,
            });
          }
        }
      };
    }, [
      deckId,
      decks,
      studySessions,
      studyMode,
      // Removed cardsToReview.length and currentCardIndex from dependencies to prevent infinite loop
    ])
  );

  // Animation values
  const position = new Animated.ValueXY();
  const swipeThreshold = 80;
  const rotateCard = position.x.interpolate({
    inputRange: [-windowWidth / 2, 0, windowWidth / 2],
    outputRange: ["-10deg", "0deg", "10deg"],
    extrapolate: "clamp",
  });

  // Find the current deck
  const deck = decks.find((d) => d.id === deckId);
  let cards = deck ? deck.cards : [];

  const startEditingTitle = () => {
    setEditedTitle(deck.title);
    setIsEditingTitle(true);
  };

  const saveTitleEdit = () => {
    if (!editedTitle.trim()) {
      Alert.alert("Error", "Please enter a deck title");
      return;
    }

    const updatedDecks = decks.map((d) =>
      d.id === deckId ? { ...d, title: editedTitle.trim() } : d
    );

    updateDecks(updatedDecks);
    setIsEditingTitle(false);
  };

  const cancelTitleEdit = () => {
    setIsEditingTitle(false);
    setEditedTitle("");
  };

  // Calculate correct and incorrect counts
  const correctCount = Object.values(cardStatuses).filter(
    (status) => status === "correct"
  ).length;
  const incorrectCount = Object.values(cardStatuses).filter(
    (status) => status === "incorrect"
  ).length;

  // Handle empty deck case
  if (cards.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerWithBack}>
          <TouchableOpacity
            style={styles.backArrow}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerText}>{deck.title}</Text>
          </View>
          <TouchableOpacity
            style={styles.addCardButton}
            onPress={() => navigation.navigate("AddCard", { deckId: deck.id })}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.emptyDeckText}>This deck has no cards yet.</Text>

        <View style={styles.emptyDeckButtons}>
          <TouchableOpacity
            style={[styles.button, styles.studyButton]}
            onPress={() => navigation.navigate("AddCard", { deckId: deck.id })}
          >
            <Text style={styles.buttonText}>Add Cards</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Handle when all cards have been reviewed
  if (studyMode && cardsToReview.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerWithBack}>
          <TouchableOpacity
            style={styles.backArrow}
            onPress={() => {
              clearStudySession(deckId);
              setStudyMode(false);
              setCardsToReview([]);
              setCurrentCardIndex(0);
              setIsFlipped(false);
              setCardStatuses({});
              setCardsReviewed(0);
              setUpdatedCardIndexes(new Set());
              navigation.goBack();
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerText}>{deck.title}</Text>
          </View>
          <TouchableOpacity
            style={styles.addCardButton}
            onPress={() => navigation.navigate("AddCard", { deckId: deck.id })}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.completionContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          <Text style={styles.completionText}>Study Complete!</Text>
          <Text style={styles.completionSubtext}>
            You've completed your study session.
          </Text>

          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={() => {
              clearStudySession(deckId);
              setStudyMode(false);
              setCardsToReview([]);
              setCurrentCardIndex(0);
              setIsFlipped(false);
              setCardStatuses({});
              setCardsReviewed(0);
              setUpdatedCardIndexes(new Set());
              navigation.goBack();
            }}
          >
            <Text style={styles.buttonText}>Exit Study Mode</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentCard = studyMode
    ? cardsToReview[currentCardIndex]
    : cards[currentCardIndex];

  // Log current card info in study mode
  if (studyMode && currentCard) {
    console.log(
      `[currentCard] Displaying card: ${currentCard.front} | cardIndex: ${
        currentCard.cardIndex || 0
      } | studyOrientation: ${currentCard.studyOrientation || "none"}`
    );
  }

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const handleGotIt = () => {
    // Update card status
    setCardStatuses((prevStatuses) => {
      const newStatuses = { ...prevStatuses };
      newStatuses[getCardTrackingKey(currentCard)] = "correct";
      return newStatuses;
    });

    // Only update cardIndex if it hasn't been updated yet in this study session
    if (!updatedCardIndexes.has(getCardId(currentCard))) {
      // Update cardIndex based on performance
      const currentCardIndexValue = currentCard.cardIndex || 0;
      let newCardIndex;

      console.log(
        `[handleGotIt] Card: ${currentCard.front} | Current cardIndex: ${currentCardIndexValue}`
      );

      if (currentCardIndexValue === 0) {
        // First time getting it right - increase to 3
        newCardIndex = 3;
        console.log(
          `[handleGotIt] First time correct! Increasing cardIndex from ${currentCardIndexValue} to ${newCardIndex}`
        );
      } else if (currentCardIndexValue === 1) {
        // Getting it right after being at minimum (1) - increase to 2
        newCardIndex = 2;
        console.log(
          `[handleGotIt] Correct after being at minimum! Increasing cardIndex from ${currentCardIndexValue} to ${newCardIndex}`
        );
      } else if (currentCardIndexValue >= 3 && currentCardIndexValue < 5) {
        // Already in the "got it right" range - increase by 1, max 5
        newCardIndex = currentCardIndexValue + 1;
        console.log(
          `[handleGotIt] Already correct range! Increasing cardIndex from ${currentCardIndexValue} to ${newCardIndex}`
        );
      } else {
        // Already at max (5) or other cases - keep current value
        newCardIndex = currentCardIndexValue;
        console.log(
          `[handleGotIt] At max or other case! Keeping cardIndex at ${newCardIndex}`
        );
      }

      // Update the card in the deck data
      const updatedDeck = { ...deck };
      const cardIndexInDeck = updatedDeck.cards.findIndex(
        (c) => c.id === currentCard.id
      );
      if (cardIndexInDeck !== -1) {
        // Determine reviewedIndex and masteredIndex based on new cardIndex
        const newReviewedIndex = newCardIndex >= 4;
        const newMasteredIndex = newCardIndex >= 5;
        const newReviewedAt = newReviewedIndex
          ? new Date().toISOString()
          : null;
        const newMasteredAt = newMasteredIndex
          ? new Date().toISOString()
          : null;

        // Increment timesMastered if card is going from level 4 to 5 (was previously demoted from mastered)
        const currentTimesMastered =
          updatedDeck.cards[cardIndexInDeck].timesMastered || 0;
        const newTimesMastered =
          newMasteredIndex && currentCardIndexValue === 4
            ? currentTimesMastered + 1
            : currentTimesMastered;

        updatedDeck.cards[cardIndexInDeck] = {
          ...updatedDeck.cards[cardIndexInDeck],
          cardIndex: newCardIndex,
          reviewedIndex: newReviewedIndex,
          reviewedAt: newReviewedAt,
          masteredIndex: newMasteredIndex,
          masteredAt: newMasteredAt,
          timesMastered: newTimesMastered,
        };

        console.log(
          `[handleGotIt] Updated card in deck. New cardIndex: ${newCardIndex}, reviewedIndex: ${newReviewedIndex}, reviewedAt: ${newReviewedAt}, masteredIndex: ${newMasteredIndex}, masteredAt: ${newMasteredAt}, timesMastered: ${newTimesMastered}`
        );

        // Update the decks array
        const updatedDecks = decks.map((d) =>
          d.id === deckId ? updatedDeck : d
        );
        updateDecks(updatedDecks);

        // Mark this card as updated in this session
        setUpdatedCardIndexes(
          (prev) => new Set([...prev, getCardId(currentCard)])
        );
        console.log(
          `[handleGotIt] Marked card ${currentCard.id} (${
            currentCard.studyOrientation || "normal"
          }) as updated in this session`
        );
      } else {
        console.log(`[handleGotIt] ERROR: Could not find card in deck!`);
      }
    } else {
      console.log(
        `[handleGotIt] Card ${currentCard.id} (${
          currentCard.studyOrientation || "normal"
        }) already updated in this session, skipping cardIndex update`
      );
    }

    // Increment cards reviewed counter
    setCardsReviewed((prev) => prev + 1);

    if (studyMode) {
      // Only remove the specific orientation that was answered correctly
      const cardToRemove = getCardTrackingKey(currentCard);
      console.log(
        `[handleGotIt] Removing card with tracking key: ${cardToRemove}`
      );
      console.log(
        `[handleGotIt] Cards before removal:`,
        cardsToReview.map((c) => getCardTrackingKey(c))
      );
      console.log(
        `[handleGotIt] Cards details:`,
        cardsToReview.map((c) => ({
          id: c.id,
          front: c.front,
          studyOrientation: c.studyOrientation,
          trackingKey: getCardTrackingKey(c),
        }))
      );

      const updatedCardsToReview = cardsToReview.filter(
        (c) => getCardTrackingKey(c) !== getCardTrackingKey(currentCard)
      );

      console.log(
        `[handleGotIt] Cards after removal:`,
        updatedCardsToReview.map((c) => getCardTrackingKey(c))
      );
      console.log(
        `[handleGotIt] Removed ${
          cardsToReview.length - updatedCardsToReview.length
        } cards`
      );

      setCardsToReview(updatedCardsToReview);

      if (currentCardIndex >= updatedCardsToReview.length) {
        setCurrentCardIndex(Math.max(0, updatedCardsToReview.length - 1));
      }
      setIsFlipped(false);
    } else {
      nextCard();
    }
  };

  const handleDidntGetIt = () => {
    // Update card status
    setCardStatuses((prevStatuses) => {
      const newStatuses = { ...prevStatuses };
      newStatuses[getCardTrackingKey(currentCard)] = "incorrect";
      return newStatuses;
    });

    // Only update cardIndex if it hasn't been updated yet in this study session
    if (!updatedCardIndexes.has(getCardId(currentCard))) {
      // Update cardIndex based on performance
      const currentCardIndexValue = currentCard.cardIndex || 0;
      let newCardIndex;

      console.log(
        `[handleDidntGetIt] Card: ${currentCard.front} | Current cardIndex: ${currentCardIndexValue}`
      );

      if (currentCardIndexValue === 0) {
        // First time getting it wrong - increase to 2
        newCardIndex = 2;
        console.log(
          `[handleDidntGetIt] First time wrong! Increasing cardIndex from ${currentCardIndexValue} to ${newCardIndex}`
        );
      } else if (currentCardIndexValue >= 4) {
        // Cards at level 4 or 5 getting it wrong - decrease to 3
        newCardIndex = 3;
        console.log(
          `[handleDidntGetIt] Higher level card wrong! Decreasing cardIndex from ${currentCardIndexValue} to ${newCardIndex}`
        );
      } else if (currentCardIndexValue === 3) {
        // Cards at level 3 getting it wrong - decrease to 2
        newCardIndex = 2;
        console.log(
          `[handleDidntGetIt] Level 3 card wrong! Decreasing cardIndex from ${currentCardIndexValue} to ${newCardIndex}`
        );
      } else if (currentCardIndexValue >= 2) {
        // Already got it wrong before - decrease to 1 (minimum)
        newCardIndex = 1;
        console.log(
          `[handleDidntGetIt] Already wrong before! Decreasing cardIndex from ${currentCardIndexValue} to ${newCardIndex}`
        );
      } else {
        // Already at minimum (1) - keep current value
        newCardIndex = currentCardIndexValue;
        console.log(
          `[handleDidntGetIt] At minimum! Keeping cardIndex at ${newCardIndex}`
        );
      }

      // Update the card in the deck data
      const updatedDeck = { ...deck };
      const cardIndexInDeck = updatedDeck.cards.findIndex(
        (c) => c.id === currentCard.id
      );
      if (cardIndexInDeck !== -1) {
        // Determine reviewedIndex and masteredIndex based on new cardIndex
        const newReviewedIndex = newCardIndex >= 4;
        const newMasteredIndex = newCardIndex >= 5;
        const newReviewedAt = newReviewedIndex
          ? new Date().toISOString()
          : null;
        const newMasteredAt = newMasteredIndex
          ? new Date().toISOString()
          : null;

        updatedDeck.cards[cardIndexInDeck] = {
          ...updatedDeck.cards[cardIndexInDeck],
          cardIndex: newCardIndex,
          reviewedIndex: newReviewedIndex,
          reviewedAt: newReviewedAt,
          masteredIndex: newMasteredIndex,
          masteredAt: newMasteredAt,
          timesMastered: updatedDeck.cards[cardIndexInDeck].timesMastered || 0, // Preserve timesMastered
        };

        console.log(
          `[handleDidntGetIt] Updated card in deck. New cardIndex: ${newCardIndex}, reviewedIndex: ${newReviewedIndex}, reviewedAt: ${newReviewedAt}, masteredIndex: ${newMasteredIndex}, masteredAt: ${newMasteredAt}, timesMastered: ${
            updatedDeck.cards[cardIndexInDeck].timesMastered || 0
          }`
        );

        // Update the decks array
        const updatedDecks = decks.map((d) =>
          d.id === deckId ? updatedDeck : d
        );
        updateDecks(updatedDecks);

        // Mark this card as updated in this session
        setUpdatedCardIndexes(
          (prev) => new Set([...prev, getCardId(currentCard)])
        );
        console.log(
          `[handleDidntGetIt] Marked card ${currentCard.id} (${
            currentCard.studyOrientation || "normal"
          }) as updated in this session`
        );
      } else {
        console.log(`[handleDidntGetIt] ERROR: Could not find card in deck!`);
      }
    } else {
      console.log(
        `[handleDidntGetIt] Card ${currentCard.id} (${
          currentCard.studyOrientation || "normal"
        }) already updated in this session, skipping cardIndex update`
      );
    }

    if (studyMode) {
      // Move current card to the end of the review list and shuffle remaining cards
      const updatedCardsToReview = [...cardsToReview];
      const currentCardToMove = updatedCardsToReview.splice(
        currentCardIndex,
        1
      )[0];
      updatedCardsToReview.push(currentCardToMove);

      console.log(
        `[handleDidntGetIt] Moving card to end: ${getCardTrackingKey(
          currentCardToMove
        )}`
      );
      console.log(
        `[handleDidntGetIt] Cards after moving:`,
        updatedCardsToReview.map((c) => getCardTrackingKey(c))
      );

      // Shuffle the remaining cards (excluding the one we just moved to the end)
      const remainingCards = updatedCardsToReview.slice(0, -1);
      for (let i = remainingCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingCards[i], remainingCards[j]] = [
          remainingCards[j],
          remainingCards[i],
        ];
      }

      // Combine shuffled remaining cards with the moved card at the end
      const shuffledCards = [...remainingCards, currentCardToMove];
      setCardsToReview(shuffledCards);

      setIsFlipped(false);
      if (currentCardIndex >= shuffledCards.length) {
        setCurrentCardIndex(0);
      }
    } else {
      nextCard();
    }
  };

  const nextCard = () => {
    setIsFlipped(false);
    position.setValue({ x: 0, y: 0 });
    setCurrentCardIndex((prevIndex) =>
      prevIndex === (studyMode ? cardsToReview.length : cards.length) - 1
        ? 0
        : prevIndex + 1
    );
  };

  const prevCard = () => {
    setIsFlipped(false);
    position.setValue({ x: 0, y: 0 });
    setCurrentCardIndex((prevIndex) =>
      prevIndex === 0
        ? (studyMode ? cardsToReview.length : cards.length) - 1
        : prevIndex - 1
    );
  };

  // Delete the current card
  const deleteCurrentCard = () => {
    Alert.alert("Delete Card", "Are you sure you want to delete this card?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          // Create a copy of the current deck
          const updatedDeck = { ...deck };

          // Remove the current card from the deck's cards
          updatedDeck.cards = deck.cards.filter(
            (_, index) => index !== currentCardIndex
          );

          // Update the decks array with the modified deck
          const updatedDecks = decks.map((d) =>
            d.id === deckId ? updatedDeck : d
          );

          // If in study mode, also remove the card from cardsToReview
          if (studyMode) {
            const updatedCardsToReview = cardsToReview.filter(
              (_, index) => index !== currentCardIndex
            );
            setCardsToReview(updatedCardsToReview);
          }

          // Update the state and save to storage
          updateDecks(updatedDecks);

          // If we deleted the last card, go to the previous card
          if (
            currentCardIndex >=
            (studyMode ? cardsToReview.length : updatedDeck.cards.length)
          ) {
            setCurrentCardIndex(
              Math.max(
                0,
                (studyMode ? cardsToReview.length : updatedDeck.cards.length) -
                  1
              )
            );
          }

          // If we deleted the last card in the deck, go back to the home screen
          if (updatedDeck.cards.length === 0) {
            navigation.goBack();
          }
        },
      },
    ]);
  };

  // Reset study stats when starting study mode
  const startStudyMode = () => {
    // Exit gallery mode when starting study mode
    setIsGalleryMode(false);

    console.log(`[startStudyMode] Starting study mode for deck: ${deck.title}`);
    console.log(
      `[startStudyMode] Cards in deck:`,
      cards.map((card) => ({
        front: card.front,
        cardIndex: card.cardIndex || 0,
      }))
    );

    // Reset the updated card indexes for this new session
    setUpdatedCardIndexes(new Set());
    console.log(`[startStudyMode] Reset updatedCardIndexes for new session`);

    // Check if there's an existing session first
    const savedSession = studySessions[deckId];

    // Check and reset mastered cards that have passed the 5-minute mark
    const updatedCards = checkAndResetCards(cards);
    if (updatedCards) {
      console.log(
        `[startStudyMode] Some mastered cards were reset after 5 minutes`
      );
      const updatedDeck = { ...deck, cards: updatedCards };
      const updatedDecks = decks.map((d) =>
        d.id === deckId ? updatedDeck : d
      );
      updateDecks(updatedDecks);
      // Update the local cards reference
      cards = updatedCards;
    }

    // Shuffle cards for random order
    const shuffleCards = (cards) => {
      const shuffled = [...cards];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    // Create study cards with both orientations (Arabic front and English front)
    const createStudyCards = (cards) => {
      const studyCards = [];

      cards.forEach((card) => {
        // Add card with Arabic on front (normal orientation)
        studyCards.push({
          ...card,
          studyOrientation: "arabic-front", // Arabic on front, English on back
        });

        // Add card with English on front (reversed orientation)
        studyCards.push({
          ...card,
          studyOrientation: "english-front", // English on front, Arabic on back
        });
      });

      const shuffledCards = shuffleCards(studyCards);
      console.log(
        `[createStudyCards] Created study cards:`,
        shuffledCards.map((card) => ({
          id: card.id,
          front: card.front,
          back: card.back,
          studyOrientation: card.studyOrientation,
          trackingKey: `${card.id}-${card.studyOrientation}`,
        }))
      );
      return shuffledCards;
    };

    // Filter out reviewed and mastered cards from study mode
    const cardsForStudy = cards.filter(
      (card) => !card.reviewedIndex && !card.masteredIndex
    );
    console.log(
      `[startStudyMode] Total cards: ${cards.length}, Cards for study: ${
        cardsForStudy.length
      }, Reviewed cards filtered out: ${
        cards.filter((card) => card.reviewedIndex && !card.masteredIndex).length
      }, Mastered cards filtered out: ${
        cards.filter((card) => card.masteredIndex).length
      }`
    );
    console.log(
      `[startStudyMode] Cards for study:`,
      cardsForStudy.map((card) => ({
        id: card.id,
        front: card.front,
        back: card.back,
        cardIndex: card.cardIndex,
        reviewedIndex: card.reviewedIndex,
        masteredIndex: card.masteredIndex,
      }))
    );

    // Check if there are any cards available for study
    if (cardsForStudy.length === 0) {
      Alert.alert(
        "All Cards Reviewed or Mastered! 🎉",
        "Congratulations! All cards in this deck have been reviewed or mastered. You can continue to review them in gallery mode or add new cards to study.",
        [
          {
            text: "View Gallery",
            onPress: () => setIsGalleryMode(true),
          },
          {
            text: "Add Cards",
            onPress: () => navigation.navigate("AddCard", { deckId: deck.id }),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
      return;
    }

    // Create study cards with both orientations
    const studyCardsWithOrientations = createStudyCards(cardsForStudy);
    console.log(
      `[startStudyMode] Created ${studyCardsWithOrientations.length} study cards (${cardsForStudy.length} cards × 2 orientations)`
    );

    const newSession = {
      cardsToReview: savedSession?.cardsToReview || studyCardsWithOrientations,
      cardStatuses: savedSession?.cardStatuses || {},
      cardsReviewed: savedSession?.cardsReviewed || 0,
      currentCardIndex: savedSession?.currentCardIndex || 0,
    };

    // Save the session first
    updateStudySession(deckId, newSession);

    // Then update local state
    setStudyMode(true);
    setCardsToReview(newSession.cardsToReview);
    setCurrentCardIndex(newSession.currentCardIndex);
    setIsFlipped(false);
    setCardStatuses(newSession.cardStatuses);
    setCardsReviewed(newSession.cardsReviewed);
  };

  const handleInStudyExit = () => {
    // Clear the study session from storage
    clearStudySession(deckId);

    // Clear local state
    setStudyMode(false);
    setCardsToReview([]);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setCardStatuses({});
    setCardsReviewed(0);
    setUpdatedCardIndexes(new Set());
    console.log(`[handleInStudyExit] Reset updatedCardIndexes`);
  };

  const handleExitStudyMode = () => {
    // Remove session clearing
    setStudyMode(false);
    setCardsToReview([]);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setCardStatuses({});
    setCardsReviewed(0);
    setUpdatedCardIndexes(new Set());
    console.log(`[handleExitStudyMode] Reset updatedCardIndexes`);

    // Navigate back without clearing the session
    navigation.goBack();
  };

  // Get the current card text based on flip state and study orientation
  const getCardText = (card, isFlipped) => {
    if (studyMode && card.studyOrientation) {
      // Study mode with orientation
      if (card.studyOrientation === "english-front") {
        // English on front, Arabic on back
        const result = isFlipped ? card.front : card.back;
        console.log(
          `[getCardText] English-front card: isFlipped=${isFlipped}, front="${card.front}", back="${card.back}", showing: "${result}"`
        );
        return result;
      } else {
        // Arabic on front, English on back (default)
        const result = isFlipped ? card.back : card.front;
        console.log(
          `[getCardText] Arabic-front card: isFlipped=${isFlipped}, front="${card.front}", back="${card.back}", showing: "${result}"`
        );
        return result;
      }
    } else {
      // Regular mode - always show Arabic on front (unflipped), English on back (flipped)
      const result = isFlipped ? card.back : card.front;
      console.log(
        `[getCardText] Regular mode: isFlipped=${isFlipped}, front="${card.front}", back="${card.back}", showing: "${result}"`
      );
      return result;
    }
  };

  const renderCardContent = (card, isFlipped) => {
    const text = getCardText(card, isFlipped);

    // Determine if the current text should be styled as Arabic
    let isArabic = false;
    if (studyMode && card.studyOrientation) {
      if (card.studyOrientation === "english-front") {
        // English on front, Arabic on back
        isArabic = isFlipped; // Arabic is on back (flipped)
      } else {
        // Arabic on front, English on back (default)
        isArabic = !isFlipped; // Arabic is on front (unflipped)
      }
    } else {
      // Regular mode - Arabic is always on front (unflipped)
      isArabic = !isFlipped;
    }

    return (
      <View style={flashcardStyles.cardContentInner}>
        <Text
          style={[
            flashcardStyles.cardText,
            isArabic && flashcardStyles.arabicText,
          ]}
        >
          {text}
        </Text>
        {isArabic && card.pronunciation && (
          <Text style={flashcardStyles.pronunciationText}>
            [{card.pronunciation}]
          </Text>
        )}
        {isArabic && card.example && (
          <Text
            style={[
              flashcardStyles.exampleText,
              isArabic && flashcardStyles.arabicExampleText,
            ]}
          >
            {card.example}
          </Text>
        )}
      </View>
    );
  };

  // 2. Add helper functions for selection and batch actions
  const isCardSelected = (cardId) => selectedCardIds.includes(cardId);
  const toggleCardSelection = (cardId) => {
    setSelectedCardIds((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId]
    );
  };
  const clearSelection = () => setSelectedCardIds([]);

  const handleDeleteSelected = () => {
    if (selectedCardIds.length === 0) return;
    Alert.alert(
      "Delete Cards",
      `Are you sure you want to delete ${selectedCardIds.length} card(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updatedDeck = { ...deck };
            updatedDeck.cards = deck.cards.filter(
              (card) => !selectedCardIds.includes(card.id)
            );
            const updatedDecks = decks.map((d) =>
              d.id === deckId ? updatedDeck : d
            );
            updateDecks(updatedDecks);
            clearSelection();
          },
        },
      ]
    );
  };

  const handleCopySelected = () => {
    if (selectedCardIds.length === 0) return;
    setShowDeckPicker(true);
  };

  // 1. Change the batch action bar button text from 'Copy to Deck' to 'Move to Deck'
  // In the batch action bar:
  // <Text style={{ color: "#fff", fontSize: 14 }}>Copy to Deck</Text>
  // becomes:
  // <Text style={{ color: "#fff", fontSize: 14 }}>Move to Deck</Text>

  // 2. When a deck is selected in the deck picker, show a confirmation popup (Alert)
  // Replace confirmCopyToDeck with confirmMoveToDeck, and update the onPress in the deck picker:
  // Restore the copy functionality in confirmMoveToDeck, but keep the button text as 'Move to Deck' and update the confirmation popup wording
  const confirmMoveToDeck = (targetDeckId) => {
    if (!targetDeckId) return;
    const targetDeck = decks.find((d) => d.id === targetDeckId);
    Alert.alert(
      "Move Cards",
      `Are you sure you want to Move ${selectedCardIds.length} card(s) to "${targetDeck.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Copy",
          style: "default",
          onPress: () => {
            // Only copy (do not remove from current deck)
            const cardsToCopy = deck.cards.filter((card) =>
              selectedCardIds.includes(card.id)
            );
            const updatedDecks = decks.map((d) => {
              if (d.id === targetDeckId) {
                // Add the copied cards to the target deck, avoiding duplicates
                const existingIds = new Set(d.cards.map((c) => c.id));
                const newCards = cardsToCopy.filter(
                  (c) => !existingIds.has(c.id)
                );
                return { ...d, cards: [...d.cards, ...newCards] };
              }
              return d;
            });
            updateDecks(updatedDecks);
            setShowDeckPicker(false);
            clearSelection();
          },
        },
      ]
    );
  };

  // 2. Update handleCreateDeckFromSelection to show the modal
  const handleCreateDeckFromSelection = () => {
    if (selectedCardIds.length === 0) return;
    setShowNewDeckModal(true);
    setNewDeckTitle("");
  };

  // 3. Add a function to actually create the deck
  const createDeckFromSelection = () => {
    if (!newDeckTitle.trim()) {
      Alert.alert("Error", "Deck name cannot be empty.");
      return;
    }
    const cardsToCopy = deck.cards.filter((card) =>
      selectedCardIds.includes(card.id)
    );
    const newDeck = {
      id: Date.now().toString(),
      title: newDeckTitle.trim(),
      cards: cardsToCopy,
    };
    updateDecks([...decks, newDeck]);
    clearSelection();
    setShowNewDeckModal(false);
  };

  return (
    <SafeAreaView style={flashcardStyles.container}>
      <View style={flashcardStyles.header}>
        <TouchableOpacity
          style={flashcardStyles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={flashcardStyles.headerTextContainer}>
          {isEditingTitle ? (
            <View style={flashcardStyles.editTitleContainer}>
              <TextInput
                style={flashcardStyles.editTitleInput}
                value={editedTitle}
                onChangeText={setEditedTitle}
                autoFocus
                selectTextOnFocus
              />
              <View style={flashcardStyles.editTitleActions}>
                <TouchableOpacity
                  style={[
                    flashcardStyles.editTitleButton,
                    flashcardStyles.saveTitleButton,
                  ]}
                  onPress={saveTitleEdit}
                >
                  <Ionicons name="checkmark" size={24} color="#4CAF50" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    flashcardStyles.editTitleButton,
                    flashcardStyles.cancelTitleButton,
                  ]}
                  onPress={cancelTitleEdit}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={flashcardStyles.titleContainer}>
              <Text style={flashcardStyles.headerTitle}>{deck.title}</Text>
              <TouchableOpacity
                style={flashcardStyles.editTitleButton}
                onPress={startEditingTitle}
              >
                <Ionicons name="pencil" size={20} color="#2196F3" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={flashcardStyles.addButton}
          onPress={() => navigation.navigate("AddCard", { deckId: deck.id })}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Gallery Button */}
      {!studyMode && (
        <View style={flashcardStyles.galleryButtonContainer}>
          <TouchableOpacity
            style={flashcardStyles.galleryToggleButton}
            onPress={() => setIsGalleryMode(!isGalleryMode)}
          >
            <Ionicons
              name={isGalleryMode ? "card" : "grid"}
              size={20}
              color="#fff"
            />
            <Text style={flashcardStyles.galleryButtonText}>
              {isGalleryMode ? "Card View" : "Gallery"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Study Stats */}
      {studyMode && (
        <View style={flashcardStyles.studyStatsContainer}>
          <Text style={flashcardStyles.studyStats}>
            {correctCount}✅ {incorrectCount}❌ • {cardsToReview.length} cards
            left
          </Text>
          <View style={flashcardStyles.cardIndexLegend}>
            <Text style={flashcardStyles.legendTitle}>Card Index:</Text>
            <View style={flashcardStyles.legendItems}>
              <View style={flashcardStyles.legendItem}>
                <View
                  style={[
                    flashcardStyles.legendColor,
                    { backgroundColor: "rgba(244, 67, 54, 0.8)" },
                  ]}
                />
                <Text style={flashcardStyles.legendText}>0-2: Needs work</Text>
              </View>
              <View style={flashcardStyles.legendItem}>
                <View
                  style={[
                    flashcardStyles.legendColor,
                    { backgroundColor: "rgba(255, 193, 7, 0.8)" },
                  ]}
                />
                <Text style={flashcardStyles.legendText}>
                  3-4: Getting better
                </Text>
              </View>
              <View style={flashcardStyles.legendItem}>
                <View
                  style={[
                    flashcardStyles.legendColor,
                    { backgroundColor: "rgba(76, 175, 80, 0.8)" },
                  ]}
                />
                <Text style={flashcardStyles.legendText}>5: Mastered</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {isGalleryMode ? (
        <View style={flashcardStyles.galleryContainer}>
          <Text style={flashcardStyles.gallerySummary}>
            {cards.length} {cards.length === 1 ? "card" : "cards"} in this deck
          </Text>
          <ScrollView style={flashcardStyles.galleryScrollView}>
            {studyMode && (
              <View style={flashcardStyles.studyModeInfo}>
                <Text style={flashcardStyles.studyModeText}>
                  Study Mode Active
                </Text>
                <Text style={flashcardStyles.studyModeStats}>
                  {correctCount}✅ {incorrectCount}❌ • {cardsToReview.length}{" "}
                  cards left
                </Text>
              </View>
            )}
            <View style={flashcardStyles.galleryGrid}>
              {(studyMode ? cardsToReview : cards).map((card, index) => {
                const originalIndex = cards.findIndex((c) => c.id === card.id);
                return (
                  <TouchableOpacity
                    key={card.id}
                    style={[
                      flashcardStyles.galleryCard,
                      isCardSelected(card.id) && {
                        borderColor: "#4CAF50",
                        borderWidth: 3,
                      },
                      studyMode &&
                        cardStatuses[card.id] &&
                        flashcardStyles[`${cardStatuses[card.id]}Card`],
                    ]}
                    onPress={() => {
                      if (isGalleryMode) {
                        toggleCardSelection(card.id);
                      } else if (studyMode) {
                        setCurrentCardIndex(index);
                        setIsFlipped(false);
                        setIsGalleryMode(false);
                      } else {
                        setCurrentCardIndex(originalIndex);
                        setIsFlipped(false);
                        setIsGalleryMode(false);
                      }
                    }}
                  >
                    <View style={flashcardStyles.galleryCardContent}>
                      <View style={flashcardStyles.galleryCardSide}>
                        <Text style={flashcardStyles.galleryCardLabel}>
                          Front:
                        </Text>
                        <Text style={flashcardStyles.galleryCardText}>
                          {card.front}
                        </Text>
                        {card.pronunciation && (
                          <Text
                            style={flashcardStyles.galleryPronunciationText}
                          >
                            [{card.pronunciation}]
                          </Text>
                        )}
                      </View>
                      <View style={flashcardStyles.galleryCardDivider} />
                      <View style={flashcardStyles.galleryCardSide}>
                        <Text style={flashcardStyles.galleryCardLabel}>
                          Back:
                        </Text>
                        <Text style={flashcardStyles.galleryCardText}>
                          {card.back}
                        </Text>
                        {card.example && (
                          <Text style={flashcardStyles.galleryExampleText}>
                            {card.example}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Text style={flashcardStyles.galleryCardNumber}>
                      {studyMode ? index + 1 : originalIndex + 1}
                    </Text>
                    {/* Card Index Display for Gallery */}
                    <View
                      style={[
                        flashcardStyles.galleryCardIndexContainer,
                        {
                          backgroundColor:
                            (card.cardIndex || 0) >= 5
                              ? "rgba(76, 175, 80, 0.8)" // Green for mastered (5)
                              : (card.cardIndex || 0) >= 3
                              ? "rgba(255, 193, 7, 0.8)" // Yellow for getting better (3-4)
                              : "rgba(244, 67, 54, 0.8)", // Red for needs work (0-2)
                        },
                      ]}
                    >
                      <Text style={flashcardStyles.galleryCardIndexText}>
                        {card.cardIndex || 0}
                      </Text>
                    </View>
                    {studyMode && cardStatuses[card.id] && (
                      <View style={flashcardStyles.statusIndicator}>
                        <Ionicons
                          name={
                            cardStatuses[card.id] === "correct"
                              ? "checkmark-circle"
                              : "close-circle"
                          }
                          size={20}
                          color={
                            cardStatuses[card.id] === "correct"
                              ? "#4CAF50"
                              : "#FF3B30"
                          }
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      ) : (
        <View style={flashcardStyles.cardContainer}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <PanGestureHandler
              onGestureEvent={Animated.event(
                [{ nativeEvent: { translationX: position.x } }],
                { useNativeDriver: false }
              )}
              onHandlerStateChange={({ nativeEvent }) => {
                if (nativeEvent.oldState === State.ACTIVE) {
                  const { translationX } = nativeEvent;
                  if (Math.abs(translationX) > swipeThreshold) {
                    const toValue =
                      translationX > 0 ? windowWidth : -windowWidth;
                    Animated.timing(position, {
                      toValue: { x: toValue, y: 0 },
                      duration: 200,
                      useNativeDriver: false,
                    }).start(() => {
                      position.setValue({ x: 0, y: 0 });
                      if (studyMode) {
                        if (translationX > 0) {
                          handleGotIt();
                        } else {
                          handleDidntGetIt();
                        }
                      } else {
                        // Regular navigation mode
                        if (translationX > 0) {
                          // Swipe right - go to next card
                          nextCard();
                        } else {
                          // Swipe left - go to previous card
                          prevCard();
                        }
                      }
                    });
                  } else {
                    Animated.spring(position, {
                      toValue: { x: 0, y: 0 },
                      friction: 5,
                      useNativeDriver: false,
                    }).start();
                  }
                }
              }}
            >
              <Animated.View
                style={[
                  flashcardStyles.card,
                  {
                    transform: [
                      { translateX: position.x },
                      { rotate: rotateCard },
                    ],
                  },
                ]}
              >
                <View style={flashcardStyles.cardActions}>
                  <TouchableOpacity
                    style={flashcardStyles.editButton}
                    onPress={() => {
                      const currentCard = studyMode
                        ? cardsToReview[currentCardIndex]
                        : cards[currentCardIndex];
                      const actualCardIndex = cards.findIndex(
                        (card) => card.id === currentCard.id
                      );
                      navigation.navigate("EditCard", {
                        deckId: deck.id,
                        cardIndex: actualCardIndex,
                      });
                    }}
                  >
                    <Ionicons name="pencil" size={24} color="#2196F3" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={flashcardStyles.deleteButton}
                    onPress={deleteCurrentCard}
                  >
                    <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={flashcardStyles.cardContent}
                  onPress={() => setIsFlipped(!isFlipped)}
                  activeOpacity={0.9}
                >
                  {renderCardContent(currentCard, isFlipped)}
                </TouchableOpacity>

                {/* Card Index Display */}
                <View
                  style={[
                    flashcardStyles.cardIndexContainer,
                    {
                      backgroundColor:
                        (currentCard.cardIndex || 0) >= 5
                          ? "rgba(76, 175, 80, 0.8)" // Green for mastered (5)
                          : (currentCard.cardIndex || 0) >= 3
                          ? "rgba(255, 193, 7, 0.8)" // Yellow for getting better (3-4)
                          : "rgba(244, 67, 54, 0.8)", // Red for needs work (0-2)
                    },
                  ]}
                >
                  <Text style={flashcardStyles.cardIndexText}>
                    {currentCard.cardIndex || 0}
                  </Text>
                  {(currentCard.reviewedIndex || currentCard.masteredIndex) && (
                    <View style={flashcardStyles.statusIcons}>
                      {currentCard.reviewedIndex && (
                        <Ionicons
                          name="checkmark-circle"
                          size={12}
                          color="#fff"
                        />
                      )}
                      {currentCard.masteredIndex && (
                        <Ionicons name="star" size={12} color="#fff" />
                      )}
                    </View>
                  )}
                </View>

                {/* Study Orientation Indicator */}
                {studyMode && currentCard.studyOrientation && (
                  <View style={flashcardStyles.orientationIndicator}>
                    <Text style={flashcardStyles.orientationText}>
                      {currentCard.studyOrientation === "english-front"
                        ? "EN"
                        : "AR"}
                    </Text>
                  </View>
                )}

                <Text style={flashcardStyles.flipHint}>Tap to flip</Text>

                {studyMode && (
                  <View style={flashcardStyles.navigationButtons}>
                    <TouchableOpacity
                      style={[
                        flashcardStyles.navButton,
                        flashcardStyles.prevButton,
                      ]}
                      onPress={handleDidntGetIt}
                    >
                      <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        flashcardStyles.navButton,
                        flashcardStyles.nextButton,
                      ]}
                      onPress={handleGotIt}
                    >
                      <Ionicons name="arrow-forward" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>
            </PanGestureHandler>
          </GestureHandlerRootView>
        </View>
      )}

      <View style={flashcardStyles.bottomContainer}>
        {!isGalleryMode && (
          <>
            <Text style={flashcardStyles.counter}>
              Card {studyMode ? cardsReviewed + 1 : currentCardIndex + 1} of{" "}
              {studyMode ? cardsToReview.length + cardsReviewed : cards.length}
            </Text>

            <View style={flashcardStyles.bottomButtons}>
              {studyMode ? (
                <TouchableOpacity
                  style={flashcardStyles.exitButton}
                  onPress={handleInStudyExit}
                >
                  <Text style={flashcardStyles.buttonText}>
                    Exit Study Mode
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={flashcardStyles.studyButton}
                  onPress={startStudyMode}
                >
                  <Text style={flashcardStyles.buttonText}>Start Studying</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
      {/* 4. Add the batch action bar at the bottom of gallery mode */}
      {isGalleryMode && selectedCardIds.length > 0 && (
        <View
          style={{
            backgroundColor: "#222",
            borderRadius: 10,
            marginVertical: 10,
            paddingVertical: 8,
            paddingHorizontal: 12,
            paddingBottom: 32,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 14, marginBottom: 8 }}>
            {selectedCardIds.length} selected
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              style={{
                backgroundColor: "#FF3B30",
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 6,
                marginRight: 6,
              }}
              onPress={handleDeleteSelected}
            >
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 12 }}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: "#2196F3",
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 6,
                marginRight: 6,
              }}
              onPress={handleCopySelected}
            >
              <Ionicons name="copy-outline" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 12 }}>Move to Deck</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: "#FFC107",
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 6,
                marginRight: 6,
              }}
              onPress={handleCreateDeckFromSelection}
            >
              <Ionicons name="add-circle-outline" size={16} color="#222" />
              <Text style={{ color: "#222", fontSize: 12 }}>New Deck</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginLeft: 4 }}
              onPress={clearSelection}
            >
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 5. Add a modal for deck selection (at the bottom of the component, before export default) */}
      {showDeckPicker && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100,
          }}
        >
          <View
            style={{
              backgroundColor: "#23272f",
              borderRadius: 18,
              paddingVertical: 28,
              paddingHorizontal: 0,
              width: "85%",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 10,
              alignItems: "center",
              position: "relative",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 22,
                fontWeight: "bold",
                marginBottom: 18,
                marginTop: 2,
                letterSpacing: 0.5,
              }}
            >
              Copy to which deck?
            </Text>
            <View style={{ maxHeight: 320, width: "100%" }}>
              <ScrollView
                style={{ width: "100%" }}
                contentContainerStyle={{ paddingHorizontal: 18 }}
              >
                {decks
                  .filter((d) => d.id !== deckId)
                  .map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      style={{
                        backgroundColor: "#313846",
                        borderRadius: 12,
                        paddingVertical: 18,
                        paddingHorizontal: 18,
                        marginBottom: 12,
                        borderWidth: 2,
                        borderColor: "#313846",
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                      activeOpacity={0.85}
                      onPress={() => confirmMoveToDeck(d.id)}
                    >
                      <Ionicons
                        name="albums-outline"
                        size={22}
                        color="#4CAF50"
                        style={{ marginRight: 12 }}
                      />
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 18,
                          fontWeight: "600",
                          flex: 1,
                        }}
                      >
                        {d.title}
                      </Text>
                      <Text style={{ color: "#aaa", fontSize: 14 }}>
                        {d.cards.length} cards
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
            <TouchableOpacity
              style={{
                marginTop: 18,
                alignSelf: "center",
                backgroundColor: "#444",
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 28,
              }}
              onPress={() => setShowDeckPicker(false)}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add the custom modal for deck creation at the bottom of the component, before export default */}
      {showNewDeckModal && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 200,
          }}
        >
          <View
            style={{
              backgroundColor: "#23272f",
              borderRadius: 18,
              paddingVertical: 18,
              paddingHorizontal: 12,
              width: "92%",
              maxWidth: 400,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 10,
              alignItems: "center",
              position: "relative",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 19,
                fontWeight: "bold",
                marginBottom: 12,
                letterSpacing: 0.5,
              }}
            >
              Create New Deck
            </Text>
            <Text
              style={{
                color: "#aaa",
                fontSize: 14,
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Enter a name for your new deck:
            </Text>
            <RNTextInput
              style={{
                backgroundColor: "#313846",
                color: "#fff",
                fontSize: 16,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 8,
                width: "100%",
                marginBottom: 12,
                borderWidth: 1,
                borderColor: "#444",
              }}
              placeholder="Deck name"
              placeholderTextColor="#888"
              value={newDeckTitle}
              onChangeText={setNewDeckTitle}
              autoFocus
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={createDeckFromSelection}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                width: "100%",
              }}
            >
              <TouchableOpacity
                style={{
                  backgroundColor: "#444",
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  marginRight: 8,
                }}
                onPress={() => setShowNewDeckModal(false)}
              >
                <Text
                  style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: "#4CAF50",
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                }}
                onPress={createDeckFromSelection}
              >
                <Text
                  style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}
                >
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const flashcardStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: "#1a1a1a",
  },
  headerTextContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  backButton: {
    padding: 10,
    marginLeft: -10,
  },
  addButton: {
    padding: 10,
    marginRight: -10,
  },
  cardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 20,
  },
  card: {
    width: windowWidth - 40,
    aspectRatio: 0.7,
    backgroundColor: "#2a2a2a",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.5,
    shadowRadius: 6.27,
    elevation: 10,
  },
  cardActions: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 1,
  },
  editButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 8,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    borderRadius: 8,
  },
  cardContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 50,
    position: "relative",
  },
  cardContentInner: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  cardText: {
    fontSize: 36,
    textAlign: "center",
    color: "#fff",
    fontWeight: "500",
    writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "Arial" : "sans-serif",
  },
  arabicText: {
    fontSize: 48,
    lineHeight: 60,
    textAlign: "center",
    writingDirection: "rtl",
    color: "#fff",
    fontFamily: Platform.OS === "ios" ? "Arial" : "sans-serif",
  },
  pronunciationText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
  },
  exampleText: {
    fontSize: 20,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
  },
  arabicExampleText: {
    fontSize: 24,
    lineHeight: 36,
    writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "Arial" : "sans-serif",
  },
  flipHint: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 30,
    alignItems: "center",
  },
  counter: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
    marginBottom: 15,
  },
  navigationButtons: {
    position: "absolute",
    bottom: "50%",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  prevButton: {
    backgroundColor: "#FF3B30",
  },
  nextButton: {
    backgroundColor: "#4CAF50",
  },
  studyButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 30,
  },
  exitButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 30,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  studyStats: {
    color: "#999",
    fontSize: 14,
    marginTop: 5,
    textAlign: "center",
  },
  completionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  completionText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginTop: 20,
  },
  completionSubtext: {
    fontSize: 18,
    color: "#999",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  resetButton: {
    backgroundColor: "#2196F3",
    marginTop: 20,
    width: "100%",
    maxWidth: 300,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editTitleContainer: {
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
  },
  editTitleInput: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    backgroundColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: "100%",
    textAlign: "center",
  },
  editTitleActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  editTitleButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  saveTitleButton: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
  },
  cancelTitleButton: {
    backgroundColor: "rgba(102, 102, 102, 0.1)",
  },
  galleryContainer: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    paddingTop: 20,
  },
  galleryScrollView: {
    paddingHorizontal: 20,
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 10,
  },
  galleryCard: {
    width: (windowWidth - 40 - 10) / 2, // 2 cards per row with 10px gap
    aspectRatio: 0.8, // Taller to accommodate both sides
    backgroundColor: "#2a2a2a",
    borderRadius: 15,
    marginBottom: 10,
    padding: 12,
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  galleryCardContent: {
    flex: 1,
    width: "100%",
    justifyContent: "space-between",
  },
  galleryCardText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
    textAlign: "center",
    writingDirection: "rtl",
    fontFamily: Platform.OS === "ios" ? "Arial" : "sans-serif",
  },
  galleryPronunciationText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 3,
  },
  galleryExampleText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 3,
  },
  galleryCardNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  gallerySummary: {
    fontSize: 18,
    color: "#999",
    textAlign: "center",
    marginBottom: 15,
  },
  studyModeInfo: {
    backgroundColor: "#333",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    alignItems: "center",
  },
  studyModeText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  studyModeStats: {
    fontSize: 16,
    color: "#999",
  },
  statusIndicator: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    padding: 5,
  },
  correctCard: {
    borderColor: "#4CAF50",
    borderWidth: 2,
  },
  incorrectCard: {
    borderColor: "#FF3B30",
    borderWidth: 2,
  },
  galleryCardSide: {
    width: "100%",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  galleryCardLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 3,
    textAlign: "center",
    fontWeight: "600",
  },
  galleryCardDivider: {
    width: "80%",
    height: 1,
    backgroundColor: "#444",
    marginVertical: 5,
  },
  galleryExampleText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
  },
  bottomButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 15,
  },
  galleryToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  galleryButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  galleryButtonContainer: {
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  studyStatsContainer: {
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  cardIndexContainer: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cardIndexText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  galleryCardIndexContainer: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  galleryCardIndexText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  cardIndexLegend: {
    marginTop: 10,
    alignItems: "center",
  },
  legendTitle: {
    color: "#999",
    fontSize: 14,
    marginBottom: 5,
  },
  legendItems: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  legendItem: {
    alignItems: "center",
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 3,
  },
  legendText: {
    color: "#999",
    fontSize: 12,
  },
  statusIcons: {
    flexDirection: "row",
    marginTop: 3,
  },
  orientationIndicator: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  orientationText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
});

export default FlashcardScreen;
