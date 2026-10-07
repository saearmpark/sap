"""
STEP 6: 테트리스 (Python + pygame-ce)

game.html의 JavaScript 테트리스와 같은 규칙을 파이썬으로 옮긴 코드입니다.
지금까지 나온 개념(게임 루프, 충돌 처리, 타이머 기반 이동)을 모두 합쳐서
"회전"과 "줄 삭제"까지 추가한, 이 폴더에서 가장 종합적인 STEP입니다.

여기에 더해 실제 테트리스 게임들(테트리오 등)에 흔히 있는 네 가지를 추가했습니다:
  1. 다음 블록 미리보기 (NEXT)
  2. 홀드 기능 (HOLD) — Shift 키로 현재 블록을 보관하고 다음 블록으로 교체
  3. 떨어질 위치 미리 보여주기 (그림자/고스트 블록)
  4. 방향키를 누르고 있으면 빠르게 연속 이동 (DAS, Delayed Auto Shift)

실행 방법:
  python tetris_pygame.py

조작:
  좌우 방향키 — 이동 (누르고 있으면 빠르게 연속 이동)
  위 방향키   — 회전
  아래 방향키 — 빨리 내리기
  스페이스바  — 바로 떨어뜨리기(하드 드롭)
  Shift       — 홀드 (한 블록당 한 번만 가능)
  R 키        — 다시 시작
"""

import sys
import random
import pygame

COLS, ROWS, CELL = 10, 20, 24
SIDE_WIDTH = 140
BOARD_WIDTH, BOARD_HEIGHT = COLS * CELL, ROWS * CELL
WIDTH, HEIGHT = BOARD_WIDTH + SIDE_WIDTH, BOARD_HEIGHT

DROP_INTERVAL_MS = 500  # 블록이 한 칸 자동으로 내려오는 간격
DAS_DELAY_MS = 170      # 방향키를 누른 뒤 "연속 이동"이 시작되기까지 기다리는 시간
DAS_SPEED_MS = 40       # 연속 이동 중 한 칸씩 움직이는 간격

BG_COLOR = (247, 246, 242)
PANEL_BORDER = (226, 224, 216)
TEXT_COLOR = (86, 94, 88)

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


def make_piece(piece_type):
    matrix = SHAPES[piece_type]
    col = (COLS - len(matrix[0])) // 2
    return {"type": piece_type, "matrix": matrix, "row": 0, "col": col}


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


def ghost_row(grid, piece):
    r = piece["row"]
    while not collide(grid, piece["matrix"], r + 1, piece["col"]):
        r += 1
    return r


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


def draw_matrix(screen, matrix, piece_type, origin_x, origin_y, cell):
    color = COLORS[piece_type]
    for r, line in enumerate(matrix):
        for c, filled in enumerate(line):
            if filled:
                rect = (origin_x + c * cell, origin_y + r * cell, cell - 1, cell - 1)
                pygame.draw.rect(screen, color, rect)


def draw_preview_box(screen, font, label, piece_type, box_rect):
    pygame.draw.rect(screen, BG_COLOR, box_rect)
    pygame.draw.rect(screen, PANEL_BORDER, box_rect, 1)

    label_surf = font.render(label, True, TEXT_COLOR)
    screen.blit(label_surf, (box_rect.x, box_rect.y - 18))

    if piece_type:
        matrix = SHAPES[piece_type]
        cell = 16
        w, h = len(matrix[0]) * cell, len(matrix) * cell
        origin_x = box_rect.x + (box_rect.width - w) // 2
        origin_y = box_rect.y + (box_rect.height - h) // 2
        draw_matrix(screen, matrix, piece_type, origin_x, origin_y, cell)


def draw(screen, font, grid, piece, next_type, hold_type, score):
    screen.fill(BG_COLOR)

    for r in range(ROWS):
        for c in range(COLS):
            if grid[r][c]:
                rect = (c * CELL, r * CELL, CELL - 1, CELL - 1)
                pygame.draw.rect(screen, COLORS[grid[r][c]], rect)

    if piece:
        # 그림자(떨어질 위치)를 먼저 반투명하게 그리고, 그 위에 실제 블록을 그린다
        ghost_surface = pygame.Surface((BOARD_WIDTH, BOARD_HEIGHT), pygame.SRCALPHA)
        gr0 = ghost_row(grid, piece)
        for r, line in enumerate(piece["matrix"]):
            for c, filled in enumerate(line):
                if filled:
                    gr, gc = gr0 + r, piece["col"] + c
                    if gr >= 0:
                        color = (*COLORS[piece["type"]], 70)  # 알파 70/255 = 반투명
                        pygame.draw.rect(ghost_surface, color, (gc * CELL, gr * CELL, CELL - 1, CELL - 1))
        screen.blit(ghost_surface, (0, 0))

        draw_matrix(screen, piece["matrix"], piece["type"], piece["col"] * CELL, piece["row"] * CELL, CELL)

    # 오른쪽 사이드 패널: 점수 / HOLD / NEXT
    side_x = BOARD_WIDTH + 16
    score_surf = font.render(f"점수 {score}", True, TEXT_COLOR)
    screen.blit(score_surf, (side_x, 16))

    hold_box = pygame.Rect(side_x, 60, SIDE_WIDTH - 32, 70)
    next_box = pygame.Rect(side_x, 160, SIDE_WIDTH - 32, 70)
    draw_preview_box(screen, font, "HOLD", hold_type, hold_box)
    draw_preview_box(screen, font, "NEXT", next_type, next_box)


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    font = pygame.font.SysFont("arial", 16)
    clock = pygame.time.Clock()

    grid = empty_grid()
    score = 0
    next_type = random.choice(TYPES)
    hold_type = None
    hold_used = False
    piece = None
    running = True
    drop_timer = 0.0

    # ── 보완사항 4: 방향키를 누르고 있으면 빠르게 연속 이동(DAS) ──
    das_dir = 0       # -1(왼쪽), 1(오른쪽), 0(안 누르고 있음)
    das_elapsed = 0.0
    das_repeating = False

    def spawn():
        nonlocal piece, next_type, hold_used
        piece_type, next_type = next_type, random.choice(TYPES)
        piece = make_piece(piece_type)
        hold_used = False  # 새 블록이 나왔으니 이번 블록에서는 다시 홀드를 쓸 수 있다
        return not collide(grid, piece["matrix"], piece["row"], piece["col"])

    def lock_piece():
        nonlocal grid, score, running
        merge(grid, piece)
        score = clear_lines(grid, score)
        if not spawn():
            running = False

    def soft_drop():
        nonlocal piece
        if not collide(grid, piece["matrix"], piece["row"] + 1, piece["col"]):
            piece["row"] += 1
        else:
            lock_piece()

    def hard_drop():
        nonlocal piece
        piece["row"] = ghost_row(grid, piece)
        lock_piece()

    def move_horizontal(d):
        if not collide(grid, piece["matrix"], piece["row"], piece["col"] + d):
            piece["col"] += d

    def try_rotate():
        nonlocal piece
        rotated = rotate(piece["matrix"])
        # 회전했을 때 벽/블록에 부딪히면 좌우로 살짝 밀어서(wall kick) 다시 시도한다
        for offset in (0, -1, 1, -2, 2):
            if not collide(grid, rotated, piece["row"], piece["col"] + offset):
                piece["matrix"] = rotated
                piece["col"] += offset
                return

    def hold_piece():
        nonlocal piece, hold_type, hold_used, next_type, running
        if hold_used:
            return
        current_type = piece["type"]
        if hold_type is None:
            # 홀드 칸이 비어있으면: 지금 블록을 넣어두고, 예정돼 있던 다음 블록을 바로 가져온다
            hold_type = current_type
            piece = make_piece(next_type)
            next_type = random.choice(TYPES)
        else:
            # 홀드 칸에 있던 블록과 지금 블록을 서로 바꾼다
            hold_type, swap_type = current_type, hold_type
            piece = make_piece(swap_type)
        hold_used = True
        if collide(grid, piece["matrix"], piece["row"], piece["col"]):
            running = False

    def reset():
        nonlocal grid, score, next_type, hold_type, hold_used, drop_timer, running, das_dir, das_elapsed, das_repeating
        grid = empty_grid()
        score = 0
        next_type = random.choice(TYPES)
        hold_type = None
        hold_used = False
        drop_timer = 0.0
        running = True
        das_dir = 0
        das_elapsed = 0.0
        das_repeating = False
        spawn()

    reset()

    while True:
        dt = clock.tick(60)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()

            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r:
                    reset()
                    continue

                if not running:
                    continue

                if event.key == pygame.K_LEFT:
                    move_horizontal(-1)
                    das_dir, das_elapsed, das_repeating = -1, 0.0, False
                elif event.key == pygame.K_RIGHT:
                    move_horizontal(1)
                    das_dir, das_elapsed, das_repeating = 1, 0.0, False
                elif event.key == pygame.K_DOWN:
                    soft_drop()
                elif event.key == pygame.K_SPACE:
                    hard_drop()
                elif event.key == pygame.K_UP:
                    try_rotate()
                elif event.key in (pygame.K_LSHIFT, pygame.K_RSHIFT):
                    hold_piece()

            elif event.type == pygame.KEYUP:
                if event.key == pygame.K_LEFT and das_dir == -1:
                    das_dir = 0
                elif event.key == pygame.K_RIGHT and das_dir == 1:
                    das_dir = 0

        if running:
            # DAS: 방향키를 누른 채로 일정 시간이 지나면 빠르게 연속 이동시킨다
            if das_dir != 0:
                das_elapsed += dt
                threshold = DAS_SPEED_MS if das_repeating else DAS_DELAY_MS
                if das_elapsed >= threshold:
                    das_elapsed = 0.0
                    das_repeating = True
                    move_horizontal(das_dir)

            drop_timer += dt
            if drop_timer >= DROP_INTERVAL_MS:
                drop_timer = 0
                soft_drop()

        draw(screen, font, grid, piece, next_type, hold_type, score)
        if running:
            pygame.display.set_caption(f"테트리스 — 점수 {score}")
        else:
            pygame.display.set_caption(f"테트리스 — 게임 오버 점수 {score} (R 키로 재시작)")
        pygame.display.flip()


if __name__ == "__main__":
    main()
