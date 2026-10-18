package com.codestudio.board;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TurnGameRulesTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void connectFourDetectsWinAndIllegalMoves() {
        ConnectFourRules rules = new ConnectFourRules();
        String state = rules.initialJson();

        state = play(rules, state, 1, col(0));
        state = play(rules, state, 2, col(0));
        state = play(rules, state, 1, col(1));
        state = play(rules, state, 2, col(1));
        state = play(rules, state, 1, col(2));
        state = play(rules, state, 2, col(2));
        TurnGameRules.Outcome outcome = rules.apply(state, 1, col(3));

        assertNotNull(outcome);
        assertEquals(1, outcome.winner());

        assertNull(rules.apply(rules.initialJson(), 1, col(7)));
        assertNull(rules.apply(rules.initialJson(), 1, col(-1)));
    }

    @Test
    void gomokuDetectsFiveInARow() {
        GomokuRules rules = new GomokuRules();
        String state = rules.initialJson();

        for (int i = 0; i < 4; i++) {
            state = play(rules, state, 1, cell(7, i));
            state = play(rules, state, 2, cell(0, i));
        }
        TurnGameRules.Outcome outcome = rules.apply(state, 1, cell(7, 4));

        assertNotNull(outcome);
        assertEquals(1, outcome.winner());

        assertNull(rules.apply(rules.initialJson(), 1, cell(15, 0)));
        assertTrue(rules.initialJson().contains("\"size\":15"));
    }

    @Test
    void animalShogiAllowsCaptureButRejectsIllegalMove() {
        AnimalShogiRules rules = new AnimalShogiRules();
        String state = rules.initialJson();

        ObjectNode capture = mapper.createObjectNode();
        capture.put("kind", "move");
        capture.putArray("from").add(2).add(1);
        capture.putArray("to").add(1).add(1);
        TurnGameRules.Outcome outcome = rules.apply(state, 1, capture);

        assertNotNull(outcome);
        assertEquals(-1, outcome.winner());
        assertTrue(outcome.stateJson().contains("\"chick\""));

        ObjectNode sideways = mapper.createObjectNode();
        sideways.put("kind", "move");
        sideways.putArray("from").add(2).add(1);
        sideways.putArray("to").add(2).add(0);
        assertNull(rules.apply(state, 1, sideways));

        ObjectNode wrongOwner = mapper.createObjectNode();
        wrongOwner.put("kind", "move");
        wrongOwner.putArray("from").add(0).add(1);
        wrongOwner.putArray("to").add(1).add(0);
        assertNull(rules.apply(state, 1, wrongOwner));
    }

    private String play(TurnGameRules rules, String state, int player, ObjectNode move) {
        TurnGameRules.Outcome outcome = rules.apply(state, player, move);
        assertNotNull(outcome, "move should be legal");
        return outcome.stateJson();
    }

    private ObjectNode col(int col) {
        ObjectNode node = mapper.createObjectNode();
        node.put("col", col);
        return node;
    }

    private ObjectNode cell(int row, int col) {
        ObjectNode node = mapper.createObjectNode();
        node.put("row", row);
        node.put("col", col);
        return node;
    }
}
