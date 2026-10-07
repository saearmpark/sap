"""
STEP 2: 벽돌깨기 (Python + pygame-ce)

game.html의 JavaScript 벽돌깨기와 같은 규칙을 파이썬으로 옮긴 코드입니다.
틱택토와 달리 화면이 계속 움직이기 때문에 "매 프레임마다 갱신 → 그리기"를 반복하는
게임 루프와 충돌 처리가 핵심입니다.

실행 방법:
  python breakout_pygame.py

조작: 마우스 또는 좌우 방향키 / R 키로 다시 시작
"""

import sys
import pygame

WIDTH, HEIGHT = 480, 320
ROWS, COLS = 4, 8
BRICK_W, BRICK_H, GAP, TOP = 50, 16, 8, 30
LEFT = (WIDTH - (COLS * BRICK_W + (COLS - 1) * GAP)) // 2

BG_COLOR = (247, 246, 242)
BRICK_COLOR = (63, 102, 80)
INK_COLOR = (27, 31, 29)


def new_game():
    bricks = [
        pygame.Rect(LEFT + c * (BRICK_W + GAP), TOP + r * (BRICK_H + GAP), BRICK_W, BRICK_H)
        for r in range(ROWS)
        for c in range(COLS)
    ]
    paddle = pygame.Rect(WIDTH // 2 - 40, HEIGHT - 30, 80, 10)
    ball = {"x": WIDTH / 2, "y": HEIGHT - 40.0, "dx": 3.0, "dy": -3.0, "r": 6}
    return bricks, paddle, ball, 0, 3  # bricks, paddle, ball, score, lives


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    clock = pygame.time.Clock()

    bricks, paddle, ball, score, lives = new_game()
    state = "playing"  # playing / win / over

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.MOUSEMOTION:
                paddle.centerx = event.pos[0]
            if event.type == pygame.KEYDOWN and event.key == pygame.K_r:
                bricks, paddle, ball, score, lives = new_game()
                state = "playing"

        if state == "playing":
            keys = pygame.key.get_pressed()
            if keys[pygame.K_LEFT]:
                paddle.x -= 6
            if keys[pygame.K_RIGHT]:
                paddle.x += 6
            paddle.clamp_ip(screen.get_rect())

            # 공 이동
            ball["x"] += ball["dx"]
            ball["y"] += ball["dy"]
            r = ball["r"]

            # 벽 충돌
            if ball["x"] - r < 0 or ball["x"] + r > WIDTH:
                ball["dx"] *= -1
            if ball["y"] - r < 0:
                ball["dy"] *= -1

            ball_rect = pygame.Rect(ball["x"] - r, ball["y"] - r, r * 2, r * 2)

            # 패들 충돌: 맞은 위치에 따라 튕기는 각도를 바꾼다
            if ball["dy"] > 0 and ball_rect.colliderect(paddle):
                hit = (ball["x"] - paddle.centerx) / (paddle.width / 2)  # -1 ~ 1
                ball["dx"] = hit * 4
                ball["dy"] = -abs(ball["dy"])

            # 벽돌 충돌
            for brick in bricks:
                if ball_rect.colliderect(brick):
                    bricks.remove(brick)
                    ball["dy"] *= -1
                    score += 10
                    break

            # 바닥에 떨어짐
            if ball["y"] - r > HEIGHT:
                lives -= 1
                if lives <= 0:
                    state = "over"
                else:
                    ball.update(x=WIDTH / 2, y=HEIGHT - 40.0, dx=3.0, dy=-3.0)

            if not bricks:
                state = "win"

        # 그리기
        screen.fill(BG_COLOR)
        for brick in bricks:
            pygame.draw.rect(screen, BRICK_COLOR, brick)
        pygame.draw.rect(screen, INK_COLOR, paddle)
        pygame.draw.circle(screen, INK_COLOR, (int(ball["x"]), int(ball["y"])), ball["r"])

        if state == "playing":
            pygame.display.set_caption(f"벽돌깨기 — 점수 {score} · 목숨 {lives}")
        elif state == "win":
            pygame.display.set_caption(f"벽돌깨기 — 승리! 점수 {score} (R 키로 재시작)")
        else:
            pygame.display.set_caption(f"벽돌깨기 — 게임 오버 점수 {score} (R 키로 재시작)")

        pygame.display.flip()
        clock.tick(60)


if __name__ == "__main__":
    main()
