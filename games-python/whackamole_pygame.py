"""
STEP 8: 두더지 잡기 (Python + pygame-ce)

game.html의 JavaScript 두더지 잡기와 같은 규칙을 파이썬으로 옮긴 코드입니다.
지금까지(STEP 1~7)는 전부 키보드(방향키 등)로 조작했지만, 이 게임은 마우스
클릭(= 웹 버전에서는 화면 탭)만으로 플레이합니다. 그래서 핵심 로직은
"여러 개의 타이머를 동시에 관리하기"입니다 — 구멍마다 "언제 두더지가
올라왔고 언제 다시 내려가야 하는지"를 각각 따로 기억해야 합니다.

실행 방법:
  python whackamole_pygame.py

조작: 마우스 클릭으로 두더지 잡기 / R 키로 다시 시작
"""

import sys
import random
import pygame

COLS, ROWS = 3, 3
HOLE_COUNT = COLS * ROWS
CELL = 110
WIDTH, HEIGHT = CELL * COLS, CELL * ROWS
GAME_DURATION_MS = 30000  # 제한 시간 30초

BG_COLOR = (247, 246, 242)
HOLE_COLOR = (226, 224, 216)
MOLE_COLOR = (63, 102, 80)
HIT_COLOR = (27, 31, 29)
TEXT_COLOR = (86, 94, 88)


def hole_center(i):
    r, c = divmod(i, COLS)
    return c * CELL + CELL // 2, r * CELL + CELL // 2


def mole_visible_ms(elapsed):
    """시간이 지날수록 두더지가 더 짧게 나타난다 (900ms -> 최소 350ms)."""
    progress = min(1.0, elapsed / GAME_DURATION_MS)
    return round(900 - progress * 550)


def spawn_interval_ms(elapsed):
    """시간이 지날수록 두더지가 더 자주 나타난다 (900ms 간격 -> 최소 450ms)."""
    progress = min(1.0, elapsed / GAME_DURATION_MS)
    return round(900 - progress * 450)


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    font = pygame.font.SysFont("arial", 20)
    clock = pygame.time.Clock()

    # 구멍마다의 상태: up_until이 현재 시각보다 크면 두더지가 올라와 있는 것
    up_until = [0] * HOLE_COUNT
    hit_flash = [0] * HOLE_COUNT  # 맞췄을 때 잠깐 어두운 색으로 표시하기 위한 타이머

    score = 0
    running = True
    started_at = pygame.time.get_ticks()
    next_spawn_at = started_at

    def reset():
        nonlocal up_until, hit_flash, score, running, started_at, next_spawn_at
        up_until = [0] * HOLE_COUNT
        hit_flash = [0] * HOLE_COUNT
        score = 0
        running = True
        started_at = pygame.time.get_ticks()
        next_spawn_at = started_at

    while True:
        now = pygame.time.get_ticks()
        elapsed = now - started_at

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()

            if event.type == pygame.KEYDOWN and event.key == pygame.K_r:
                reset()

            if event.type == pygame.MOUSEBUTTONDOWN and running:
                mx, my = event.pos
                col, row = mx // CELL, my // CELL
                if 0 <= col < COLS and 0 <= row < ROWS:
                    i = row * COLS + col
                    if up_until[i] > now:  # 두더지가 올라와 있을 때만 점수
                        up_until[i] = 0
                        hit_flash[i] = now + 120
                        score += 1

        if running:
            if elapsed >= GAME_DURATION_MS:
                running = False
            elif now >= next_spawn_at:
                empty = [i for i in range(HOLE_COUNT) if up_until[i] <= now]
                if empty:
                    i = random.choice(empty)
                    up_until[i] = now + mole_visible_ms(elapsed)
                next_spawn_at = now + spawn_interval_ms(elapsed)

        # ── 그리기 ──
        screen.fill(BG_COLOR)
        for i in range(HOLE_COUNT):
            cx, cy = hole_center(i)
            radius = CELL // 2 - 10

            if hit_flash[i] > now:
                color = HIT_COLOR
            elif up_until[i] > now:
                color = MOLE_COLOR
            else:
                color = None

            pygame.draw.circle(screen, HOLE_COLOR, (cx, cy), radius, 2)  # 빈 구멍(테두리만)
            if color:
                pygame.draw.circle(screen, color, (cx, cy), radius - 6)

        if running:
            remaining = max(0, (GAME_DURATION_MS - elapsed) // 1000 + 1)
            status = f"남은 시간 {remaining}초 · 점수 {score}"
        else:
            status = f"게임 종료 · 최종 점수 {score} (R 키로 재시작)"
        screen.blit(font.render(status, True, TEXT_COLOR), (10, HEIGHT - 26))

        pygame.display.set_caption("두더지 잡기")
        pygame.display.flip()
        clock.tick(60)


if __name__ == "__main__":
    main()
