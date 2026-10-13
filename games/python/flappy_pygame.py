"""Flappy-style arcade game. Press Space or Up to flap."""

import random
import sys

import pygame

WIDTH, HEIGHT = 480, 640
BIRD_X, BIRD_R = 115, 17
PIPE_W, GAP = 72, 178
GRAVITY, FLAP_SPEED = 1450, -470
BG = (136, 207, 227)
PIPE = (69, 163, 91)
GROUND_H = 54


def make_pipe():
    gap_y = random.randint(145, HEIGHT - GROUND_H - 145)
    return {"x": WIDTH + PIPE_W, "gap_y": gap_y, "scored": False}


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Flappy")
    clock = pygame.time.Clock()
    font = pygame.font.SysFont("arial", 38, bold=True)
    info = pygame.font.SysFont("arial", 22)
    bird_y, velocity = HEIGHT * 0.45, 0.0
    pipes = []
    spawn_timer = 0.0
    score, state = 0, "ready"

    def start():
        nonlocal bird_y, velocity, pipes, spawn_timer, score, state
        bird_y, velocity = HEIGHT * 0.45, 0.0
        pipes, spawn_timer, score, state = [], 0.0, 0, "playing"

    while True:
        dt = min(clock.tick(60) / 1000, 0.05)
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN and event.key in (pygame.K_SPACE, pygame.K_UP):
                if state != "playing":
                    start()
                velocity = FLAP_SPEED

        if state == "playing":
            velocity += GRAVITY * dt
            bird_y += velocity * dt
            spawn_timer += dt
            if spawn_timer >= 1.45:
                pipes.append(make_pipe())
                spawn_timer = 0
            for pipe in pipes:
                pipe["x"] -= 205 * dt
                if not pipe["scored"] and pipe["x"] + PIPE_W < BIRD_X:
                    pipe["scored"] = True
                    score += 1
            pipes = [pipe for pipe in pipes if pipe["x"] + PIPE_W > 0]

            bird_rect = pygame.Rect(BIRD_X - BIRD_R, int(bird_y) - BIRD_R, BIRD_R * 2, BIRD_R * 2)
            if bird_rect.top <= 0 or bird_rect.bottom >= HEIGHT - GROUND_H:
                state = "over"
            for pipe in pipes:
                x, gap_y = round(pipe["x"]), pipe["gap_y"]
                top = pygame.Rect(x, 0, PIPE_W, gap_y - GAP // 2)
                bottom = pygame.Rect(x, gap_y + GAP // 2, PIPE_W,
                                     HEIGHT - GROUND_H - gap_y - GAP // 2)
                if bird_rect.colliderect(top) or bird_rect.colliderect(bottom):
                    state = "over"
                    break

        screen.fill(BG)
        for pipe in pipes:
            x, gap_y = round(pipe["x"]), pipe["gap_y"]
            pygame.draw.rect(screen, PIPE, (x, 0, PIPE_W, gap_y - GAP // 2))
            pygame.draw.rect(screen, PIPE, (x - 5, gap_y - GAP // 2 - 16, PIPE_W + 10, 16))
            pygame.draw.rect(screen, PIPE, (x, gap_y + GAP // 2, PIPE_W,
                                            HEIGHT - GROUND_H - gap_y - GAP // 2))
            pygame.draw.rect(screen, PIPE, (x - 5, gap_y + GAP // 2, PIPE_W + 10, 16))
        pygame.draw.rect(screen, (207, 190, 133), (0, HEIGHT - GROUND_H, WIDTH, GROUND_H))
        pygame.draw.rect(screen, (109, 166, 89), (0, HEIGHT - GROUND_H, WIDTH, 10))
        pygame.draw.circle(screen, (246, 204, 73), (BIRD_X, round(bird_y)), BIRD_R)
        pygame.draw.circle(screen, (35, 42, 47), (BIRD_X + 6, round(bird_y) - 5), 3)
        score_text = font.render(str(score), True, (255, 255, 255))
        screen.blit(score_text, score_text.get_rect(center=(WIDTH // 2, 52)))
        if state == "ready":
            label = "Space / Up to start"
        elif state == "over":
            label = "Game over  ·  Space to retry"
        else:
            label = ""
        if label:
            text = info.render(label, True, (37, 53, 61))
            screen.blit(text, text.get_rect(center=(WIDTH // 2, HEIGHT // 2)))
        pygame.display.flip()


if __name__ == "__main__":
    main()
