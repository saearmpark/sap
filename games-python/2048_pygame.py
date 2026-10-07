"""
STEP 7: 2048 (Python + pygame-ce)

game.html의 JavaScript 2048과 같은 규칙을 파이썬으로 옮긴 코드입니다.
지금까지(틱택토~테트리스)는 블록이나 공이 "떨어지는" 게임이었다면, 2048은
방향키를 누르는 순간 4×4 격자 전체가 그 방향으로 한꺼번에 밀리면서 같은 숫자끼리
합쳐지는 방식입니다. 그래서 핵심은 게임 루프가 아니라 "격자를 한 방향으로
압축하고 병합하는 로직"입니다.

실행 방법:
  python 2048_pygame.py

조작: 방향키로 밀기 / R 키로 다시 시작
"""

import sys
import random
import pygame

SIZE = 4
CELL = 90
WIDTH = HEIGHT = CELL * SIZE

BG_COLOR = (247, 246, 242)
BORDER_COLOR = (226, 224, 216)
INK_COLOR = (27, 31, 29)
LIGHT_TEXT = (247, 246, 242)

# 타일 값이 커질수록 점점 진한 색으로 — 2는 가장 연하고, 2048에 가까울수록 진하다
TILE_COLORS = {
    2: (238, 241, 234), 4: (221, 230, 221), 8: (199, 217, 203), 16: (174, 202, 179),
    32: (138, 168, 154), 64: (111, 148, 132), 128: (63, 102, 80), 256: (47, 74, 58),
    512: (35, 80, 56), 1024: (23, 51, 42), 2048: (27, 31, 29),
}


def empty_grid():
    return [[0] * SIZE for _ in range(SIZE)]


def empty_cells(grid):
    return [(r, c) for r in range(SIZE) for c in range(SIZE) if grid[r][c] == 0]


def add_random_tile(grid):
    cells = empty_cells(grid)
    if not cells:
        return
    r, c = random.choice(cells)
    grid[r][c] = 2 if random.random() < 0.9 else 4  # 10% 확률로 4가 나온다


def slide_row_left(row):
    """한 줄(왼쪽 기준)을 압축하고, 같은 값이 연속으로 붙어 있으면 한 번만 합친다.
    예: [2,2,4,0] -> 압축 [2,2,4] -> 병합 [4,4] -> 4칸으로 채움 [4,4,0,0]
    """
    filtered = [v for v in row if v != 0]
    merged = []
    gained = 0

    i = 0
    while i < len(filtered):
        if i < len(filtered) - 1 and filtered[i] == filtered[i + 1]:
            value = filtered[i] * 2
            merged.append(value)
            gained += value
            i += 2  # 합쳐진 다음 칸은 건너뛴다
        else:
            merged.append(filtered[i])
            i += 1

    merged += [0] * (SIZE - len(merged))
    moved = merged != row
    return merged, gained, moved


def transpose(grid):
    return [list(row) for row in zip(*grid)]


def reverse_rows(grid):
    return [row[::-1] for row in grid]


def transform_in(grid, direction):
    if direction == "up":
        return transpose(grid)
    if direction == "down":
        return reverse_rows(transpose(grid))
    if direction == "right":
        return reverse_rows(grid)
    return grid  # left


def transform_out(grid, direction):
    if direction == "up":
        return transpose(grid)
    if direction == "down":
        return transpose(reverse_rows(grid))
    if direction == "right":
        return reverse_rows(grid)
    return grid  # left


def slide(grid, direction):
    transformed = transform_in(grid, direction)
    moved = False
    gained = 0
    result = []
    for row in transformed:
        new_row, row_gained, row_moved = slide_row_left(row)
        if row_moved:
            moved = True
        gained += row_gained
        result.append(new_row)
    return transform_out(result, direction), moved, gained


def has_moves_left(grid):
    return any(slide(grid, d)[1] for d in ("left", "right", "up", "down"))


def draw(screen, font, grid):
    screen.fill(BG_COLOR)
    for r in range(SIZE):
        for c in range(SIZE):
            value = grid[r][c]
            rect = (c * CELL + 4, r * CELL + 4, CELL - 8, CELL - 8)
            color = TILE_COLORS.get(value, (15, 18, 16)) if value else BORDER_COLOR
            pygame.draw.rect(screen, color, rect)

            if value:
                text_color = INK_COLOR if value <= 8 else LIGHT_TEXT
                text = font.render(str(value), True, text_color)
                screen.blit(text, text.get_rect(center=(c * CELL + CELL // 2, r * CELL + CELL // 2)))


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    font = pygame.font.SysFont("arial", 26, bold=True)
    clock = pygame.time.Clock()

    grid = empty_grid()
    add_random_tile(grid)
    add_random_tile(grid)
    score = 0
    running = True

    key_to_dir = {
        pygame.K_LEFT: "left",
        pygame.K_RIGHT: "right",
        pygame.K_UP: "up",
        pygame.K_DOWN: "down",
    }

    while True:
        clock.tick(60)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()

            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r:
                    grid = empty_grid()
                    add_random_tile(grid)
                    add_random_tile(grid)
                    score = 0
                    running = True

                elif running and event.key in key_to_dir:
                    new_grid, moved, gained = slide(grid, key_to_dir[event.key])
                    if moved:
                        grid = new_grid
                        score += gained
                        add_random_tile(grid)
                        if not has_moves_left(grid):
                            running = False

        draw(screen, font, grid)
        if running:
            pygame.display.set_caption(f"2048 — 점수 {score}")
        else:
            pygame.display.set_caption(f"2048 — 게임 오버 점수 {score} (R 키로 재시작)")
        pygame.display.flip()


if __name__ == "__main__":
    main()
