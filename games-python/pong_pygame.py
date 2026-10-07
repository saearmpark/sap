import pygame
import sys
import random

# 초기화
pygame.init()

# 화면 설정
WIDTH, HEIGHT = 800, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Mini Game - Pong Arcade")

# 색상 정의
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
CYAN = (0, 255, 255)

# 프레임 설정
clock = pygame.time.Clock()
FPS = 60

# 패들 및 공 설정
PADDLE_WIDTH, PADDLE_HEIGHT = 15, 100
ball_size = 15

player_paddle = pygame.Rect(50, HEIGHT // 2 - PADDLE_HEIGHT // 2, PADDLE_WIDTH, PADDLE_HEIGHT)
ai_paddle = pygame.Rect(WIDTH - 50 - PADDLE_WIDTH, HEIGHT // 2 - PADDLE_HEIGHT // 2, PADDLE_WIDTH, PADDLE_HEIGHT)
ball = pygame.Rect(WIDTH // 2 - ball_size // 2, HEIGHT // 2 - ball_size // 2, ball_size, ball_size)

ball_dx = 5 * random.choice((1, -1))
ball_dy = 5 * random.choice((1, -1))

player_speed = 0
paddle_speed = 7

# 점수
player_score = 0
ai_score = 0
font = pygame.font.SysFont("Consolas", 40)

def reset_ball():
    global ball_dx, ball_dy
    ball.center = (WIDTH // 2, HEIGHT // 2)
    ball_dx *= -1
    ball_dy = random.choice((5, -5))

# 게임 루프
running = True
while running:
    # 이벤트 처리
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_UP:
                player_speed = -paddle_speed
            if event.key == pygame.K_DOWN:
                player_speed = paddle_speed
        if event.type == pygame.KEYUP:
            if event.key in (pygame.K_UP, pygame.K_DOWN):
                player_speed = 0

    # 플레이어 위치 업데이트
    player_paddle.y += player_speed
    player_paddle.top = max(0, player_paddle.top)
    player_paddle.bottom = min(HEIGHT, player_paddle.bottom)

    # AI 위치 업데이트
    if ai_paddle.centery < ball.centery:
        ai_paddle.y += paddle_speed - 2
    elif ai_paddle.centery > ball.centery:
        ai_paddle.y -= paddle_speed - 2
    ai_paddle.top = max(0, ai_paddle.top)
    ai_paddle.bottom = min(HEIGHT, ai_paddle.bottom)

    # 공 이동
    ball.x += ball_dx
    ball.y += ball_dy

    # 벽 충돌
    if ball.top <= 0 or ball.bottom >= HEIGHT:
        ball_dy *= -1

    # 패들 충돌
    if ball.colliderect(player_paddle) or ball.colliderect(ai_paddle):
        ball_dx *= -1

    # 득점 처리
    if ball.left <= 0:
        ai_score += 1
        reset_ball()
    if ball.right >= WIDTH:
        player_score += 1
        reset_ball()

    # 화면 그리기
    screen.fill(BLACK)
    pygame.draw.line(screen, WHITE, (WIDTH // 2, 0), (WIDTH // 2, HEIGHT), 2)
    pygame.draw.rect(screen, CYAN, player_paddle)
    pygame.draw.rect(screen, WHITE, ai_paddle)
    pygame.draw.ellipse(screen, CYAN, ball)

    # 점수 표시
    player_text = font.render(str(player_score), True, WHITE)
    ai_text = font.render(str(ai_score), True, WHITE)
    screen.blit(player_text, (WIDTH // 4, 20))
    screen.blit(ai_text, (WIDTH * 3 // 4, 20))

    pygame.display.flip()
    clock.tick(FPS)

pygame.quit()
sys.exit()