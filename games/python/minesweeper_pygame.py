"""Minesweeper. Left-click to reveal, right-click to flag."""

import random
import sys

import pygame

COLS, ROWS = 10, 10
MINES = 15
CELL = 42
HEADER = 54
WIDTH, HEIGHT = COLS * CELL, HEADER + ROWS * CELL
BG = (247, 246, 242)
HIDDEN = (196, 201, 194)
REVEALED = (232, 231, 222)
INK = (39, 47, 43)
NUMBER_COLORS = [(0, 0, 0), (55, 105, 190), (55, 140, 75), (190, 65, 55),
                 (95, 65, 155), (150, 85, 45), (45, 145, 150), (45, 45, 45), (110, 110, 110)]


def make_board(safe_cell):
    safe_r, safe_c = safe_cell
    candidates = [(r, c) for r in range(ROWS) for c in range(COLS)
                  if (r, c) != (safe_r, safe_c)]
    mines = set(random.sample(candidates, MINES))
    board = [[0] * COLS for _ in range(ROWS)]
    for r, c in mines:
        board[r][c] = -1
        for nr in range(max(0, r - 1), min(ROWS, r + 2)):
            for nc in range(max(0, c - 1), min(COLS, c + 2)):
                if board[nr][nc] != -1:
                    board[nr][nc] += 1
    return board, mines


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("지뢰 찾기")
    font = pygame.font.SysFont("arial", 23, bold=True)
    small = pygame.font.SysFont("arial", 17)
    clock = pygame.time.Clock()

    revealed = set()
    flagged = set()
    board = None
    mines = set()
    state = "playing"

    def reveal(start):
        stack = [start]
        while stack:
            r, c = stack.pop()
            if (r, c) in revealed or (r, c) in flagged:
                continue
            revealed.add((r, c))
            if board[r][c] == 0:
                for nr in range(max(0, r - 1), min(ROWS, r + 2)):
                    for nc in range(max(0, c - 1), min(COLS, c + 2)):
                        if (nr, nc) not in revealed:
                            stack.append((nr, nc))

    def reset():
        nonlocal revealed, flagged, board, mines, state
        revealed, flagged = set(), set()
        board, mines, state = None, set(), "playing"

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN and event.key == pygame.K_r:
                reset()
            if event.type == pygame.MOUSEBUTTONDOWN and state == "playing":
                x, y = event.pos
                col, row = x // CELL, (y - HEADER) // CELL
                if y >= HEADER and 0 <= row < ROWS and 0 <= col < COLS:
                    cell = (row, col)
                    if event.button == 3 and cell not in revealed:
                        if cell in flagged:
                            flagged.remove(cell)
                        else:
                            flagged.add(cell)
                    elif event.button == 1 and cell not in flagged and cell not in revealed:
                        if board is None:
                            board, mines = make_board(cell)
                        reveal(cell)
                        if cell in mines:
                            state = "lost"
                        elif len(revealed) == COLS * ROWS - MINES:
                            state = "won"

        screen.fill(BG)
        if state == "won":
            message = "성공! 모든 안전한 칸을 열었습니다.  R: 새 게임"
        elif state == "lost":
            message = "지뢰를 밟았습니다.  R: 다시 시작"
        else:
            message = "지뢰 찾기  ·  좌클릭: 열기  우클릭: 깃발  R: 새 게임"
        screen.blit(small.render(message, True, INK), (8, 17))

        for row in range(ROWS):
            for col in range(COLS):
                rect = pygame.Rect(col * CELL, HEADER + row * CELL, CELL, CELL)
                cell = (row, col)
                if cell in revealed or (state == "lost" and cell in mines):
                    pygame.draw.rect(screen, REVEALED, rect)
                    value = board[row][col] if board is not None else 0
                    if value == -1:
                        pygame.draw.circle(screen, (190, 55, 48), rect.center, CELL // 5)
                    elif value:
                        text = font.render(str(value), True, NUMBER_COLORS[value])
                        screen.blit(text, text.get_rect(center=rect.center))
                else:
                    pygame.draw.rect(screen, HIDDEN, rect)
                    if cell in flagged:
                        text = font.render("F", True, (190, 55, 48))
                        screen.blit(text, text.get_rect(center=rect.center))
                pygame.draw.rect(screen, (166, 170, 161), rect, 1)

        pygame.display.flip()
        clock.tick(60)


if __name__ == "__main__":
    main()
