import pygame
import random
import sys

# Initialize Pygame
pygame.init()
# One KEYDOWN per press; holding a key must not repeat steering.
pygame.key.set_repeat()

# Constants
WIDTH, HEIGHT = 1200, 800
CELL_SIZE = 40
GRID_WIDTH = WIDTH // CELL_SIZE
GRID_HEIGHT = HEIGHT // CELL_SIZE
FPS = 60

# Ghost house: a fixed box in the center with a door in its top wall, surrounded by a wall-free ring.
RELEASE_INTERVAL = 900  # 15 seconds at 60 FPS
EXIT_CELL = (14, 7)
DOOR_CELLS = {(14, 8), (15, 8)}
GHOST_TYPES = [
    # (color, house slot, initial release delay in frames)
    ((255, 0, 0), (12, 10), 0),
    ((255, 192, 203), (13, 10), RELEASE_INTERVAL),
    ((0, 255, 255), (14, 10), 2 * RELEASE_INTERVAL),
    ((255, 165, 0), (15, 10), 3 * RELEASE_INTERVAL),
    ((0, 255, 0), (16, 10), 4 * RELEASE_INTERVAL),
    ((155, 48, 255), (17, 10), 5 * RELEASE_INTERVAL),
]
DOOR_COLOR = (255, 184, 222)
DIRECTIONS = [(1, 0), (-1, 0), (0, 1), (0, -1)]


def in_house(x, y):
    return 11 <= x <= 18 and 8 <= y <= 11


def in_ring(x, y):
    return 10 <= x <= 19 and 7 <= y <= 12 and not in_house(x, y)

# Colors
BLACK = (0, 0, 0)
BLUE = (0, 0, 255)
YELLOW = (255, 255, 0)
WHITE = (255, 255, 255)
RED = (255, 0, 0)

# Create the game window
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Pac-Man")
clock = pygame.time.Clock()

# Game variables
score = 0
lives = 3
game_over = False

# Define the maze layout (0: empty, 1: wall, 2: dot, 3: power pellet, 4: ghost-house door)
def valid(x, y):
    return 0 <= x < GRID_WIDTH and 0 <= y < GRID_HEIGHT and maze[y][x] not in (1, 4)


def generate_maze():
    global maze
    new_maze = []
    for y in range(GRID_HEIGHT):
        row = []
        for x in range(GRID_WIDTH):
            # Create walls around the edges
            if x == 0 or x == GRID_WIDTH - 1 or y == 0 or y == GRID_HEIGHT - 1:
                row.append(1)  # Wall
            elif in_house(x, y):
                if (x, y) in DOOR_CELLS:
                    row.append(4)  # Door
                elif 9 <= y <= 10 and 12 <= x <= 17:
                    row.append(0)  # House interior
                else:
                    row.append(1)  # House wall
            # Create some random walls inside, never on the ring around the house
            elif random.random() < 0.2 and not (x == 1 and y == 1) and not in_ring(x, y):
                row.append(1)  # Wall
            else:
                # Place dots everywhere else
                if random.random() < 0.1:
                    row.append(3)  # Power pellet
                else:
                    row.append(2)  # Regular dot
        new_maze.append(row)
    new_maze[1][1] = 0
    maze = new_maze

    # Connect isolated floor regions without changing the boundary, the house or collectibles.
    while True:
        reached = {(1, 1)}
        queue = [(1, 1)]
        for x, y in queue:
            for dx, dy in DIRECTIONS:
                nx, ny = x + dx, y + dy
                if valid(nx, ny) and (nx, ny) not in reached:
                    reached.add((nx, ny))
                    queue.append((nx, ny))
        target = next(((x, y) for y in range(1, GRID_HEIGHT - 1)
                       for x in range(1, GRID_WIDTH - 1)
                       if not in_house(x, y) and maze[y][x] != 1 and (x, y) not in reached), None)
        if target is None:
            return maze
        # Shortest path from the target to any reached cell, outside the house
        came_from = {target: None}
        search = [target]
        end = None
        for x, y in search:
            for dx, dy in DIRECTIONS:
                nx, ny = x + dx, y + dy
                if not (1 <= nx <= GRID_WIDTH - 2 and 1 <= ny <= GRID_HEIGHT - 2) \
                        or in_house(nx, ny) or (nx, ny) in came_from:
                    continue
                came_from[(nx, ny)] = (x, y)
                if (nx, ny) in reached:
                    end = (nx, ny)
                    break
                search.append((nx, ny))
            if end:
                break
        cell = end
        while cell:
            if maze[cell[1]][cell[0]] == 1:
                maze[cell[1]][cell[0]] = 2
            cell = came_from[cell]


generate_maze()

# Pac-Man class
class PacMan:
    def __init__(self):
        self.x = 1
        self.y = 1
        self.direction = (1, 0)  # Start moving right
        self.mouth_open = True
        self.mouth_change_timer = 0
        self.powered_up = False
        self.power_timer = 0
        self.heading = None  # Keeps moving this way until a wall or a new steer
        self.move_timer = 0

    def move(self, dx, dy):
        new_x = self.x + dx
        new_y = self.y + dy

        # Check if the new position is valid (not a wall or door)
        if valid(new_x, new_y):
            self.x = new_x
            self.y = new_y
            self.direction = (dx, dy)

            # Check if Pac-Man ate a dot
            global score
            if maze[self.y][self.x] == 2:  # Regular dot
                maze[self.y][self.x] = 0
                score += 10
            elif maze[self.y][self.x] == 3:  # Power pellet
                maze[self.y][self.x] = 0
                score += 50
                self.powered_up = True
                self.power_timer = 300  # Power-up lasts for 5 seconds (300 frames at 60 FPS)
            return True
        return False

    def steer(self, direction):
        # A fresh arrow press: ignore the current heading, otherwise turn at once if the way is open
        if self.heading == direction:
            return
        if self.move(*direction):
            self.heading = direction
            self.move_timer = 0

    def auto_move(self):
        if self.heading is None:
            return
        self.move_timer += 1
        if self.move_timer >= 10:  # Six moves per second
            self.move_timer = 0
            if not self.move(*self.heading):
                self.heading = None  # Stop at a wall

    def update(self):
        # Update mouth animation
        self.mouth_change_timer += 1
        if self.mouth_change_timer >= 10:  # Change mouth state every 10 frames
            self.mouth_open = not self.mouth_open
            self.mouth_change_timer = 0

        # Update power-up timer
        if self.powered_up:
            self.power_timer -= 1
            if self.power_timer <= 0:
                self.powered_up = False

    def draw(self):
        # Draw Pac-Man
        center_x = self.x * CELL_SIZE + CELL_SIZE // 2
        center_y = self.y * CELL_SIZE + CELL_SIZE // 2
        radius = CELL_SIZE // 2 - 2

        # Determine mouth angle based on direction
        if self.direction == (1, 0):  # Right
            start_angle = 30 if self.mouth_open else 5
            end_angle = 330 if self.mouth_open else 355
        elif self.direction == (-1, 0):  # Left
            start_angle = 150 if self.mouth_open else 175
            end_angle = 210 if self.mouth_open else 185
        elif self.direction == (0, -1):  # Up
            start_angle = 60 if self.mouth_open else 85
            end_angle = 120 if self.mouth_open else 95
        else:  # Down
            start_angle = 240 if self.mouth_open else 265
            end_angle = 300 if self.mouth_open else 275

        pygame.draw.arc(screen, YELLOW, (center_x - radius, center_y - radius, radius * 2, radius * 2),
                        start_angle * (3.14159 / 180), end_angle * (3.14159 / 180), radius)

        if not self.mouth_open:
            pygame.draw.circle(screen, YELLOW, (center_x, center_y), radius)

# Ghost class
class Ghost:
    def __init__(self, ghost_type, initial=True):
        self.type = ghost_type
        self.color, self.slot, self.delay = ghost_type
        self.direction = random.choice(DIRECTIONS)
        self.move_timer = 0
        self.place(initial)

    def place(self, initial):
        # The first ghost starts outside the door; the others wait in the house.
        if initial and self.delay == 0:
            self.x, self.y = EXIT_CELL
            self.waiting = None
        else:
            self.x, self.y = self.slot
            self.waiting = self.delay if initial else RELEASE_INTERVAL

    def move(self):
        if self.waiting is not None:
            self.waiting -= 1
            if self.waiting <= 0:
                # Released: jump out above the door
                self.waiting = None
                self.x, self.y = EXIT_CELL
                self.move_timer = 0
            return
        self.move_timer += 1
        if self.move_timer >= 15:  # Move every 15 frames
            self.move_timer = 0

            # Try to continue in the same direction
            new_x = self.x + self.direction[0]
            new_y = self.y + self.direction[1]

            # If the path is blocked, choose a new random direction
            if not valid(new_x, new_y):
                # Get all possible directions
                possible_directions = [(dx, dy) for dx, dy in DIRECTIONS
                                       if valid(self.x + dx, self.y + dy)]

                if possible_directions:
                    self.direction = random.choice(possible_directions)
                    new_x = self.x + self.direction[0]
                    new_y = self.y + self.direction[1]
                else:
                    return  # No valid moves

            self.x = new_x
            self.y = new_y

    def draw(self, scared=False):
        color = BLUE if scared else self.color
        center_x = self.x * CELL_SIZE + CELL_SIZE // 2
        center_y = self.y * CELL_SIZE + CELL_SIZE // 2

        # Draw ghost body
        radius = CELL_SIZE // 2 - 2
        pygame.draw.circle(screen, color, (center_x, center_y), radius)
        pygame.draw.rect(screen, color, (center_x - radius, center_y, radius * 2, radius))

        # Draw ghost "skirt"
        for i in range(3):
            offset = (i - 1) * (radius // 2)
            pygame.draw.circle(screen, color, (center_x + offset, center_y + radius), radius // 3)

        # Draw eyes
        eye_radius = radius // 3
        pygame.draw.circle(screen, WHITE, (center_x - eye_radius, center_y - eye_radius), eye_radius)
        pygame.draw.circle(screen, WHITE, (center_x + eye_radius, center_y - eye_radius), eye_radius)

        # Draw pupils
        pupil_radius = eye_radius // 2
        pupil_offset_x = self.direction[0] * pupil_radius // 2
        pupil_offset_y = self.direction[1] * pupil_radius // 2
        pygame.draw.circle(screen, BLACK, (center_x - eye_radius + pupil_offset_x, center_y - eye_radius + pupil_offset_y), pupil_radius)
        pygame.draw.circle(screen, BLACK, (center_x + eye_radius + pupil_offset_x, center_y - eye_radius + pupil_offset_y), pupil_radius)

# Create Pac-Man
pacman = PacMan()

# Create ghosts
ghosts = [Ghost(ghost_type) for ghost_type in GHOST_TYPES]

# Font for displaying score and lives
font = pygame.font.Font(None, 36)

# Main game loop
running = True
while running:
    # Handle events
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                running = False
            elif not game_over:
                if event.key == pygame.K_RIGHT:
                    pacman.steer((1, 0))
                elif event.key == pygame.K_LEFT:
                    pacman.steer((-1, 0))
                elif event.key == pygame.K_UP:
                    pacman.steer((0, -1))
                elif event.key == pygame.K_DOWN:
                    pacman.steer((0, 1))
            elif game_over and event.key == pygame.K_SPACE:
                # Reset the game
                game_over = False
                score = 0
                lives = 3
                pacman = PacMan()
                ghosts = [Ghost(ghost_type) for ghost_type in GHOST_TYPES]
                # Reset maze with the same connectivity guarantees.
                generate_maze()

    if not game_over:
        # Update Pac-Man
        pacman.auto_move()
        pacman.update()

        # Move ghosts
        for ghost in ghosts:
            ghost.move()

        # Check for collisions with ghosts
        for ghost in ghosts[:]:
            if ghost.x == pacman.x and ghost.y == pacman.y:
                if pacman.powered_up:
                    # Remove the ghost
                    ghosts.remove(ghost)
                    score += 200
                    # Respawn the ghost in the house; it is released after the usual wait
                    ghosts.append(Ghost(ghost.type, initial=False))
                else:
                    lives -= 1
                    if lives <= 0:
                        game_over = True
                    else:
                        # Reset positions and the ghost release schedule
                        pacman.x = 1
                        pacman.y = 1
                        for g in ghosts:
                            g.place(True)

        # Check if all dots are eaten
        dots_left = False
        for row in maze:
            if 2 in row or 3 in row:
                dots_left = True
                break

        if not dots_left:
            game_over = True

    # Clear the screen
    screen.fill(BLACK)

    # Draw the maze
    for y in range(GRID_HEIGHT):
        for x in range(GRID_WIDTH):
            cell_rect = pygame.Rect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
            if maze[y][x] == 1:  # Wall
                pygame.draw.rect(screen, BLUE, cell_rect)
            elif maze[y][x] == 2:  # Dot
                dot_rect = pygame.Rect(x * CELL_SIZE + CELL_SIZE // 2 - 2, y * CELL_SIZE + CELL_SIZE // 2 - 2, 4, 4)
                pygame.draw.rect(screen, WHITE, dot_rect)
            elif maze[y][x] == 3:  # Power pellet
                pygame.draw.circle(screen, WHITE, (x * CELL_SIZE + CELL_SIZE // 2, y * CELL_SIZE + CELL_SIZE // 2), 8)
            elif maze[y][x] == 4:  # Ghost-house door
                pygame.draw.rect(screen, DOOR_COLOR, (x * CELL_SIZE, y * CELL_SIZE + 16, CELL_SIZE, 8))

    # Draw Pac-Man
    pacman.draw()

    # Draw ghosts
    for ghost in ghosts:
        ghost.draw(scared=pacman.powered_up)

    # Display score and lives
    score_text = font.render(f"Score: {score}", True, WHITE)
    lives_text = font.render(f"Lives: {lives}", True, WHITE)
    screen.blit(score_text, (10, 10))
    screen.blit(lives_text, lives_text.get_rect(topright=(WIDTH - 10, 10)))

    # Display game over message
    if game_over:
        if lives <= 0:
            game_over_text = font.render("Game Over! Press SPACE to restart", True, RED)
        else:
            game_over_text = font.render("You Win! Press SPACE to restart", True, YELLOW)
        screen.blit(game_over_text, (WIDTH // 2 - 300, HEIGHT // 2))

    # Update the display
    pygame.display.flip()

    # Cap the frame rate
    clock.tick(FPS)

# Quit Pygame
pygame.quit()
sys.exit()