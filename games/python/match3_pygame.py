"""
STEP 47: 보석 맞추기 (Python + pygame-ce)

game.html의 JavaScript "보석 맞추기"와 같은 규칙을 파이썬으로 옮긴 코드입니다.
격자에서 "가로나 세로로 같은 보석이 3개 이상 연속으로 놓인 곳"을 찾아 지우고,
위에서 새 보석이 떨어져 다시 채워지는 연쇄를 반복합니다. 매치 3 게임의 핵심은
① 연속 찾기(find_matches) ② 지우고 아래로 내리기(collapse)
③ 빈 칸 위에서 채우기 ④ 연쇄가 끝날 때까지 반복(resolve)입니다.

실행 방법:
  pip install pygame
  python match3_pygame.py

조작: 보석 클릭 -> 이웃한 보석 클릭으로 자리 교환 / R 키로 다시 시작
"""

import math
import random
import sys

import pygame

SIZE = 8                 # 8x8 격자
CELL = 64
BOARD_PX = CELL * SIZE
MARGIN = 20
HUD_HEIGHT = 76
WIDTH = BOARD_PX + MARGIN * 2
HEIGHT = BOARD_PX + HUD_HEIGHT + MARGIN
START_MOVES = 25

BG_COLOR = (247, 246, 242)      # assets/style.css의 --bg 와 같은 톤
BOARD_COLOR = (226, 224, 216)   # --border
TEXT_COLOR = (86, 94, 88)
SELECT_COLOR = (63, 102, 80)    # --accent

FONT_NAMES = "malgungothic,malgun gothic,nanumgothic,arial"

# 보석 6종: (색, 도형) — 색만으로 구분하지 않도록 도형도 함께 다르게 그립니다.
GEMS = [
    ((199, 62, 62), "circle"),
    ((122, 74, 160), "square"),
    ((224, 181, 67), "triangle"),
    ((214, 122, 45), "diamond"),
    ((87, 156, 92), "pentagon"),
    ((76, 131, 209), "star"),
]


def new_grid():
    """처음부터 3개가 연속되지 않도록 칸을 하나씩 채웁니다."""
    grid = [[0] * SIZE for _ in range(SIZE)]
    for r in range(SIZE):
        for c in range(SIZE):
            choices = list(range(len(GEMS)))
            if c >= 2 and grid[r][c - 1] == grid[r][c - 2]:
                choices = [t for t in choices if t != grid[r][c - 1]]
            if r >= 2 and grid[r - 1][c] == grid[r - 2][c]:
                choices = [t for t in choices if t != grid[r - 1][c]]
            grid[r][c] = random.choice(choices)
    return grid


def find_matches(grid):
    """가로/세로로 3개 이상 연속인 칸의 좌표 집합을 돌려줍니다."""
    marks = set()
    for r in range(SIZE):
        run = 1
        for c in range(1, SIZE + 1):
            if c < SIZE and grid[r][c] is not None and grid[r][c] == grid[r][c - 1]:
                run += 1
            else:
                if run >= 3:
                    for k in range(c - run, c):
                        marks.add((r, k))
                run = 1
    for c in range(SIZE):
        run = 1
        for r in range(1, SIZE + 1):
            if r < SIZE and grid[r][c] is not None and grid[r][c] == grid[r - 1][c]:
                run += 1
            else:
                if run >= 3:
                    for k in range(r - run, r):
                        marks.add((k, c))
                run = 1
    return marks


def has_move(grid):
    """아무 이웃한 두 칸을 바꿔봤을 때 3개가 만들어지는 조합이 있는지 검사합니다."""
    for r in range(SIZE):
        for c in range(SIZE):
            if c + 1 < SIZE:
                grid[r][c], grid[r][c + 1] = grid[r][c + 1], grid[r][c]
                ok = bool(find_matches(grid))
                grid[r][c], grid[r][c + 1] = grid[r][c + 1], grid[r][c]
                if ok:
                    return True
            if r + 1 < SIZE:
                grid[r][c], grid[r + 1][c] = grid[r + 1][c], grid[r][c]
                ok = bool(find_matches(grid))
                grid[r][c], grid[r + 1][c] = grid[r + 1][c], grid[r][c]
                if ok:
                    return True
    return False


def collapse(grid):
    """각 열에서 살아남은 보석을 아래로 내리고, 남은 위쪽 칸을 새 보석으로 채웁니다."""
    for c in range(SIZE):
        write = SIZE - 1
        for r in range(SIZE - 1, -1, -1):
            if grid[r][c] is not None:
                if write != r:
                    grid[write][c] = grid[r][c]
                    grid[r][c] = None
                write -= 1
        for r in range(write, -1, -1):
            grid[r][c] = random.randint(0, len(GEMS) - 1)


def resolve(grid):
    """연속을 지우고 채우는 것을 더 이상 맞출 것이 없을 때까지 반복합니다.

    돌려주는 값: (이번에 얻은 점수, 연쇄 횟수)
    """
    gained = 0
    combo = 0
    while True:
        marks = find_matches(grid)
        if not marks:
            break
        combo += 1
        gained += len(marks) * 10 * combo
        for r, c in marks:
            grid[r][c] = None
        collapse(grid)
    return gained, combo


def gem_polygon(cx, cy, radius, sides, rotation=0.0):
    points = []
    for i in range(sides):
        angle = rotation + i * (2 * math.pi / sides) - math.pi / 2
        points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    return points


def draw_gem(screen, type_index, x, y, size):
    color, shape = GEMS[type_index]
    cx, cy = x + size // 2, y + size // 2
    radius = size // 2 - 6
    if shape == "circle":
        pygame.draw.circle(screen, color, (cx, cy), radius)
    elif shape == "square":
        pygame.draw.rect(screen, color, (x + 8, y + 8, size - 16, size - 16), border_radius=6)
    elif shape == "triangle":
        pygame.draw.polygon(screen, color, [(cx, cy - radius), (cx - radius, cy + radius), (cx + radius, cy + radius)])
    elif shape == "diamond":
        pygame.draw.polygon(screen, color, [(cx, cy - radius), (cx + radius, cy), (cx, cy + radius), (cx - radius, cy)])
    elif shape == "pentagon":
        pygame.draw.polygon(screen, color, gem_polygon(cx, cy, radius, 5))
    elif shape == "star":
        points = []
        for i in range(10):
            r = radius if i % 2 == 0 else radius * 0.45
            angle = -math.pi / 2 + i * math.pi / 5
            points.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
        pygame.draw.polygon(screen, color, points)


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("보석 맞추기 — 사피엔스")
    hud_font = pygame.font.SysFont(FONT_NAMES, 20, bold=True)
    status_font = pygame.font.SysFont(FONT_NAMES, 15)
    clock = pygame.time.Clock()

    board_x, board_y = MARGIN, HUD_HEIGHT

    def fresh_grid():
        grid = new_grid()
        while not has_move(grid):
            grid = new_grid()
        return grid

    grid = fresh_grid()
    selected = None
    score = 0
    moves_left = START_MOVES
    message = "보석을 눌러 이웃한 보석과 자리를 바꾸세요. 세 개 이상 맞추면 사라집니다."

    def restart():
        nonlocal grid, selected, score, moves_left, message
        grid = fresh_grid()
        selected = None
        score = 0
        moves_left = START_MOVES
        message = "새 게임! 25번의 이동 안에 최고 점수에 도전하세요."

    def cell_at(pos):
        x, y = pos
        if board_x <= x < board_x + BOARD_PX and board_y <= y < board_y + BOARD_PX:
            return (y - board_y) // CELL, (x - board_x) // CELL
        return None

    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_r:
                restart()
            elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1 and moves_left > 0:
                cell = cell_at(event.pos)
                if cell is None:
                    continue
                r, c = cell
                if selected is None:
                    selected = (r, c)
                elif selected == (r, c):
                    selected = None
                elif abs(selected[0] - r) + abs(selected[1] - c) == 1:
                    sr, sc = selected
                    selected = None
                    grid[sr][sc], grid[r][c] = grid[r][c], grid[sr][sc]
                    if not find_matches(grid):
                        grid[sr][sc], grid[r][c] = grid[r][c], grid[sr][sc]
                        message = "그 방향으로는 세 개를 맞출 수 없어요."
                    else:
                        moves_left -= 1
                        gained, combo = resolve(grid)
                        score += gained
                        if not has_move(grid):
                            grid = fresh_grid()
                            message = "맞출 조합이 없어 보드를 섞었습니다."
                        elif combo >= 2:
                            message = f"연쇄 {combo}콤보! +{gained}점"
                        else:
                            message = f"+{gained}점"
                else:
                    selected = (r, c)

        # ── 그리기 ──
        screen.fill(BG_COLOR)
        screen.blit(hud_font.render(f"점수 {score}", True, TEXT_COLOR), (MARGIN, 14))
        screen.blit(hud_font.render(f"남은 이동 {moves_left}", True, TEXT_COLOR), (MARGIN + 170, 14))
        status = "이동을 모두 사용했습니다. R 키로 다시 시작하세요." if moves_left <= 0 else message
        screen.blit(status_font.render(status, True, TEXT_COLOR), (MARGIN, 46))

        pygame.draw.rect(screen, BOARD_COLOR, (board_x, board_y, BOARD_PX, BOARD_PX), border_radius=10)
        for r in range(SIZE):
            for c in range(SIZE):
                x = board_x + c * CELL
                y = board_y + r * CELL
                if selected == (r, c):
                    pygame.draw.rect(screen, SELECT_COLOR, (x + 2, y + 2, CELL - 4, CELL - 4), border_radius=8)
                value = grid[r][c]
                if value is not None:
                    draw_gem(screen, value, x, y, CELL)

        pygame.display.flip()
        clock.tick(60)

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
