"""
STEP 5: 스네이크 (Python + pygame-ce)

game.html의 JavaScript 스네이크와 같은 규칙을 파이썬으로 옮긴 코드입니다.
이전 STEP들이 매 프레임(초당 60번)마다 갱신했다면, 스네이크는 "일정한 간격마다
한 칸씩" 움직입니다. 그래서 화면을 그리는 빈도(clock.tick)와 뱀이 움직이는
빈도(move_timer)를 서로 다르게 따로 관리하는 것이 이번 STEP의 핵심입니다.

실행 방법:
  python snake_pygame.py

조작: 방향키로 이동 / R 키로 다시 시작
"""

import sys
import random
import pygame

CELL = 20
COLS, ROWS = 20, 20
WIDTH, HEIGHT = CELL * COLS, CELL * ROWS
MOVE_INTERVAL_MS = 120  # 뱀이 한 칸 움직이는 간격 (밀리초)

BG_COLOR = (247, 246, 242)
SNAKE_COLOR = (27, 31, 29)
FOOD_COLOR = (63, 102, 80)


def random_food(snake):
    while True:
        pos = (random.randrange(COLS), random.randrange(ROWS))
        if pos not in snake:
            return pos


def new_game():
    snake = [(10, 10), (9, 10), (8, 10)]  # 머리가 리스트의 맨 앞(인덱스 0)
    direction = (1, 0)
    food = random_food(snake)
    return snake, direction, food, 0  # snake, direction, food, score


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    clock = pygame.time.Clock()

    snake, direction, food, score = new_game()
    next_direction = direction
    running = True
    move_timer = 0.0

    while True:
        dt = clock.tick(60)  # 화면은 초당 60번 그리지만, 뱀은 아래에서 따로 움직인다

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()

            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r:
                    snake, direction, food, score = new_game()
                    next_direction = direction
                    running = True

                key_to_dir = {
                    pygame.K_UP: (0, -1),
                    pygame.K_DOWN: (0, 1),
                    pygame.K_LEFT: (-1, 0),
                    pygame.K_RIGHT: (1, 0),
                }
                if event.key in key_to_dir and running:
                    new_dir = key_to_dir[event.key]
                    # 반대 방향으로 즉시 꺾어서 자기 몸으로 바로 들어가는 것을 막는다
                    if (new_dir[0], new_dir[1]) != (-direction[0], -direction[1]):
                        next_direction = new_dir

        if running:
            move_timer += dt
            if move_timer >= MOVE_INTERVAL_MS:
                move_timer = 0
                direction = next_direction
                head_x, head_y = snake[0]
                new_head = (head_x + direction[0], head_y + direction[1])

                hit_wall = not (0 <= new_head[0] < COLS and 0 <= new_head[1] < ROWS)
                hit_self = new_head in snake

                if hit_wall or hit_self:
                    running = False
                else:
                    snake.insert(0, new_head)
                    if new_head == food:
                        score += 10
                        food = random_food(snake)
                    else:
                        snake.pop()

        screen.fill(BG_COLOR)
        fx, fy = food
        pygame.draw.rect(screen, FOOD_COLOR, (fx * CELL, fy * CELL, CELL - 1, CELL - 1))
        for sx, sy in snake:
            pygame.draw.rect(screen, SNAKE_COLOR, (sx * CELL, sy * CELL, CELL - 1, CELL - 1))

        if running:
            pygame.display.set_caption(f"스네이크 — 점수 {score}")
        else:
            pygame.display.set_caption(f"스네이크 — 게임 오버 점수 {score} (R 키로 재시작)")

        pygame.display.flip()


if __name__ == "__main__":
    main()
