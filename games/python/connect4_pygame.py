"""Connect Four for two players. Click a column to drop a disc."""

import sys

import pygame

COLS, ROWS = 7, 6
CELL = 88
HEADER = 78
WIDTH, HEIGHT = COLS * CELL, HEADER + ROWS * CELL
BG = (33, 67, 112)
EMPTY = (236, 238, 230)
PLAYER_COLORS = {1: (224, 82, 67), 2: (244, 199, 74)}


def has_won(board, row, col, player):
    for dr, dc in ((0, 1), (1, 0), (1, 1), (1, -1)):
        count = 1
        for sign in (-1, 1):
            r, c = row + dr * sign, col + dc * sign
            while 0 <= r < ROWS and 0 <= c < COLS and board[r][c] == player:
                count += 1
                r += dr * sign
                c += dc * sign
        if count >= 4:
            return True
    return False


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Connect Four")
    font = pygame.font.SysFont("arial", 26, bold=True)
    small = pygame.font.SysFont("arial", 18)
    clock = pygame.time.Clock()
    board = [[0] * COLS for _ in range(ROWS)]
    player, winner, draw = 1, 0, False

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN and event.key == pygame.K_r:
                board = [[0] * COLS for _ in range(ROWS)]
                player, winner, draw = 1, 0, False
            if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1 and not winner and not draw:
                col = event.pos[0] // CELL
                if 0 <= col < COLS:
                    for row in range(ROWS - 1, -1, -1):
                        if board[row][col] == 0:
                            board[row][col] = player
                            if has_won(board, row, col, player):
                                winner = player
                            elif all(board[0][c] for c in range(COLS)):
                                draw = True
                            else:
                                player = 3 - player
                            break

        screen.fill((245, 242, 230))
        if winner:
            message, color = f"Player {winner} wins!  R: restart", PLAYER_COLORS[winner]
        elif draw:
            message, color = "Draw!  R: restart", (45, 50, 55)
        else:
            message = f"Player {player}'s turn  ·  Click a column  ·  R: restart"
            color = PLAYER_COLORS[player]
        screen.blit(font.render(message, True, color), (12, 18))
        screen.blit(small.render("Drop four discs in a row to win.", True, (70, 76, 80)), (12, 51))

        pygame.draw.rect(screen, BG, (0, HEADER, WIDTH, ROWS * CELL))
        for row in range(ROWS):
            for col in range(COLS):
                center = (col * CELL + CELL // 2, HEADER + row * CELL + CELL // 2)
                disc_color = PLAYER_COLORS.get(board[row][col], EMPTY)
                pygame.draw.circle(screen, disc_color, center, CELL // 2 - 7)
        pygame.display.flip()
        clock.tick(60)


if __name__ == "__main__":
    main()
