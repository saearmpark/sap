"""
STEP 1: 틱택토 (Python + pygame)

게임 화면(game.html)의 JavaScript 버전과 같은 규칙을 파이썬으로 옮긴 코드입니다.
같은 로직을 두 언어로 비교해보면서 "게임 루프", "클릭 좌표를 칸 번호로 바꾸기",
"승리 조건 판별" 같은 개념이 언어가 달라도 똑같이 적용된다는 걸 확인해보세요.

실행 방법:
  pip install pygame
  python tictactoe_pygame.py
"""

import sys
import pygame

# ── 화면/보드 설정 ───────────────────────────────
CELL_SIZE = 120
GRID_SIZE = 3
WIDTH = HEIGHT = CELL_SIZE * GRID_SIZE
LINE_WIDTH = 4

BG_COLOR = (247, 246, 242)      # style.css의 --bg 와 동일한 톤
LINE_COLOR = (226, 224, 216)    # --border
O_COLOR = (63, 102, 80)         # --accent
X_COLOR = (27, 31, 29)          # --ink

WIN_LINES = [
    (0, 1, 2), (3, 4, 5), (6, 7, 8),  # 가로
    (0, 3, 6), (1, 4, 7), (2, 5, 8),  # 세로
    (0, 4, 8), (2, 4, 6),             # 대각선
]


def check_winner(cells):
    for a, b, c in WIN_LINES:
        if cells[a] and cells[a] == cells[b] == cells[c]:
            return cells[a]
    if all(cells):
        return "draw"
    return None


def draw_board(screen, cells):
    screen.fill(BG_COLOR)

    # 칸 구분선
    for i in range(1, GRID_SIZE):
        pygame.draw.line(screen, LINE_COLOR, (i * CELL_SIZE, 0), (i * CELL_SIZE, HEIGHT), LINE_WIDTH)
        pygame.draw.line(screen, LINE_COLOR, (0, i * CELL_SIZE), (WIDTH, i * CELL_SIZE), LINE_WIDTH)

    font = pygame.font.SysFont("arial", 64, bold=True)
    for i, value in enumerate(cells):
        if value is None:
            continue
        row, col = divmod(i, GRID_SIZE)
        color = O_COLOR if value == "O" else X_COLOR
        text = font.render(value, True, color)
        rect = text.get_rect(center=(col * CELL_SIZE + CELL_SIZE // 2, row * CELL_SIZE + CELL_SIZE // 2))
        screen.blit(text, rect)


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("틱택토 — codestudio")
    clock = pygame.time.Clock()

    cells = [None] * 9
    current = "O"
    winner = None

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()

            if event.type == pygame.MOUSEBUTTONDOWN and winner is None:
                x, y = event.pos
                col, row = x // CELL_SIZE, y // CELL_SIZE
                index = row * GRID_SIZE + col

                if cells[index] is None:
                    cells[index] = current
                    winner = check_winner(cells)
                    if winner is None:
                        current = "X" if current == "O" else "O"

            if event.type == pygame.KEYDOWN and event.key == pygame.K_r:
                # R 키로 다시 시작
                cells = [None] * 9
                current = "O"
                winner = None

        draw_board(screen, cells)

        if winner:
            label = "무승부!" if winner == "draw" else f"{winner} 승리!"
            pygame.display.set_caption(f"틱택토 — {label} (R 키로 재시작)")
        else:
            pygame.display.set_caption(f"틱택토 — {current} 차례")

        pygame.display.flip()
        clock.tick(30)


if __name__ == "__main__":
    main()
