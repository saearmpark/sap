"""Bomberman. Blast bricks and defeat every enemy to clear each stage.

game.html의 봄버맨(STEP 46)과 같은 규칙을 pygame으로 옮긴 코드입니다.
격자 미로에서 폭탄을 놓으면 잠시 뒤 상하좌우로 불꽃이 퍼지며, 처음 만난
벽돌을 부수고 멈춥니다. 불꽃이 다른 폭탄에 닿으면 연쇄 폭발합니다.
벽돌에서 나오는 아이템을 먹으면 폭탄 개수·화력·이동 속도가 늘어납니다.

실행 방법:
  pip install -r requirements.txt
  python bomberman_pygame.py

조작: 방향키 또는 W/A/S/D 이동 · Space 폭탄 · R 새 게임
"""

import math
import random
import sys

import pygame

TILE = 34
COLS, ROWS = 13, 11
MAZE_W, MAZE_H = COLS * TILE, ROWS * TILE
HEADER = 62
WIDTH, HEIGHT = MAZE_W, HEADER + MAZE_H

EMPTY, WALL, BRICK = 0, 1, 2
UP, DOWN, LEFT, RIGHT = (0, -1), (0, 1), (-1, 0), (1, 0)
DIRS = [UP, DOWN, LEFT, RIGHT]
SPAWN = (1, 1)

BG = (11, 16, 32)
HEADER_BG = (17, 24, 39)
FLOOR_A = (14, 22, 38)
FLOOR_B = (17, 26, 46)
WALL_COLOR = (71, 85, 105)
WALL_INNER = (100, 116, 139)
BRICK_COLOR = (154, 52, 18)
BRICK_LINE = (124, 45, 18)
BOMB_COLOR = (17, 24, 39)
BOMB_HIGHLIGHT = (55, 65, 81)
FUSE_COLOR = (245, 158, 11)
FLAME_COLOR = (251, 146, 60)
FLAME_CORE = (254, 240, 138)
PLAYER_COLOR = (224, 242, 254)
PLAYER_HAT = (14, 165, 233)
PLAYER_DARK = (15, 23, 42)
ITEM_COLORS = {"bomb": (56, 189, 248), "power": (251, 146, 60), "speed": (74, 222, 128)}
ITEM_LABELS = {"bomb": "B", "power": "F", "speed": "S"}
ENEMY_COLORS = [(255, 107, 107), (255, 209, 102), (139, 212, 80), (192, 132, 252)]

BOMB_TIME = 2.0
FLAME_TIME = 0.5
INVULN_TIME = 1.6
FONT_NAMES = "malgungothic,malgun gothic,nanumgothic,arial"

KEY_DIRS = {
    pygame.K_UP: UP, pygame.K_w: UP,
    pygame.K_DOWN: DOWN, pygame.K_s: DOWN,
    pygame.K_LEFT: LEFT, pygame.K_a: LEFT,
    pygame.K_RIGHT: RIGHT, pygame.K_d: RIGHT,
}


def tile_center(index):
    return index * TILE + TILE / 2


class Entity:
    def __init__(self, col, row, step_time):
        self.col, self.row = col, row
        self.xpx = tile_center(col)
        self.ypx = tile_center(row)
        self.dir = None
        self.moving = False
        self.progress = 0.0
        self.from_pos = (0.0, 0.0)
        self.to_pos = (0.0, 0.0)
        self.step_time = step_time
        self.is_player = False
        self.color = (255, 255, 255)

    def tile(self):
        return (round((self.xpx - TILE / 2) / TILE), round((self.ypx - TILE / 2) / TILE))


class Game:
    def __init__(self):
        self.held = []
        self.new_game()
        self.state = "ready"
        self.message = "방향키 또는 W/A/S/D 로 시작하세요."

    # ── 레벨 구성 ───────────────────────────────
    def generate_map(self):
        self.map = [[EMPTY] * COLS for _ in range(ROWS)]
        for r in range(ROWS):
            for c in range(COLS):
                if r == 0 or c == 0 or r == ROWS - 1 or c == COLS - 1:
                    self.map[r][c] = WALL
                elif r % 2 == 0 and c % 2 == 0:
                    self.map[r][c] = WALL
                else:
                    self.map[r][c] = BRICK if random.random() < 0.78 else EMPTY
        for col, row in ((1, 1), (2, 1), (1, 2)):
            self.map[row][col] = EMPTY

    def open_cells_away_from_spawn(self, min_dist):
        cells = []
        for r in range(1, ROWS - 1):
            for c in range(1, COLS - 1):
                if self.map[r][c] != EMPTY:
                    continue
                if abs(c - SPAWN[0]) + abs(r - SPAWN[1]) < min_dist:
                    continue
                cells.append((c, r))
        return cells

    def build_level(self):
        self.generate_map()
        self.bombs = []
        self.flames = []
        self.items = []
        self.enemies = []
        self.player = Entity(SPAWN[0], SPAWN[1], self.base_speed)
        self.player.is_player = True
        self.invuln = INVULN_TIME
        spots = self.open_cells_away_from_spawn(5)
        count = min(2 + self.level, len(spots))
        for i in range(count):
            col, row = spots.pop(random.randrange(len(spots)))
            enemy = Entity(col, row, max(0.16, 0.3 - self.level * 0.015))
            enemy.color = ENEMY_COLORS[i % len(ENEMY_COLORS)]
            self.enemies.append(enemy)

    def new_game(self):
        self.score = 0
        self.lives = 3
        self.level = 1
        self.bombs_max = 1
        self.power = 2
        self.base_speed = 0.16
        self.level_pause = 0.0
        self.invuln = 0.0
        self.held = []
        self.build_level()

    # ── 규칙 도우미 ─────────────────────────────
    def in_bounds(self, col, row):
        return 0 <= col < COLS and 0 <= row < ROWS

    def bomb_at(self, col, row):
        return any(b["col"] == col and b["row"] == row for b in self.bombs)

    def flame_at(self, col, row):
        return any(f["col"] == col and f["row"] == row for f in self.flames)

    def can_move(self, col, row):
        return self.in_bounds(col, row) and self.map[row][col] == EMPTY and not self.bomb_at(col, row)

    # ── 이동 ───────────────────────────────────
    def begin_step(self, entity, direction):
        entity.from_pos = (tile_center(entity.col), tile_center(entity.row))
        entity.to_pos = (tile_center(entity.col + direction[0]), tile_center(entity.row + direction[1]))
        entity.progress = 0.0
        entity.moving = True

    def advance(self, entity, dt, chooser):
        if not entity.moving:
            direction = chooser(entity)
            if direction and self.can_move(entity.col + direction[0], entity.row + direction[1]):
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
            if entity.is_player:
                self.pick_up_item(entity.col, entity.row)
        else:
            entity.xpx = entity.from_pos[0] + (entity.to_pos[0] - entity.from_pos[0]) * entity.progress
            entity.ypx = entity.from_pos[1] + (entity.to_pos[1] - entity.from_pos[1]) * entity.progress

    def player_chooser(self, entity):
        # 눌려 있는 방향키가 있을 때만 이동한다. 키를 떼면 다음 칸에서 멈춘다.
        for direction in reversed(self.held):
            if self.can_move(entity.col + direction[0], entity.row + direction[1]):
                return direction
        return None

    def enemy_chooser(self, enemy):
        reverse = (-enemy.dir[0], -enemy.dir[1]) if enemy.dir else None
        options = [d for d in DIRS
                   if not (reverse and d == reverse)
                   and self.can_move(enemy.col + d[0], enemy.row + d[1])]
        if not options and reverse and self.can_move(enemy.col + reverse[0], enemy.row + reverse[1]):
            options = [reverse]
        if not options:
            return None
        safe = [d for d in options if not self.flame_at(enemy.col + d[0], enemy.row + d[1])]
        pool = safe or options
        if random.random() < 0.35:
            return min(pool, key=lambda d: (enemy.col + d[0] - self.player.col) ** 2
                       + (enemy.row + d[1] - self.player.row) ** 2)
        return random.choice(pool)

    # ── 아이템/폭탄 ─────────────────────────────
    def pick_up_item(self, col, row):
        for index, item in enumerate(self.items):
            if item["col"] == col and item["row"] == row:
                kind = item["type"]
                self.items.pop(index)
                if kind == "bomb":
                    self.bombs_max += 1
                elif kind == "power":
                    self.power += 1
                else:
                    self.base_speed = max(0.08, self.base_speed - 0.02)
                    self.player.step_time = self.base_speed
                self.score += 50
                return

    def maybe_drop_item(self, col, row):
        if random.random() > 0.3:
            return
        roll = random.random()
        kind = "bomb" if roll < 0.4 else "power" if roll < 0.75 else "speed"
        self.items.append({"col": col, "row": row, "type": kind})

    def place_bomb(self):
        if self.state != "playing" or self.level_pause > 0:
            return
        col, row = self.player.tile()
        if not self.in_bounds(col, row) or len(self.bombs) >= self.bombs_max or self.bomb_at(col, row):
            return
        self.bombs.append({"col": col, "row": row, "timer": BOMB_TIME, "power": self.power})

    def add_flame(self, col, row):
        self.flames.append({"col": col, "row": row, "timer": FLAME_TIME})

    def detonate(self, start):
        queue = [start]
        done = set()
        while queue:
            bomb = queue.pop(0)
            if id(bomb) in done:
                continue
            done.add(id(bomb))
            if bomb in self.bombs:
                self.bombs.remove(bomb)
            self.add_flame(bomb["col"], bomb["row"])
            for dir_x, dir_y in DIRS:
                for i in range(1, bomb["power"] + 1):
                    col, row = bomb["col"] + dir_x * i, bomb["row"] + dir_y * i
                    if not self.in_bounds(col, row) or self.map[row][col] == WALL:
                        break
                    self.add_flame(col, row)
                    if self.map[row][col] == BRICK:
                        self.map[row][col] = EMPTY
                        self.maybe_drop_item(col, row)
                        self.score += 10
                        break
                    for other in self.bombs:
                        if other["col"] == col and other["row"] == row and id(other) not in done:
                            queue.append(other)

    def update_bombs(self, dt):
        due = []
        for bomb in self.bombs:
            bomb["timer"] -= dt
            if bomb["timer"] <= 0:
                due.append(bomb)
        for bomb in due:
            if bomb in self.bombs:
                self.detonate(bomb)

    def update_flames(self, dt):
        for flame in self.flames:
            flame["timer"] -= dt
        self.flames = [flame for flame in self.flames if flame["timer"] > 0]

    # ── 충돌/상태 ───────────────────────────────
    def resolve_hazards(self):
        remaining = []
        for enemy in self.enemies:
            col, row = enemy.tile()
            if self.flame_at(col, row):
                self.score += 100
                continue
            remaining.append(enemy)
        self.enemies = remaining
        if self.invuln <= 0:
            col, row = self.player.tile()
            if self.flame_at(col, row):
                self.damage_player()

    def check_enemy_collision(self):
        if self.invuln > 0:
            return
        for enemy in self.enemies:
            if math.hypot(enemy.xpx - self.player.xpx, enemy.ypx - self.player.ypx) < TILE * 0.7:
                self.damage_player()
                return

    def damage_player(self):
        self.lives -= 1
        if self.lives <= 0:
            self.finish()
            return
        self.player = Entity(SPAWN[0], SPAWN[1], self.base_speed)
        self.player.is_player = True
        self.invuln = INVULN_TIME
        self.message = f"당했습니다! 남은 목숨 {self.lives}개."

    def clear_level(self):
        self.score += 200
        self.level += 1
        self.level_pause = 1.2
        self.message = f"단계 클리어! {self.score}점 · 다음 단계 준비 중..."

    def finish(self):
        self.state = "lost"
        self.message = f"게임 오버! 점수 {self.score}점.  R: 다시 시작"

    def start_playing(self):
        self.state = "playing"
        self.message = "방향키/WASD 이동 · Space 폭탄 · 모든 적을 물리치세요!"

    def update(self, dt):
        if self.level_pause > 0:
            self.level_pause -= dt
            if self.level_pause <= 0:
                self.build_level()
            return
        if self.invuln > 0:
            self.invuln = max(0.0, self.invuln - dt)
        self.advance(self.player, dt, self.player_chooser)
        for enemy in self.enemies:
            self.advance(enemy, dt, self.enemy_chooser)
        self.update_bombs(dt)
        self.update_flames(dt)
        self.resolve_hazards()
        if self.state != "playing":
            return
        self.check_enemy_collision()
        if self.state == "playing" and not self.enemies:
            self.clear_level()

    # ── 그리기 ─────────────────────────────────
    def press_dir(self, direction):
        self.held = [d for d in self.held if d != direction]
        self.held.append(direction)

    def release_dir(self, direction):
        self.held = [d for d in self.held if d != direction]

    def draw(self, screen, hud_font, status_font, label_font):
        screen.fill(BG)
        pygame.draw.rect(screen, HEADER_BG, (0, 0, WIDTH, HEADER))
        hud = (f"점수 {self.score}    목숨 {max(0, self.lives)}    "
               f"남은 적 {len(self.enemies)}    단계 {self.level}")
        screen.blit(hud_font.render(hud, True, (255, 255, 255)), (12, 8))
        screen.blit(status_font.render(self.message, True, (150, 165, 190)), (12, 34))

        for r in range(ROWS):
            for c in range(COLS):
                x, y = c * TILE, HEADER + r * TILE
                if self.map[r][c] == WALL:
                    pygame.draw.rect(screen, WALL_COLOR, (x + 1, y + 1, TILE - 2, TILE - 2), border_radius=5)
                    pygame.draw.rect(screen, WALL_INNER, (x + 6, y + 6, TILE - 12, TILE - 12), border_radius=4)
                elif self.map[r][c] == BRICK:
                    pygame.draw.rect(screen, BRICK_COLOR, (x + 2, y + 2, TILE - 4, TILE - 4), border_radius=3)
                    pygame.draw.rect(screen, BRICK_LINE, (x + 6, y + 6, TILE - 12, TILE // 2 - 6), 2)
                    pygame.draw.rect(screen, BRICK_LINE, (x + 6, y + TILE // 2, TILE - 12, TILE // 2 - 6), 2)
                else:
                    pygame.draw.rect(screen, FLOOR_B if (r + c) % 2 else FLOOR_A, (x, y, TILE, TILE))

        for item in self.items:
            self.draw_item(screen, item, label_font)
        for bomb in self.bombs:
            self.draw_bomb(screen, bomb)
        for flame in self.flames:
            self.draw_flame(screen, flame)
        for enemy in self.enemies:
            self.draw_enemy(screen, enemy)
        self.draw_player(screen)

    def draw_item(self, screen, item, label_font):
        x, y = tile_center(item["col"]), HEADER + tile_center(item["row"])
        size = TILE * 0.6
        pygame.draw.rect(screen, ITEM_COLORS[item["type"]],
                         (x - size / 2, y - size / 2, size, size), border_radius=6)
        text = label_font.render(ITEM_LABELS[item["type"]], True, BG)
        screen.blit(text, text.get_rect(center=(x, y)))

    def draw_bomb(self, screen, bomb):
        x, y = tile_center(bomb["col"]), HEADER + tile_center(bomb["row"])
        scale = 0.72 + math.sin(pygame.time.get_ticks() / 120) * 0.08
        pygame.draw.circle(screen, BOMB_COLOR, (int(x), int(y)), int(TILE * 0.34 * scale))
        pygame.draw.circle(screen, BOMB_HIGHLIGHT, (int(x - 3), int(y - 3)), int(TILE * 0.1))
        pygame.draw.line(screen, FUSE_COLOR, (x + 4, y - TILE * 0.28), (x + 10, y - TILE * 0.44), 2)

    def draw_flame(self, screen, flame):
        x, y = flame["col"] * TILE, HEADER + flame["row"] * TILE
        t = max(0.0, flame["timer"] / FLAME_TIME)
        pad = 3 + (1 - t) * 6
        pygame.draw.rect(screen, FLAME_COLOR, (x + pad, y + pad, TILE - pad * 2, TILE - pad * 2), border_radius=6)
        pygame.draw.rect(screen, FLAME_CORE,
                         (x + TILE * 0.28, y + TILE * 0.28, TILE * 0.44, TILE * 0.44), border_radius=5)

    def draw_enemy(self, screen, enemy):
        x, y = enemy.xpx, HEADER + enemy.ypx
        r = TILE * 0.34
        colored = [(x + r * math.cos(math.pi + math.pi * i / 12),
                    y - r * 0.1 + r * math.sin(math.pi + math.pi * i / 12)) for i in range(13)]
        colored += [
            (x + r, y + r * 0.6),
            (x + r * 0.4, y + r * 0.95),
            (x, y + r * 0.6),
            (x - r * 0.4, y + r * 0.95),
            (x - r, y + r * 0.6),
        ]
        pygame.draw.polygon(screen, enemy.color, colored)
        for side in (-1, 1):
            eye_x, eye_y = x + side * r * 0.36, y - r * 0.15
            pygame.draw.circle(screen, (255, 255, 255), (int(eye_x), int(eye_y)), max(1, int(r * 0.26)))
            pygame.draw.circle(screen, (17, 24, 39), (int(eye_x), int(eye_y + r * 0.05)), max(1, int(r * 0.12)))

    def draw_player(self, screen):
        if self.invuln > 0 and int(pygame.time.get_ticks() / 90) % 2 == 0:
            return
        x, y = self.player.xpx, HEADER + self.player.ypx
        r = TILE * 0.36
        pygame.draw.circle(screen, PLAYER_COLOR, (int(x), int(y)), int(r))
        pygame.draw.circle(screen, PLAYER_HAT, (int(x), int(y - r * 0.15)), int(r * 0.85))
        pygame.draw.circle(screen, PLAYER_DARK, (int(x), int(y + r * 0.12)), max(1, int(r * 0.34)))


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("봄버맨 — 사피엔스")
    clock = pygame.time.Clock()
    hud_font = pygame.font.SysFont(FONT_NAMES, 20, bold=True)
    status_font = pygame.font.SysFont(FONT_NAMES, 15)
    label_font = pygame.font.SysFont(FONT_NAMES, 15, bold=True)
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
                    if game.state == "playing":
                        game.place_bomb()
                    else:
                        game.new_game()
                        game.start_playing()
                elif event.key in KEY_DIRS:
                    if game.state != "playing":
                        game.new_game()
                        game.start_playing()
                    game.press_dir(KEY_DIRS[event.key])
            if event.type == pygame.KEYUP and event.key in KEY_DIRS:
                game.release_dir(KEY_DIRS[event.key])

        if game.state == "playing":
            game.update(dt)

        game.draw(screen, hud_font, status_font, label_font)
        pygame.display.flip()


if __name__ == "__main__":
    main()
