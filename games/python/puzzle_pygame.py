"""
STEP 4: 슬라이딩 퍼즐 (Python + pygame-ce)

game.html의 JavaScript 퍼즐게임과 같은 규칙을 파이썬으로 옮긴 코드입니다.
이번 STEP의 핵심은 그래픽보다 "상태 관리와 저장/불러오기"입니다.
게시판(board.py)에서 DB에 저장하던 것과 달리, 여기서는 JSON 파일 하나에
현재 퍼즐 상태를 저장합니다.

실행 방법:
  python puzzle_pygame.py

조작:
  마우스 클릭 — 빈칸과 붙어있는 칸 이동
  R 키 — 섞기
  S 키 — 저장
  L 키 — 불러오기
"""

import sys
import json
import random
import pygame

SIZE = 4  # 4x4 = 15 퍼즐
CELL = 80
WIDTH = HEIGHT = CELL * SIZE
SAVE_FILE = "puzzle_save.json"

BG_COLOR = (247, 246, 242)
TILE_COLOR = (199, 217, 203)
EMPTY_COLOR = (247, 246, 242)
BORDER_COLOR = (226, 224, 216)
INK_COLOR = (27, 31, 29)

SOLVED = list(range(1, SIZE * SIZE)) + [0]  # [1, 2, ..., 15, 0]


def is_solved(tiles):
    return tiles == SOLVED


def shuffle(tiles):
    tiles = SOLVED[:]
    empty = tiles.index(0)
    for _ in range(300):
        row, col = divmod(empty, SIZE)
        candidates = []
        if row > 0:
            candidates.append(empty - SIZE)
        if row < SIZE - 1:
            candidates.append(empty + SIZE)
        if col > 0:
            candidates.append(empty - 1)
        if col < SIZE - 1:
            candidates.append(empty + 1)

        target = random.choice(candidates)
        tiles[empty], tiles[target] = tiles[target], tiles[empty]
        empty = target
    return tiles


def try_move(tiles, index):
    empty = tiles.index(0)
    row, col = divmod(index, SIZE)
    erow, ecol = divmod(empty, SIZE)
    if abs(row - erow) + abs(col - ecol) == 1:
        tiles[index], tiles[empty] = tiles[empty], tiles[index]
    return tiles


def save(tiles):
    with open(SAVE_FILE, "w", encoding="utf-8") as f:
        json.dump(tiles, f)


def load():
    try:
        with open(SAVE_FILE, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def draw(screen, tiles, font):
    screen.fill(BG_COLOR)
    for i, value in enumerate(tiles):
        row, col = divmod(i, SIZE)
        rect = pygame.Rect(col * CELL, row * CELL, CELL - 4, CELL - 4)
        rect.x += 2
        rect.y += 2

        if value == 0:
            pygame.draw.rect(screen, EMPTY_COLOR, rect)
            pygame.draw.rect(screen, BORDER_COLOR, rect, 1)
        else:
            pygame.draw.rect(screen, TILE_COLOR, rect, border_radius=6)
            text = font.render(str(value), True, INK_COLOR)
            screen.blit(text, text.get_rect(center=rect.center))


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    font = pygame.font.SysFont("arial", 28, bold=True)
    clock = pygame.time.Clock()

    tiles = SOLVED[:]
    message = "R: 섞기 / S: 저장 / L: 불러오기"

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()

            if event.type == pygame.MOUSEBUTTONDOWN:
                x, y = event.pos
                col, row = x // CELL, y // CELL
                tiles = try_move(tiles, row * SIZE + col)
                message = "완성했습니다!" if is_solved(tiles) else "R: 섞기 / S: 저장 / L: 불러오기"

            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r:
                    tiles = shuffle(tiles)
                    message = "R: 섞기 / S: 저장 / L: 불러오기"
                elif event.key == pygame.K_s:
                    save(tiles)
                    message = f"저장했습니다 ({SAVE_FILE})"
                elif event.key == pygame.K_l:
                    loaded = load()
                    if loaded is None:
                        message = "저장된 기록이 없습니다"
                    else:
                        tiles = loaded
                        message = "불러왔습니다"

        draw(screen, tiles, font)
        pygame.display.set_caption(f"슬라이딩 퍼즐 — {message}")
        pygame.display.flip()
        clock.tick(30)


if __name__ == "__main__":
    main()
