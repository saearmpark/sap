"""
STEP 3: 슈팅게임 (Python + pygame-ce)

game.html의 JavaScript 슈팅게임과 같은 규칙을 파이썬으로 옮긴 코드입니다.
벽돌깨기가 "물체 하나(공)"를 다뤘다면, 이번에는 총알과 적이 여러 개 동시에
존재합니다. 리스트로 여러 개체(스프라이트)를 관리하고, 매 프레임 죽은 것들을
걸러내는(filter) 패턴이 핵심입니다.

실행 방법:
  python shooter_pygame.py

조작: 좌우 방향키 이동 / 스페이스바 발사 / R 키로 다시 시작
"""

import sys
import random
import pygame

WIDTH, HEIGHT = 480, 360

BG_COLOR = (247, 246, 242)
PLAYER_COLOR = (27, 31, 29)
BULLET_COLOR = (86, 94, 88)
ENEMY_COLOR = (63, 102, 80)


def new_game():
    player = pygame.Rect(WIDTH // 2 - 13, HEIGHT - 40, 26, 16)
    bullets = []  # 각 원소: pygame.Rect
    enemies = []  # 각 원소: {"rect": Rect, "speed": float}
    return player, bullets, enemies, 0, 3, 0, 0  # ...score, lives, elapsed, spawn_timer


def spawn_interval(elapsed):
    return max(25, 70 - elapsed // 300)


def enemy_speed(elapsed):
    return 1.5 + elapsed / 1800


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    clock = pygame.time.Clock()

    player, bullets, enemies, score, lives, elapsed, spawn_timer = new_game()
    running = True

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r:
                    player, bullets, enemies, score, lives, elapsed, spawn_timer = new_game()
                    running = True
                if event.key == pygame.K_SPACE and running:
                    bullets.append(pygame.Rect(player.centerx - 2, player.top - 10, 4, 10))

        if running:
            elapsed += 1

            keys = pygame.key.get_pressed()
            if keys[pygame.K_LEFT]:
                player.x -= 5
            if keys[pygame.K_RIGHT]:
                player.x += 5
            player.clamp_ip(screen.get_rect())

            # 총알 이동 (위로)
            for b in bullets:
                b.y -= 6
            bullets = [b for b in bullets if b.bottom > 0]

            # 적 생성
            spawn_timer += 1
            if spawn_timer >= spawn_interval(elapsed):
                spawn_timer = 0
                x = random.randint(0, WIDTH - 24)
                enemies.append({"rect": pygame.Rect(x, -20, 24, 18), "speed": enemy_speed(elapsed)})

            # 적 이동 (아래로)
            for e in enemies:
                e["rect"].y += e["speed"]

            # 총알-적 충돌: 맞은 총알/적은 표시만 해두고 아래에서 한 번에 걸러낸다
            hit_bullets, hit_enemies = set(), set()
            for bi, b in enumerate(bullets):
                for ei, e in enumerate(enemies):
                    if ei in hit_enemies:
                        continue
                    if b.colliderect(e["rect"]):
                        hit_bullets.add(bi)
                        hit_enemies.add(ei)
                        score += 10
                        break

            bullets = [b for i, b in enumerate(bullets) if i not in hit_bullets]

            # 화면을 벗어나거나 플레이어와 부딪힌 적 처리
            survivors = []
            for ei, e in enumerate(enemies):
                if ei in hit_enemies:
                    continue
                if e["rect"].colliderect(player) or e["rect"].top > HEIGHT:
                    lives -= 1
                    continue
                survivors.append(e)
            enemies = survivors

            if lives <= 0:
                running = False

        # 그리기
        screen.fill(BG_COLOR)
        pygame.draw.rect(screen, PLAYER_COLOR, player)
        for b in bullets:
            pygame.draw.rect(screen, BULLET_COLOR, b)
        for e in enemies:
            pygame.draw.rect(screen, ENEMY_COLOR, e["rect"])

        if running:
            pygame.display.set_caption(f"슈팅게임 — 점수 {score} · 목숨 {lives}")
        else:
            pygame.display.set_caption(f"슈팅게임 — 게임 오버 점수 {score} (R 키로 재시작)")

        pygame.display.flip()
        clock.tick(60)


if __name__ == "__main__":
    main()
