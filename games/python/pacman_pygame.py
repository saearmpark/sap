"""Pac-Man. Eat every dot while dodging ghosts; power pills let you chase them.

game.html의 팩맨(STEP 44)과 같은 규칙을 pygame으로 옮긴 코드입니다.
미로는 매 게임마다 무작위로 생성되고, 유령은 교차로에서 목표(내 위치 또는
모서리)에 가까운 칸을 골라 쫓아옵니다. 파워 알약을 먹으면 잠시 유령이
약해져서 오히려 유령을 잡아 점수를 얻을 수 있습니다.

실행 방법:
  pip install -r requirements.txt
  python pacman_pygame.py

조작: 방향키 또는 W/A/S/D 이동 · R 새 게임 · Space 바로 시작
"""

import math
import random
import sys

import pygame

TILE = 28
GRID = 15
MAZE_SIZE = TILE * GRID
HEADER = 62
WIDTH, HEIGHT = MAZE_SIZE, HEADER + MAZE_SIZE

UP, DOWN, LEFT, RIGHT = (0, -1), (0, 1), (-1, 0), (1, 0)
DIRS = [UP, DOWN, LEFT, RIGHT]

BG = (11, 16, 32)
HEADER_BG = (17, 24, 39)
WALL = (42, 63, 184)
DOT_COLOR = (255, 209, 102)
PAC_COLOR = (255, 214, 10)
WHITE = (255, 255, 255)
PUPIL = (26, 29, 41)
FRIGHT_BLUE = (77, 171, 247)
FRIGHT_FLASH = (248, 248, 250)
GHOST_COLORS = [(255, 77, 109), (255, 143, 171), (76, 201, 240)]

PAC_STEP = 0.17
GHOST_STEP = 0.24
FRIGHT_TIME = 7.0
FONT_NAMES = "malgungothic,malgun gothic,nanumgothic,arial"


def tile_center(index):
    return index * TILE + TILE / 2


def tile_dist(ax, ay, bx, by):
    return (ax - bx) ** 2 + (ay - by) ** 2


class Entity:
    def __init__(self, home, step_time, color, is_pac=False):
        self.col, self.row = home
        self.xpx = tile_center(self.col)
        self.ypx = tile_center(self.row)
        self.dir = None
        self.next_dir = None
        self.moving = False
        self.progress = 0.0
        self.step_from = (0.0, 0.0)
        self.step_to = (0.0, 0.0)
        self.step_time = step_time
        self.color = color
        self.is_pac = is_pac
        self.scatter = None


class Game:
    def __init__(self):
        self.new_game()
        self.state = "ready"
        self.freeze = 0.0
        self.message = "방향키 또는 W/A/S/D 로 시작하세요."

    # ── 미로 생성 ───────────────────────────────
    def generate_maze(self):
        grid = [[1] * GRID for _ in range(GRID)]
        stack = [(1, 1)]
        grid[1][1] = 0
        step = [(0, -2), (0, 2), (-2, 0), (2, 0)]
        while stack:
            x, y = stack[-1]
            options = []
            for dx, dy in step:
                nx, ny = x + dx, y + dy
                if 0 < nx < GRID - 1 and 0 < ny < GRID - 1 and grid[ny][nx] == 1:
                    options.append((nx, ny, dx, dy))
            if not options:
                stack.pop()
                continue
            nx, ny, dx, dy = random.choice(options)
            grid[ny][nx] = 0
            grid[y + dy // 2][x + dx // 2] = 0
            stack.append((nx, ny))
        for y in range(1, GRID - 1):
            for x in range(1, GRID - 1):
                if grid[y][x] != 1:
                    continue
                horizontal = grid[y][x - 1] == 0 and grid[y][x + 1] == 0
                vertical = grid[y - 1][x] == 0 and grid[y + 1][x] == 0
                if horizontal != vertical and random.random() < 0.2:
                    grid[y][x] = 0
        return grid

    def is_open(self, col, row):
        return 0 <= col < GRID and 0 <= row < GRID and self.maze[row][col] == 0

    def nearest_open(self, col, row):
        best, best_dist = (1, 1), float("inf")
        for r in range(GRID):
            for c in range(GRID):
                if self.maze[r][c] != 0:
                    continue
                dist = tile_dist(c, r, col, row)
                if dist < best_dist:
                    best_dist, best = dist, (c, r)
        return best

    def make_entity(self, home, step_time, color, is_pac=False):
        return Entity(home, step_time, color, is_pac)

    def new_game(self):
        self.maze = self.generate_maze()
        self.dots = [[1 if value == 0 else 0 for value in row] for row in self.maze]
        self.corner_targets = [
            self.nearest_open(1, 1),
            self.nearest_open(GRID - 2, 1),
            self.nearest_open(1, GRID - 2),
            self.nearest_open(GRID - 2, GRID - 2),
        ]
        for col, row in self.corner_targets:
            self.dots[row][col] = 2
        self.total_dots = sum(1 for row in self.dots for value in row if value)
        self.eaten = 0
        self.score = 0
        self.lives = 3
        self.frightened = 0.0
        self.scatter_mode = False
        self.scatter_timer = 0.0
        self.freeze = 0.0
        self.pac_home = self.nearest_open(GRID // 2, GRID - 2)
        self.ghost_home = self.nearest_open(GRID // 2, GRID // 2)
        self.reset_entities()

    def reset_entities(self):
        self.pac = self.make_entity(self.pac_home, PAC_STEP, PAC_COLOR, is_pac=True)
        self.ghosts = []
        for index, color in enumerate(GHOST_COLORS):
            ghost = self.make_entity(self.ghost_home, GHOST_STEP, color)
            ghost.scatter = self.corner_targets[index % len(self.corner_targets)]
            self.ghosts.append(ghost)

    # ── 이동 ───────────────────────────────────
    def begin_step(self, entity, direction):
        entity.step_from = (tile_center(entity.col), tile_center(entity.row))
        entity.step_to = (tile_center(entity.col + direction[0]), tile_center(entity.row + direction[1]))
        entity.progress = 0.0
        entity.moving = True

    def advance(self, entity, dt, chooser):
        if not entity.moving:
            direction = chooser(entity)
            if direction and self.is_open(entity.col + direction[0], entity.row + direction[1]):
                entity.dir = direction
                self.begin_step(entity, direction)
            else:
                entity.xpx = tile_center(entity.col)
                entity.ypx = tile_center(entity.row)
                return
        entity.progress += dt / entity.step_time
        if entity.progress >= 1:
            entity.col += entity.dir[0]
            entity.row += entity.dir[1]
            entity.progress = 0.0
            entity.moving = False
            entity.xpx = tile_center(entity.col)
            entity.ypx = tile_center(entity.row)
            if entity.is_pac:
                self.eat_at(entity.col, entity.row)
        else:
            entity.xpx = entity.step_from[0] + (entity.step_to[0] - entity.step_from[0]) * entity.progress
            entity.ypx = entity.step_from[1] + (entity.step_to[1] - entity.step_from[1]) * entity.progress

    def pac_chooser(self, entity):
        if entity.next_dir and self.is_open(entity.col + entity.next_dir[0], entity.row + entity.next_dir[1]):
            direction = entity.next_dir
            entity.next_dir = None
            return direction
        if entity.dir and self.is_open(entity.col + entity.dir[0], entity.row + entity.dir[1]):
            return entity.dir
        return None

    def ghost_chooser(self, ghost):
        reverse = (-ghost.dir[0], -ghost.dir[1]) if ghost.dir else None
        options = [d for d in DIRS
                   if not (reverse and d == reverse)
                   and self.is_open(ghost.col + d[0], ghost.row + d[1])]
        if not options:
            return reverse
        if self.frightened > 0:
            return max(options, key=lambda d: tile_dist(ghost.col + d[0], ghost.row + d[1], self.pac.col, self.pac.row))
        if random.random() < 0.2:
            return random.choice(options)
        target_col, target_row = ghost.scatter if self.scatter_mode else (self.pac.col, self.pac.row)
        return min(options, key=lambda d: tile_dist(ghost.col + d[0], ghost.row + d[1], target_col, target_row))

    # ── 규칙 ───────────────────────────────────
    def eat_at(self, col, row):
        value = self.dots[row][col]
        if value == 1:
            self.dots[row][col] = 0
            self.score += 10
            self.eaten += 1
        elif value == 2:
            self.dots[row][col] = 0
            self.score += 50
            self.eaten += 1
            self.frightened = FRIGHT_TIME
        else:
            return
        if self.eaten >= self.total_dots:
            self.finish(True)

    def lose_life(self):
        self.lives -= 1
        if self.lives <= 0:
            self.finish(False)
            return
        self.frightened = 0.0
        self.freeze = 1.0
        self.reset_entities()
        self.message = f"유령에게 잡혔습니다! 남은 목숨 {self.lives}개."

    def check_collision(self):
        for ghost in self.ghosts:
            if math.hypot(ghost.xpx - self.pac.xpx, ghost.ypx - self.pac.ypx) >= TILE * 0.6:
                continue
            if self.frightened > 0:
                self.score += 200
                ghost.col, ghost.row = self.ghost_home
                ghost.dir = None
                ghost.moving = False
                ghost.progress = 0.0
                ghost.xpx = tile_center(ghost.col)
                ghost.ypx = tile_center(ghost.row)
            else:
                self.lose_life()
                return

    def finish(self, won):
        self.state = "won" if won else "lost"
        self.message = (f"승리! 점수 {self.score}점으로 미로를 탈출했습니다.  R: 다시 시작" if won
                        else f"게임 오버! 점수 {self.score}점.  R: 다시 시작")

    def update(self, dt):
        if self.freeze > 0:
            self.freeze -= dt
            return
        if self.frightened > 0:
            self.frightened = max(0.0, self.frightened - dt)
        self.scatter_timer += dt
        if self.scatter_timer > 8:
            self.scatter_timer = 0.0
            self.scatter_mode = not self.scatter_mode
        self.advance(self.pac, dt, self.pac_chooser)
        if self.state != "playing":
            return
        for ghost in self.ghosts:
            self.advance(ghost, dt, self.ghost_chooser)
        self.check_collision()

    # ── 그리기 ─────────────────────────────────
    def draw(self, screen, hud_font, status_font):
        screen.fill(BG)
        pygame.draw.rect(screen, HEADER_BG, (0, 0, WIDTH, HEADER))
        remaining = max(0, self.total_dots - self.eaten)
        hud = f"점수 {self.score}    목숨 {max(0, self.lives)}    남은 점 {remaining}"
        screen.blit(hud_font.render(hud, True, WHITE), (12, 8))
        screen.blit(status_font.render(self.message, True, (150, 165, 190)), (12, 34))

        for r in range(GRID):
            for c in range(GRID):
                if self.maze[r][c] != 1:
                    continue
                pygame.draw.rect(screen, WALL,
                                 (c * TILE + 2, HEADER + r * TILE + 2, TILE - 4, TILE - 4),
                                 border_radius=6)

        pulse = 3 + math.sin(pygame.time.get_ticks() / 220) * 1.5
        for r in range(GRID):
            for c in range(GRID):
                value = self.dots[r][c]
                if not value:
                    continue
                radius = 5 + pulse if value == 2 else 2.6
                pygame.draw.circle(screen, DOT_COLOR,
                                   (int(tile_center(c)), int(HEADER + tile_center(r))), int(radius))

        for ghost in self.ghosts:
            self.draw_ghost(screen, ghost)
        self.draw_pac(screen)

    def pac_angle(self):
        if not self.pac.dir or self.pac.dir[0] > 0:
            return 0.0
        if self.pac.dir[0] < 0:
            return math.pi
        return -math.pi / 2 if self.pac.dir[1] < 0 else math.pi / 2

    def draw_pac(self, screen):
        mouth = 0.18 + 0.18 * (1 + math.sin(pygame.time.get_ticks() / 90))
        angle = self.pac_angle()
        cx, cy = self.pac.xpx, HEADER + self.pac.ypx
        radius = TILE * 0.42
        start, end = angle + mouth, angle - mouth + math.pi * 2
        points = [(cx, cy)]
        for i in range(25):
            a = start + (end - start) * i / 24
            points.append((cx + radius * math.cos(a), cy + radius * math.sin(a)))
        pygame.draw.polygon(screen, PAC_COLOR, points)

    def draw_ghost(self, screen, ghost):
        x, y = ghost.xpx, HEADER + ghost.ypx
        radius = TILE * 0.4
        scared = self.frightened > 0
        flashing = scared and self.frightened < 2 and int(self.frightened * 8) % 2 == 0
        color = FRIGHT_FLASH if flashing else (FRIGHT_BLUE if scared else ghost.color)
        center_y = y - radius * 0.1
        points = [(x + radius * math.cos(math.pi + math.pi * i / 12),
                   center_y + radius * math.sin(math.pi + math.pi * i / 12)) for i in range(13)]
        points += [
            (x + radius, y + radius * 0.7),
            (x + radius * 0.65, y + radius * 0.35),
            (x + radius * 0.3, y + radius * 0.7),
            (x - radius * 0.3, y + radius * 0.35),
            (x - radius * 0.65, y + radius * 0.7),
            (x - radius, y + radius * 0.35),
        ]
        pygame.draw.polygon(screen, color, points)
        if scared:
            for side in (-1, 1):
                pygame.draw.circle(screen, WHITE,
                                   (int(x + side * radius * 0.32), int(y - radius * 0.15)),
                                   max(1, int(radius * 0.16)))
            return
        look_x = (1 if self.pac.xpx >= x else -1) * radius * 0.14
        look_y = (1 if self.pac.ypx >= ghost.ypx else -1) * radius * 0.14
        for side in (-1, 1):
            eye_x, eye_y = x + side * radius * 0.34, y - radius * 0.15
            pygame.draw.circle(screen, WHITE, (int(eye_x), int(eye_y)), max(1, int(radius * 0.26)))
            pygame.draw.circle(screen, PUPIL, (int(eye_x + look_x), int(eye_y + look_y)), max(1, int(radius * 0.13)))


KEY_DIRS = {
    pygame.K_UP: UP, pygame.K_w: UP,
    pygame.K_DOWN: DOWN, pygame.K_s: DOWN,
    pygame.K_LEFT: LEFT, pygame.K_a: LEFT,
    pygame.K_RIGHT: RIGHT, pygame.K_d: RIGHT,
}


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("팩맨 — 사피엔스")
    clock = pygame.time.Clock()
    hud_font = pygame.font.SysFont(FONT_NAMES, 20, bold=True)
    status_font = pygame.font.SysFont(FONT_NAMES, 15)
    game = Game()

    while True:
        dt = min(clock.tick(60) / 1000, 0.05)
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r:
                    game = Game()
                elif event.key == pygame.K_SPACE:
                    game = Game()
                    game.state = "playing"
                    game.message = "방향키/WASD 이동 · R 다시 시작"
                elif event.key in KEY_DIRS:
                    if game.state in ("won", "lost"):
                        continue
                    game.pac.next_dir = KEY_DIRS[event.key]
                    if game.state == "ready":
                        game.state = "playing"
                        game.message = "방향키/WASD 이동 · R 다시 시작"

        if game.state == "playing":
            game.update(dt)

        game.draw(screen, hud_font, status_font)
        pygame.display.flip()


if __name__ == "__main__":
    main()
