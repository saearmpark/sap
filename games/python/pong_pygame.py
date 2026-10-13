"""Two-player Pong. Run with: python pong_pygame.py"""

import sys

import pygame

WIDTH, HEIGHT = 800, 500
PADDLE_W, PADDLE_H = 14, 90
BALL_SIZE = 16
PADDLE_SPEED = 380
BG = (24, 31, 43)
FG = (238, 241, 245)
ACCENT = (91, 194, 172)


def reset_ball(direction):
    return pygame.Vector2(WIDTH / 2, HEIGHT / 2), pygame.Vector2(300 * direction, 170)


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Pong")
    clock = pygame.time.Clock()
    font = pygame.font.SysFont("arial", 48)

    left = pygame.Rect(35, HEIGHT // 2 - PADDLE_H // 2, PADDLE_W, PADDLE_H)
    right = pygame.Rect(WIDTH - 35 - PADDLE_W, HEIGHT // 2 - PADDLE_H // 2, PADDLE_W, PADDLE_H)
    ball, velocity = reset_ball(1)
    scores = [0, 0]

    while True:
        dt = min(clock.tick(60) / 1000, 0.05)
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN and event.key == pygame.K_r:
                scores = [0, 0]
                left.centery = right.centery = HEIGHT // 2
                ball, velocity = reset_ball(1)

        keys = pygame.key.get_pressed()
        left.y += round((int(keys[pygame.K_s]) - int(keys[pygame.K_w])) * PADDLE_SPEED * dt)
        right.y += round((int(keys[pygame.K_DOWN]) - int(keys[pygame.K_UP])) * PADDLE_SPEED * dt)
        left.clamp_ip(screen.get_rect())
        right.clamp_ip(screen.get_rect())

        ball += velocity * dt
        ball_rect = pygame.Rect(round(ball.x - BALL_SIZE / 2), round(ball.y - BALL_SIZE / 2),
                                BALL_SIZE, BALL_SIZE)
        if ((ball_rect.top <= 0 and velocity.y < 0)
                or (ball_rect.bottom >= HEIGHT and velocity.y > 0)):
            velocity.y *= -1

        for paddle, direction in ((left, 1), (right, -1)):
            if ball_rect.colliderect(paddle) and velocity.x * direction < 0:
                offset = (ball.y - paddle.centery) / (PADDLE_H / 2)
                velocity.x = direction * min(abs(velocity.x) * 1.05, 620)
                velocity.y = offset * 390
                ball.x = paddle.right + BALL_SIZE if direction == 1 else paddle.left - BALL_SIZE

        if ball.x < 0:
            scores[1] += 1
            ball, velocity = reset_ball(-1)
        elif ball.x > WIDTH:
            scores[0] += 1
            ball, velocity = reset_ball(1)

        screen.fill(BG)
        for y in range(0, HEIGHT, 24):
            pygame.draw.rect(screen, (65, 74, 88), (WIDTH // 2 - 1, y, 2, 12))
        pygame.draw.rect(screen, ACCENT, left, border_radius=5)
        pygame.draw.rect(screen, ACCENT, right, border_radius=5)
        pygame.draw.circle(screen, FG, (round(ball.x), round(ball.y)), BALL_SIZE // 2)
        screen.blit(font.render(str(scores[0]), True, FG), (WIDTH // 2 - 80, 25))
        screen.blit(font.render(str(scores[1]), True, FG), (WIDTH // 2 + 45, 25))
        pygame.display.flip()


if __name__ == "__main__":
    main()
