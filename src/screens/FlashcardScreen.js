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
  const [isSecondRound, setIsSecondRound] = useState(false);
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

  // Effect to manage study session state and card updates
  useFocusEffect(
    React.useCallback(() => {
      const savedSession = studySessions[deckId];
      const currentDeck = decks.find((d) => d.id === deckId);

      if (!currentDeck) return;

      // Handle session restoration
      if (
        savedSession &&
        savedSession.cardsToReview?.length > 0 &&
        (!studyMode || currentCardIndex !== savedSession.currentCardIndex)
      ) {
        const sessionCards = savedSession.isSecondRound
          ? savedSession.cardsToReview.map((card) => ({
              ...card,
              front: card.back,
              back: card.front,
              isReversed: true,
            }))
          : savedSession.cardsToReview;

        // Batch state updates to prevent multiple re-renders
        setStudyMode(true);
        setCardsToReview(sessionCards);
        setCardStatuses(savedSession.cardStatuses || {});
        setIsSecondRound(savedSession.isSecondRound || false);
        setCardsReviewed(savedSession.cardsReviewed || 0);
        setCurrentCardIndex(savedSession.currentCardIndex || 0);
      }
      // Handle card updates for existing study session
      else if (studyMode && cardsToReview.length > 0) {
        const updatedCards = cardsToReview.map((card) => {
          const updatedCard = currentDeck.cards.find((c) => c.id === card.id);
          return updatedCard || card;
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
            const cardsToSave = isSecondRound
              ? cardsToReview.map((card) => ({
                  ...card,
                  front: card.back,
                  back: card.front,
                  isReversed: false,
                }))
              : cardsToReview;

            updateStudySession(deckId, {
              cardsToReview: cardsToSave,
              cardStatuses,
              isSecondRound,
              cardsReviewed,
              currentCardIndex,
            });
          }
        }
      };
    }, [deckId, decks, studyMode, cardsToReview.length, currentCardIndex])
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
  const cards = deck ? deck.cards : [];

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
              setStudyMode(false);
              clearStudySession(deckId);
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
          <Text style={styles.completionText}>
            {isSecondRound ? "Study Complete!" : "First Round Complete!"}
          </Text>
          <Text style={styles.completionSubtext}>
            {isSecondRound
              ? "You've completed both rounds of study."
              : "Now let's practice with English on the front!"}
          </Text>

          {!isSecondRound ? (
            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={() => {
                // Start English round without reversing cards
                setCardsToReview([...cards]);
                setCurrentCardIndex(0);
                setIsFlipped(false);
                setIsSecondRound(true);
                setCardStatuses({});
                setCardsReviewed(0);

                // Save the session for English round
                updateStudySession(deckId, {
                  cardsToReview: [...cards],
                  cardStatuses: {},
                  isSecondRound: true,
                  cardsReviewed: 0,
                  currentCardIndex: 0,
                });
              }}
            >
              <Text style={styles.buttonText}>Start English Front Round</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={() => {
                clearStudySession(deckId);
                setStudyMode(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.buttonText}>Exit Study Mode</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const currentCard = studyMode
    ? cardsToReview[currentCardIndex]
    : cards[currentCardIndex];

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const handleGotIt = () => {
    // Update card status
    setCardStatuses((prevStatuses) => {
      const newStatuses = { ...prevStatuses };
      newStatuses[currentCard.id] = "correct";
      return newStatuses;
    });

    // Increment cards reviewed counter
    setCardsReviewed((prev) => prev + 1);

    if (studyMode) {
      const updatedCardsToReview = cardsToReview.filter(
        (c) => c.id !== currentCard.id
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
      newStatuses[currentCard.id] = "incorrect";
      return newStatuses;
    });

    if (studyMode) {
      // Move current card to the end of the review list
      const updatedCardsToReview = [...cardsToReview];
      const currentCardToMove = updatedCardsToReview.splice(
        currentCardIndex,
        1
      )[0];
      updatedCardsToReview.push(currentCardToMove);
      setCardsToReview(updatedCardsToReview);

      setIsFlipped(false);
      if (currentCardIndex >= updatedCardsToReview.length) {
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
    // Check if there's an existing session first
    const savedSession = studySessions[deckId];

    const newSession = {
      cardsToReview: savedSession?.cardsToReview || [...cards],
      cardStatuses: savedSession?.cardStatuses || {},
      isSecondRound: savedSession?.isSecondRound || false,
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
    setIsSecondRound(newSession.isSecondRound);
    setCardStatuses(newSession.cardStatuses);
    setCardsReviewed(newSession.cardsReviewed);
  };

  const handleInStudyExit = () => {
    // First clear the session from storage
    clearStudySession(deckId);

    // Then reset all state
    setStudyMode(false);
    setCardsToReview([]);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setIsSecondRound(false);
    setCardStatuses({});
    setCardsReviewed(0);
  };

  const handleExitStudyMode = () => {
    // First clear the session
    clearStudySession(deckId);

    // Then reset all state
    setStudyMode(false);
    setCardsToReview([]);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setIsSecondRound(false);
    setCardStatuses({});
    setCardsReviewed(0);

    // Finally navigate back
    navigation.goBack();
  };

  // Get the current card text based on round and flip state
  const getCardText = (card, isFlipped, isSecondRound) => {
    if (isSecondRound) {
      // In second round (English front), swap front and back
      return isFlipped ? card.front : card.back;
    } else {
      // In first round (foreign language front)
      return isFlipped ? card.back : card.front;
    }
  };

  const renderCardContent = (card, isFlipped, isSecondRound) => {
    const text = getCardText(card, isFlipped, isSecondRound);
    const isArabic = isSecondRound ? isFlipped : !isFlipped;

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
            <>
              <View style={flashcardStyles.titleContainer}>
                <Text style={flashcardStyles.headerTitle}>{deck.title}</Text>
                <TouchableOpacity
                  style={flashcardStyles.editTitleButton}
                  onPress={startEditingTitle}
                >
                  <Ionicons name="pencil" size={20} color="#2196F3" />
                </TouchableOpacity>
              </View>
              <Text style={flashcardStyles.headerSubtitle}>
                {deck.displayName}
              </Text>
              {studyMode && (
                <Text style={flashcardStyles.studyStats}>
                  {correctCount}✅ {incorrectCount}❌ • {cardsToReview.length}{" "}
                  cards left
                </Text>
              )}
            </>
          )}
        </View>
        <TouchableOpacity
          style={flashcardStyles.addButton}
          onPress={() => navigation.navigate("AddCard", { deckId: deck.id })}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

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
                  const toValue = translationX > 0 ? windowWidth : -windowWidth;
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
                {renderCardContent(currentCard, isFlipped, isSecondRound)}
              </TouchableOpacity>

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

      <View style={flashcardStyles.bottomContainer}>
        <Text style={flashcardStyles.counter}>
          Card {studyMode ? cardsReviewed + 1 : currentCardIndex + 1} of{" "}
          {studyMode ? cardsToReview.length + cardsReviewed : cards.length}
        </Text>

        {studyMode ? (
          <TouchableOpacity
            style={flashcardStyles.exitButton}
            onPress={handleInStudyExit}
          >
            <Text style={flashcardStyles.buttonText}>Exit Study Mode</Text>
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
    marginBottom: -10,
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
  headerSubtitle: {
    fontSize: 20,
    color: "#666",
    marginTop: 5,
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
    marginTop: 40,
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
    marginHorizontal: 20,
    marginBottom: 30,
  },
  exitButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginHorizontal: 20,
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
});

export default FlashcardScreen;
