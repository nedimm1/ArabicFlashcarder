import React, { useContext, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  FlatList,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { DataContext } from "../context/DataContext";

const { height: screenHeight } = Dimensions.get("window");

export const HomeScreen = ({ navigation }) => {
  const { decks, fetchData } = useContext(DataContext);
  const [refreshing, setRefreshing] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;
  const [isPulling, setIsPulling] = useState(false);

  console.log("HomeScreen render - decks count:", decks.length);
  console.log("HomeScreen render - refreshing state:", refreshing);
  console.log("Platform:", Platform.OS);

  const onRefresh = async () => {
    console.log("Refresh triggered!");
    setRefreshing(true);
    try {
      console.log("Calling fetchData...");
      await fetchData();
      console.log("fetchData completed successfully");
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      console.log("Setting refreshing to false");
      setRefreshing(false);
    }
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = ({ nativeEvent }) => {
    if (nativeEvent.oldState === State.ACTIVE) {
      const { translationY } = nativeEvent;
      console.log("Gesture ended, translationY:", translationY);

      if (translationY > 100) {
        console.log("Triggering refresh manually!");
        onRefresh();
      }

      // Reset the position
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();

      setIsPulling(false);
    } else if (nativeEvent.state === State.ACTIVE) {
      setIsPulling(true);
    }
  };

  return (
    <View style={styles.container}>
      {/* Pull indicator at the top */}
      <Animated.View
        style={[
          styles.pullIndicator,
          {
            transform: [{ translateY: translateY }],
            opacity: isPulling ? 1 : 0.7,
          },
        ]}
      >
        <Text style={styles.pullIndicatorText}>
          {isPulling ? "🔄 Release to refresh!" : "⬇️ Pull down to refresh"}
        </Text>
      </Animated.View>

      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetY={[-10, 10]}
      >
        <Animated.View style={{ flex: 1 }}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollViewContent,
              decks.length === 0 && styles.scrollViewContentEmpty,
            ]}
            showsVerticalScrollIndicator={true}
            bounces={true}
            overScrollMode="always"
            scrollEventThrottle={16}
            onScrollBeginDrag={() => console.log("Scroll drag started")}
            onScrollEndDrag={() => console.log("Scroll drag ended")}
          >
            {decks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No decks yet. Pull down to refresh or add a new deck!
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  (Make sure to pull down from the very top)
                </Text>
              </View>
            ) : (
              decks.map((deck, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.deckButton}
                  onPress={() =>
                    navigation.navigate("DeckDetail", { deckIndex: index })
                  }
                >
                  <Text style={styles.deckTitle}>{deck.name}</Text>
                  <Text style={styles.cardCount}>
                    {deck.cards.length} cards
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </Animated.View>
      </PanGestureHandler>

      {/* Bottom buttons container */}
      <View style={styles.bottomButtonsContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddDeck")}
        >
          <Text style={styles.addButtonText}>Add New Deck</Text>
        </TouchableOpacity>

        {/* Test refresh button for debugging */}
        <TouchableOpacity style={styles.testRefreshButton} onPress={onRefresh}>
          <Text style={styles.testRefreshButtonText}>Test Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollViewContent: {
    paddingBottom: 100, // Add more padding for the bottom buttons
  },
  scrollViewContentEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  deckButton: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deckTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  cardCount: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  addButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 5,
    textAlign: "center",
  },
  testRefreshButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
    marginLeft: 10,
  },
  testRefreshButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  pullIndicator: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#007AFF",
    borderBottomWidth: 3,
    borderBottomColor: "#0056CC",
    zIndex: 2,
  },
  pullIndicatorText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  bottomButtonsContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 1,
  },
});
