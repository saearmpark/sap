"""Memory matching game. Click cards to find pairs."""

import random
import sys

import pygame

COLS, ROWS = 4, 4
CARD_W, CARD_H, GAP = 112, 112, 12
MARGIN, HEADER = 24, 64
WIDTH = MARGIN * 2 + COLS * CARD_W + (COLS - 1) * GAP
HEIGHT = HEADER + MARGIN * 2 + ROWS * CARD_H + (ROWS - 1) * GAP
BG = (31, 43, 55)
CARD_BACK = (77, 112, 135)
CARD_FRONT = (238, 233, 216)
PALETTE = [(212, 94, 84), (237, 170, 72), (101, 176, 126), (85, 147, 202),
           (163, 119, 190), (224, 117, 160), (91, 183, 182), (190, 190, 87)]
FLIP_DELAY = 750


def new_game():
    cards = list(range(8)) * 2
    random.shuffle(cards)
    return cards, set(), [], None, 0


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Memory")
    clock = pygame.time.Clock()
    font = pygame.font.SysFont("arial", 42, bold=True)
    info = pygame.font.SysFont("arial", 20)
    cards, matched, open_cards, hide_at, moves = new_game()

    while True:
        now = pygame.time.get_ticks()
        if hide_at is not None and now >= hide_at:
            open_cards = []
            hide_at = None

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN and event.key == pygame.K_r:
                cards, matched, open_cards, hide_at, moves = new_game()
            if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1 and hide_at is None:
                x, y = event.pos
                for i in range(COLS * ROWS):
                    row, col = divmod(i, COLS)
                    rect = pygame.Rect(MARGIN + col * (CARD_W + GAP),
                                       HEADER + MARGIN + row * (CARD_H + GAP), CARD_W, CARD_H)
                    if rect.collidepoint(x, y) and i not in matched and i not in open_cards:
                        open_cards.append(i)
                        if len(open_cards) == 2:
                            moves += 1
                            if cards[open_cards[0]] == cards[open_cards[1]]:
                                matched.update(open_cards)
                                open_cards = []
                            else:
                                hide_at = now + FLIP_DELAY
                        break

        screen.fill(BG)
        status = f"Moves: {moves}   Pairs: {len(matched) // 2}/8   R: restart"
        if len(matched) == len(cards):
            status = f"All pairs found in {moves} moves!   R: restart"
        screen.blit(info.render(status, True, (238, 241, 245)), (MARGIN, 20))
        for i, value in enumerate(cards):
            row, col = divmod(i, COLS)
            rect = pygame.Rect(MARGIN + col * (CARD_W + GAP),
                               HEADER + MARGIN + row * (CARD_H + GAP), CARD_W, CARD_H)
            if i in matched or i in open_cards:
                pygame.draw.rect(screen, CARD_FRONT, rect, border_radius=10)
                pygame.draw.circle(screen, PALETTE[value], rect.center, 25)
            else:
                pygame.draw.rect(screen, CARD_BACK, rect, border_radius=10)
                pygame.draw.line(screen, (112, 147, 166), rect.topleft, rect.bottomright, 3)
        pygame.display.flip()
        clock.tick(60)


if __name__ == "__main__":
    main()
