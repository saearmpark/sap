package com.codestudio.board;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

@Component
public class GomokuRules implements TurnGameRules {

    static final int SIZE = 15;
    private static final int TARGET = 5;
    private static final int[][] DIRECTIONS = {{0, 1}, {1, 0}, {1, 1}, {1, -1}};

    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public String gameType() {
        return "gomoku";
    }

    @Override
    public String initialJson() {
        int[][] board = new int[SIZE][SIZE];
        return serialize(board);
    }

    @Override
    public Outcome apply(String stateJson, int player, JsonNode move) {
        try {
            int[][] board = readBoard(mapper.readTree(stateJson));
            if (board == null) {
                return null;
            }
            int row = move.path("row").asInt(-1);
            int col = move.path("col").asInt(-1);
            if (row < 0 || row >= SIZE || col < 0 || col >= SIZE || board[row][col] != 0) {
                return null;
            }
            board[row][col] = player;
            int winner = isWinner(board, row, col, player) ? player : -1;
            if (winner == -1 && isFull(board)) {
                winner = 0;
            }
            return new Outcome(serialize(board), winner);
        } catch (Exception error) {
            return null;
        }
    }

    private int[][] readBoard(JsonNode root) {
        JsonNode rows = root.path("board");
        if (!rows.isArray() || rows.size() != SIZE) {
            return null;
        }
        int[][] board = new int[SIZE][SIZE];
        for (int row = 0; row < SIZE; row++) {
            JsonNode cells = rows.get(row);
            if (!cells.isArray() || cells.size() != SIZE) {
                return null;
            }
            for (int col = 0; col < SIZE; col++) {
                board[row][col] = cells.get(col).asInt(0);
            }
        }
        return board;
    }

    private String serialize(int[][] board) {
        try {
            ObjectNode root = mapper.createObjectNode();
            root.put("size", SIZE);
            ArrayNode rows = root.putArray("board");
            for (int row = 0; row < SIZE; row++) {
                ArrayNode cells = rows.addArray();
                for (int col = 0; col < SIZE; col++) {
                    cells.add(board[row][col]);
                }
            }
            return mapper.writeValueAsString(root);
        } catch (Exception error) {
            throw new IllegalStateException(error);
        }
    }

    private boolean isWinner(int[][] board, int row, int col, int player) {
        for (int[] direction : DIRECTIONS) {
            int count = 1;
            count += countDirection(board, row, col, direction[0], direction[1], player);
            count += countDirection(board, row, col, -direction[0], -direction[1], player);
            if (count >= TARGET) {
                return true;
            }
        }
        return false;
    }

    private int countDirection(int[][] board, int row, int col, int dr, int dc, int player) {
        int count = 0;
        int r = row + dr;
        int c = col + dc;
        while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] == player) {
            count++;
            r += dr;
            c += dc;
        }
        return count;
    }

    private boolean isFull(int[][] board) {
        for (int row = 0; row < SIZE; row++) {
            for (int col = 0; col < SIZE; col++) {
                if (board[row][col] == 0) {
                    return false;
                }
            }
        }
        return true;
    }
}
