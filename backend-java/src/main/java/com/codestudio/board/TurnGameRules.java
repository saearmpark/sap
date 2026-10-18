package com.codestudio.board;

import com.fasterxml.jackson.databind.JsonNode;

public interface TurnGameRules {

    String gameType();

    String initialJson();

    /**
     * Applies a move for the given player (1 or 2) to the serialized state.
     *
     * @return the new state and winner, or {@code null} if the move is illegal.
     *         Winner is {@code -1} for ongoing, {@code 0} for a draw, or the winning player.
     */
    Outcome apply(String stateJson, int player, JsonNode move);

    record Outcome(String stateJson, int winner) {
    }
}
