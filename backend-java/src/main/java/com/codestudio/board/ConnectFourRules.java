package com.codestudio.board;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

@Component
public class ConnectFourRules implements TurnGameRules {

    static final int ROWS = 6;
    static final int COLS = 7;
    private static final int CONNECT = 4;
    private static final int[][] DIRECTIONS = {{0, 1}, {1, 0}, {1, 1}, {1, -1}};

    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public String gameType() {
        return "connect";
    }

    @Override
    public String initialJson() {
        int[][] board = new int[ROWS][COLS];
        return serialize(board);
    }

    @Override
    public Outcome apply(String stateJson, int player, JsonNode move) {
        try {
            int[][] board = readBoard(mapper.readTree(stateJson));
            if (board == null) {
                return null;
            }
            int col = move.path("col").asInt(-1);
            if (col < 0 || col >= COLS) {
                return null;
            }
            int targetRow = -1;
            for (int row = ROWS - 1; row >= 0; row--) {
                if (board[row][col] == 0) {
                    targetRow = row;
                    break;
                }
            }
            if (targetRow < 0) {
                return null;
            }
            board[targetRow][col] = player;
            int winner = hasWon(board, targetRow, col, player) ? player : -1;
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
        if (!rows.isArray() || rows.size() != ROWS) {
            return null;
        }
        int[][] board = new int[ROWS][COLS];
        for (int row = 0; row < ROWS; row++) {
            JsonNode cells = rows.get(row);
            if (!cells.isArray() || cells.size() != COLS) {
                return null;
            }
            for (int col = 0; col < COLS; col++) {
                board[row][col] = cells.get(col).asInt(0);
            }
        }
        return board;
    }

    private String serialize(int[][] board) {
        try {
            ObjectNode root = mapper.createObjectNode();
            root.put("rows", ROWS);
            root.put("cols", COLS);
            ArrayNode rows = root.putArray("board");
            for (int row = 0; row < ROWS; row++) {
                ArrayNode cells = rows.addArray();
                for (int col = 0; col < COLS; col++) {
                    cells.add(board[row][col]);
                }
            }
            return mapper.writeValueAsString(root);
        } catch (Exception error) {
            throw new IllegalStateException(error);
        }
    }

    private boolean hasWon(int[][] board, int row, int col, int player) {
        for (int[] direction : DIRECTIONS) {
            int count = 1;
            count += countDirection(board, row, col, direction[0], direction[1], player);
            count += countDirection(board, row, col, -direction[0], -direction[1], player);
            if (count >= CONNECT) {
                return true;
            }
        }
        return false;
    }

    private int countDirection(int[][] board, int row, int col, int dr, int dc, int player) {
        int count = 0;
        int r = row + dr;
        int c = col + dc;
        while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] == player) {
            count++;
            r += dr;
            c += dc;
        }
        return count;
    }

    private boolean isFull(int[][] board) {
        for (int col = 0; col < COLS; col++) {
            if (board[0][col] == 0) {
                return false;
            }
        }
        return true;
    }
}
