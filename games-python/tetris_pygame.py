"""
STEP 6: 테트리스 (Python + pygame-ce)

game.html의 JavaScript 테트리스와 같은 규칙을 파이썬으로 옮긴 코드입니다.
지금까지 나온 개념(게임 루프, 충돌 처리, 타이머 기반 이동)을 모두 합쳐서
"회전"과 "줄 삭제"까지 추가한, 이 폴더에서 가장 종합적인 STEP입니다.

실행 방법:
  python tetris_pygame.py

조작:
  좌우 방향키 — 이동
  위 방향키   — 회전
  아래 방향키 — 빨리 내리기
  스페이스바  — 바로 떨어뜨리기(하드 드롭)
  R 키        — 다시 시작
"""

import sys
import random
import pygame

COLS, ROWS, CELL = 10, 20, 24
WIDTH, HEIGHT = COLS * CELL, ROWS * CELL
DROP_INTERVAL_MS = 500  # 블록이 한 칸 자동으로 내려오는 간격

BG_COLOR = (247, 246, 242)

# 블록 모양: 0/1로 채운 2차원 리스트. 1이 채워진 칸입니다.
SHAPES = {
    "I": [[1, 1, 1, 1]],
    "O": [[1, 1], [1, 1]],
    "T": [[0, 1, 0], [1, 1, 1]],
    "S": [[0, 1, 1], [1, 1, 0]],
    "Z": [[1, 1, 0], [0, 1, 1]],
    "J": [[1, 0, 0], [1, 1, 1]],
    "L": [[0, 0, 1], [1, 1, 1]],
}
COLORS = {
    "I": (63, 102, 80),
    "O": (27, 31, 29),
    "T": (138, 168, 154),
    "S": (199, 217, 203),
    "Z": (86, 94, 88),
    "J": (47, 74, 58),
    "L": (159, 184, 168),
}
TYPES = list(SHAPES.keys())


def rotate(matrix):
    """2차원 리스트를 시계 방향으로 90도 돌립니다 (열을 행으로, 순서를 뒤집어서)."""
    return [list(row) for row in zip(*matrix[::-1])]


def empty_grid():
    return [[None for _ in range(COLS)] for _ in range(ROWS)]


def collide(grid, matrix, row, col):
    for r, line in enumerate(matrix):
        for c, filled in enumerate(line):
            if not filled:
                continue
            gr, gc = row + r, col + c
            if gc < 0 or gc >= COLS or gr >= ROWS:
                return True
            if gr >= 0 and grid[gr][gc]:
                return True
    return False


def spawn(grid):
    piece_type = random.choice(TYPES)
    matrix = SHAPES[piece_type]
    col = (COLS - len(matrix[0])) // 2
    piece = {"type": piece_type, "matrix": matrix, "row": 0, "col": col}
    game_over = collide(grid, matrix, 0, col)
    return piece, game_over


def merge(grid, piece):
    for r, line in enumerate(piece["matrix"]):
        for c, filled in enumerate(line):
            if filled:
                gr, gc = piece["row"] + r, piece["col"] + c
                if gr >= 0:
                    grid[gr][gc] = piece["type"]


def clear_lines(grid, score):
    cleared = 0
    r = ROWS - 1
    while r >= 0:
        if all(grid[r]):
            del grid[r]
            grid.insert(0, [None] * COLS)
            cleared += 1
            r += 1  # 위 줄이 내려왔으므로 같은 자리를 다시 검사
        r -= 1

    bonus = [0, 100, 300, 500, 800]
    score += bonus[cleared] if cleared <= 4 else cleared * 200
    return score


def draw(screen, grid, piece):
    screen.fill(BG_COLOR)

    for r in range(ROWS):
        for c in range(COLS):
            if grid[r][c]:
                rect = (c * CELL, r * CELL, CELL - 1, CELL - 1)
                pygame.draw.rect(screen, COLORS[grid[r][c]], rect)

    if piece:
        for r, line in enumerate(piece["matrix"]):
            for c, filled in enumerate(line):
                if filled:
                    gr, gc = piece["row"] + r, piece["col"] + c
                    if gr >= 0:
                        rect = (gc * CELL, gr * CELL, CELL - 1, CELL - 1)
                        pygame.draw.rect(screen, COLORS[piece["type"]], rect)


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    clock = pygame.time.Clock()

    grid = empty_grid()
    score = 0
    piece, _ = spawn(grid)
    running = True
    drop_timer = 0.0

    def lock_piece():
        nonlocal grid, score, piece, running
        merge(grid, piece)
        score = clear_lines(grid, score)
        piece, game_over = spawn(grid)
        if game_over:
            running = False

    def soft_drop():
        nonlocal piece
        if not collide(grid, piece["matrix"], piece["row"] + 1, piece["col"]):
            piece["row"] += 1
        else:
            lock_piece()

    while True:
        dt = clock.tick(60)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()

            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r:
                    grid = empty_grid()
                    score = 0
                    piece, _ = spawn(grid)
                    running = True
                    drop_timer = 0.0

                if running:
                    if event.key == pygame.K_LEFT and not collide(grid, piece["matrix"], piece["row"], piece["col"] - 1):
                        piece["col"] -= 1
                    elif event.key == pygame.K_RIGHT and not collide(grid, piece["matrix"], piece["row"], piece["col"] + 1):
                        piece["col"] += 1
                    elif event.key == pygame.K_DOWN:
                        soft_drop()
                    elif event.key == pygame.K_SPACE:
                        while not collide(grid, piece["matrix"], piece["row"] + 1, piece["col"]):
                            piece["row"] += 1
                        lock_piece()
                    elif event.key == pygame.K_UP:
                        rotated = rotate(piece["matrix"])
                        # 회전했을 때 벽/블록에 부딪히면 좌우로 살짝 밀어서(wall kick) 다시 시도한다
                        for offset in (0, -1, 1, -2, 2):
                            if not collide(grid, rotated, piece["row"], piece["col"] + offset):
                                piece["matrix"] = rotated
                                piece["col"] += offset
                                break

        if running:
            drop_timer += dt
            if drop_timer >= DROP_INTERVAL_MS:
                drop_timer = 0
                soft_drop()

        draw(screen, grid, piece)
        if running:
            pygame.display.set_caption(f"테트리스 — 점수 {score}")
        else:
            pygame.display.set_caption(f"테트리스 — 게임 오버 점수 {score} (R 키로 재시작)")
        pygame.display.flip()


if __name__ == "__main__":
    main()
