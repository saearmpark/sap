package com.codestudio.board;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class AnimalShogiRules implements TurnGameRules {

    static final int ROWS = 4;
    static final int COLS = 3;
    private static final String[] DROP_TYPES = {"giraffe", "elephant", "chick"};
    private static final int[][] LION_DIRS = {{-1, -1}, {-1, 0}, {-1, 1}, {0, -1}, {0, 1}, {1, -1}, {1, 0}, {1, 1}};
    private static final int[][] GIRAFFE_DIRS = {{-1, 0}, {0, -1}, {0, 1}, {1, 0}};
    private static final int[][] ELEPHANT_DIRS = {{-1, -1}, {-1, 1}, {1, -1}, {1, 1}};
    private static final int[][] CHICK_DIRS = {{-1, 0}};
    private static final int[][] HEN_DIRS = {{-1, -1}, {-1, 0}, {-1, 1}, {0, -1}, {0, 1}, {1, 0}};

    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public String gameType() {
        return "animal-shogi";
    }

    @Override
    public String initialJson() {
        Piece[][] board = new Piece[ROWS][COLS];
        board[0] = new Piece[]{new Piece(2, "giraffe", false), new Piece(2, "lion", false), new Piece(2, "elephant", false)};
        board[1][1] = new Piece(2, "chick", false);
        board[2][1] = new Piece(1, "chick", false);
        board[3] = new Piece[]{new Piece(1, "elephant", false), new Piece(1, "lion", false), new Piece(1, "giraffe", false)};
        int[][] hands = new int[2][3];
        return serialize(board, hands);
    }

    @Override
    public Outcome apply(String stateJson, int player, JsonNode move) {
        try {
            Position position = parse(mapper.readTree(stateJson));
            if (position == null) {
                return null;
            }
            String kind = move.path("kind").asText("");
            Piece moved = null;
            int toRow;
            int toCol;
            Piece captured;

            if ("move".equals(kind)) {
                JsonNode from = move.path("from");
                JsonNode to = move.path("to");
                if (!from.isArray() || from.size() != 2 || !to.isArray() || to.size() != 2) {
                    return null;
                }
                int fromRow = from.get(0).asInt(-1);
                int fromCol = from.get(1).asInt(-1);
                toRow = to.get(0).asInt(-1);
                toCol = to.get(1).asInt(-1);
                if (!inBounds(fromRow, fromCol)) {
                    return null;
                }
                Piece piece = position.board[fromRow][fromCol];
                if (piece == null || piece.owner != player) {
                    return null;
                }
                if (!legalPieceMoves(position.board, player, fromRow, fromCol).contains(key(toRow, toCol))) {
                    return null;
                }
                captured = position.board[toRow][toCol];
                if (captured != null && !"lion".equals(captured.type)) {
                    position.hands[player - 1][typeIndex(captured.promoted ? "chick" : captured.type)]++;
                }
                position.board[toRow][toCol] = piece;
                position.board[fromRow][fromCol] = null;
                if ("chick".equals(piece.type) && toRow == farRank(piece.owner)) {
                    piece = new Piece(piece.owner, piece.type, true);
                    position.board[toRow][toCol] = piece;
                }
                moved = piece;
            } else if ("drop".equals(kind)) {
                String type = move.path("type").asText("");
                JsonNode to = move.path("to");
                if (!to.isArray() || to.size() != 2 || typeIndex(type) < 0) {
                    return null;
                }
                toRow = to.get(0).asInt(-1);
                toCol = to.get(1).asInt(-1);
                if (!inBounds(toRow, toCol) || position.hands[player - 1][typeIndex(type)] <= 0) {
                    return null;
                }
                if (!legalDrops(position.board, player, type).contains(key(toRow, toCol))) {
                    return null;
                }
                position.hands[player - 1][typeIndex(type)]--;
                moved = new Piece(player, type, false);
                position.board[toRow][toCol] = moved;
                captured = null;
            } else {
                return null;
            }

            int winner = -1;
            if (captured != null && "lion".equals(captured.type)) {
                winner = player;
            } else if ("lion".equals(moved.type) && toRow == farRank(player) && !inCheck(position.board, player)) {
                winner = player;
            } else if (!hasLegalMove(position.board, position.hands, 3 - player)) {
                winner = player;
            }
            return new Outcome(serialize(position.board, position.hands), winner);
        } catch (Exception error) {
            return null;
        }
    }

    private Position parse(JsonNode root) {
        JsonNode rows = root.path("board");
        if (!rows.isArray() || rows.size() != ROWS) {
            return null;
        }
        Piece[][] board = new Piece[ROWS][COLS];
        for (int row = 0; row < ROWS; row++) {
            JsonNode cells = rows.get(row);
            if (!cells.isArray() || cells.size() != COLS) {
                return null;
            }
            for (int col = 0; col < COLS; col++) {
                JsonNode cell = cells.get(col);
                if (cell == null || cell.isNull()) {
                    continue;
                }
                String type = cell.path("type").asText("");
                int owner = cell.path("owner").asInt(0);
                if (!isPieceType(type) || (owner != 1 && owner != 2)) {
                    return null;
                }
                board[row][col] = new Piece(owner, type, cell.path("promoted").asBoolean(false));
            }
        }
        int[][] hands = new int[2][3];
        JsonNode handsNode = root.path("hands");
        for (int owner = 1; owner <= 2; owner++) {
            JsonNode ownerHands = handsNode.path(String.valueOf(owner));
            for (String type : DROP_TYPES) {
                hands[owner - 1][typeIndex(type)] = ownerHands.path(type).asInt(0);
            }
        }
        return new Position(board, hands);
    }

    private String serialize(Piece[][] board, int[][] hands) {
        try {
            ObjectNode root = mapper.createObjectNode();
            root.put("rows", ROWS);
            root.put("cols", COLS);
            ArrayNode rows = root.putArray("board");
            for (int row = 0; row < ROWS; row++) {
                ArrayNode cells = rows.addArray();
                for (int col = 0; col < COLS; col++) {
                    Piece piece = board[row][col];
                    if (piece == null) {
                        cells.addNull();
                    } else {
                        ObjectNode node = cells.addObject();
                        node.put("owner", piece.owner);
                        node.put("type", piece.type);
                        node.put("promoted", piece.promoted);
                    }
                }
            }
            ObjectNode handsNode = root.putObject("hands");
            for (int owner = 1; owner <= 2; owner++) {
                ObjectNode ownerHands = handsNode.putObject(String.valueOf(owner));
                for (String type : DROP_TYPES) {
                    ownerHands.put(type, hands[owner - 1][typeIndex(type)]);
                }
            }
            return mapper.writeValueAsString(root);
        } catch (Exception error) {
            throw new IllegalStateException(error);
        }
    }

    private boolean inBounds(int row, int col) {
        return row >= 0 && row < ROWS && col >= 0 && col < COLS;
    }

    private int farRank(int owner) {
        return owner == 1 ? 0 : ROWS - 1;
    }

    private int typeIndex(String type) {
        for (int i = 0; i < DROP_TYPES.length; i++) {
            if (DROP_TYPES[i].equals(type)) {
                return i;
            }
        }
        return -1;
    }

    private boolean isPieceType(String type) {
        return "lion".equals(type) || typeIndex(type) >= 0;
    }

    private int[][] directions(Piece piece) {
        if (piece.promoted) {
            return HEN_DIRS;
        }
        return switch (piece.type) {
            case "lion" -> LION_DIRS;
            case "giraffe" -> GIRAFFE_DIRS;
            case "elephant" -> ELEPHANT_DIRS;
            case "chick" -> CHICK_DIRS;
            default -> new int[0][];
        };
    }

    private List<int[]> pieceMoves(Piece[][] board, Piece piece, int row, int col) {
        int forward = piece.owner == 1 ? 1 : -1;
        List<int[]> targets = new ArrayList<>();
        for (int[] direction : directions(piece)) {
            int toRow = row + direction[0] * forward;
            int toCol = col + direction[1];
            if (inBounds(toRow, toCol) && (board[toRow][toCol] == null || board[toRow][toCol].owner != piece.owner)) {
                targets.add(new int[]{toRow, toCol});
            }
        }
        return targets;
    }

    private int[] findLion(Piece[][] board, int owner) {
        for (int row = 0; row < ROWS; row++) {
            for (int col = 0; col < COLS; col++) {
                Piece piece = board[row][col];
                if (piece != null && piece.owner == owner && "lion".equals(piece.type)) {
                    return new int[]{row, col};
                }
            }
        }
        return null;
    }

    private boolean isAttacked(Piece[][] board, int row, int col, int byOwner) {
        for (int r = 0; r < ROWS; r++) {
            for (int c = 0; c < COLS; c++) {
                Piece piece = board[r][c];
                if (piece != null && piece.owner == byOwner) {
                    for (int[] target : pieceMoves(board, piece, r, c)) {
                        if (target[0] == row && target[1] == col) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    private boolean inCheck(Piece[][] board, int owner) {
        int[] lion = findLion(board, owner);
        return lion == null || isAttacked(board, lion[0], lion[1], 3 - owner);
    }

    private List<String> legalPieceMoves(Piece[][] board, int owner, int row, int col) {
        Piece piece = board[row][col];
        List<String> result = new ArrayList<>();
        if (piece == null || piece.owner != owner) {
            return result;
        }
        for (int[] target : pieceMoves(board, piece, row, col)) {
            Piece[][] next = cloneBoard(board);
            next[target[0]][target[1]] = next[row][col];
            next[row][col] = null;
            if (!inCheck(next, owner)) {
                result.add(key(target[0], target[1]));
            }
        }
        return result;
    }

    private List<String> legalDrops(Piece[][] board, int owner, String type) {
        List<String> result = new ArrayList<>();
        boolean hasUnpromotedChick = false;
        if ("chick".equals(type)) {
            for (int row = 0; row < ROWS; row++) {
                for (int col = 0; col < COLS; col++) {
                    Piece piece = board[row][col];
                    if (piece != null && piece.owner == owner && "chick".equals(piece.type) && !piece.promoted) {
                        hasUnpromotedChick = true;
                    }
                }
            }
        }
        for (int row = 0; row < ROWS; row++) {
            for (int col = 0; col < COLS; col++) {
                if (board[row][col] != null) {
                    continue;
                }
                if ("chick".equals(type) && row == farRank(owner)) {
                    continue;
                }
                if ("chick".equals(type) && hasUnpromotedChick) {
                    continue;
                }
                Piece[][] next = cloneBoard(board);
                next[row][col] = new Piece(owner, type, false);
                if (!inCheck(next, owner)) {
                    result.add(key(row, col));
                }
            }
        }
        return result;
    }

    private boolean hasLegalMove(Piece[][] board, int[][] hands, int owner) {
        for (int row = 0; row < ROWS; row++) {
            for (int col = 0; col < COLS; col++) {
                if (!legalPieceMoves(board, owner, row, col).isEmpty()) {
                    return true;
                }
            }
        }
        for (String type : DROP_TYPES) {
            if (hands[owner - 1][typeIndex(type)] > 0 && !legalDrops(board, owner, type).isEmpty()) {
                return true;
            }
        }
        return false;
    }

    private Piece[][] cloneBoard(Piece[][] board) {
        Piece[][] next = new Piece[ROWS][COLS];
        for (int row = 0; row < ROWS; row++) {
            System.arraycopy(board[row], 0, next[row], 0, COLS);
        }
        return next;
    }

    private String key(int row, int col) {
        return row + "," + col;
    }

    private record Piece(int owner, String type, boolean promoted) {
    }

    private record Position(Piece[][] board, int[][] hands) {
    }
}
