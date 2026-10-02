import pygame
import random
import sys

# Initialize Pygame
pygame.init()
# One KEYDOWN per press; holding a key must not repeat movement.
pygame.key.set_repeat()

# Constants
WIDTH, HEIGHT = 800, 600
CELL_SIZE = 40
GRID_WIDTH = WIDTH // CELL_SIZE
GRID_HEIGHT = HEIGHT // CELL_SIZE
FPS = 60

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

# Define the maze layout (0: empty, 1: wall, 2: dot, 3: power pellet)
def generate_maze():
    maze = []
    for y in range(GRID_HEIGHT):
        row = []
        for x in range(GRID_WIDTH):
            # Create walls around the edges
            if x == 0 or x == GRID_WIDTH - 1 or y == 0 or y == GRID_HEIGHT - 1:
                row.append(1)  # Wall
            # Create some random walls inside
            elif random.random() < 0.2 and not (x == 1 and y == 1):  # Avoid placing wall at Pac-Man's starting position
                row.append(1)  # Wall
            else:
                # Place dots everywhere else
                if random.random() < 0.1:
                    row.append(3)  # Power pellet
                else:
                    row.append(2)  # Regular dot
        maze.append(row)
    maze[1][1] = 0
    for x, y in [(GRID_WIDTH - 2, 1), (1, GRID_HEIGHT - 2),
                 (GRID_WIDTH - 2, GRID_HEIGHT - 2), (GRID_WIDTH // 2, GRID_HEIGHT // 2)]:
        if maze[y][x] == 1:
            maze[y][x] = 2

    # Connect isolated floor regions without changing the boundary or collectibles.
    while True:
        reached = {(1, 1)}
        queue = [(1, 1)]
        for x, y in queue:
            for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                nx, ny = x + dx, y + dy
                if (0 <= nx < GRID_WIDTH and 0 <= ny < GRID_HEIGHT
                        and maze[ny][nx] != 1 and (nx, ny) not in reached):
                    reached.add((nx, ny))
                    queue.append((nx, ny))
        target = next(((x, y) for y in range(1, GRID_HEIGHT - 1)
                       for x in range(1, GRID_WIDTH - 1)
                       if maze[y][x] != 1 and (x, y) not in reached), None)
        if target is None:
            return maze
        tx, ty = target
        x, y = min(queue, key=lambda cell: abs(cell[0] - tx) + abs(cell[1] - ty))
        while (x, y) != target:
            if x != tx:
                x += 1 if tx > x else -1
            else:
                y += 1 if ty > y else -1
            if maze[y][x] == 1:
                maze[y][x] = 2


maze = generate_maze()

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

    def move(self, dx, dy):
        new_x = self.x + dx
        new_y = self.y + dy

        # Check if the new position is valid (not a wall)
        if 0 <= new_x < GRID_WIDTH and 0 <= new_y < GRID_HEIGHT and maze[new_y][new_x] != 1:
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
    def __init__(self, x, y, color):
        self.x = x
        self.y = y
        self.color = color
        self.direction = random.choice([(1, 0), (-1, 0), (0, 1), (0, -1)])
        self.move_timer = 0

    def move(self):
        self.move_timer += 1
        if self.move_timer >= 15:  # Move every 15 frames
            self.move_timer = 0

            # Try to continue in the same direction
            new_x = self.x + self.direction[0]
            new_y = self.y + self.direction[1]

            # If the path is blocked, choose a new random direction
            if not (0 <= new_x < GRID_WIDTH and 0 <= new_y < GRID_HEIGHT and maze[new_y][new_x] != 1):
                # Get all possible directions
                possible_directions = []
                for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                    nx, ny = self.x + dx, self.y + dy
                    if 0 <= nx < GRID_WIDTH and 0 <= ny < GRID_HEIGHT and maze[ny][nx] != 1:
                        possible_directions.append((dx, dy))

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
ghosts = [
    Ghost(GRID_WIDTH - 2, 1, (255, 0, 0)),  # Red ghost
    Ghost(1, GRID_HEIGHT - 2, (255, 192, 203)),  # Pink ghost
    Ghost(GRID_WIDTH - 2, GRID_HEIGHT - 2, (0, 255, 255)),  # Cyan ghost
    Ghost(GRID_WIDTH // 2, GRID_HEIGHT // 2, (255, 165, 0))  # Orange ghost
]

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
                    pacman.move(1, 0)
                elif event.key == pygame.K_LEFT:
                    pacman.move(-1, 0)
                elif event.key == pygame.K_UP:
                    pacman.move(0, -1)
                elif event.key == pygame.K_DOWN:
                    pacman.move(0, 1)
            elif game_over and event.key == pygame.K_SPACE:
                # Reset the game
                game_over = False
                score = 0
                lives = 3
                pacman = PacMan()
                ghosts = [
                    Ghost(GRID_WIDTH - 2, 1, (255, 0, 0)),
                    Ghost(1, GRID_HEIGHT - 2, (255, 192, 203)),
                    Ghost(GRID_WIDTH - 2, GRID_HEIGHT - 2, (0, 255, 255)),
                    Ghost(GRID_WIDTH // 2, GRID_HEIGHT // 2, (255, 165, 0))
                ]
                # Reset maze with the same connectivity guarantees.
                maze = generate_maze()

    if not game_over:
        # Update Pac-Man
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
                    # Respawn the ghost after a delay
                    new_ghost = Ghost(GRID_WIDTH // 2, GRID_HEIGHT // 2, ghost.color)
                    ghosts.append(new_ghost)
                else:
                    lives -= 1
                    if lives <= 0:
                        game_over = True
                    else:
                        # Reset positions
                        pacman.x = 1
                        pacman.y = 1
                        for g in ghosts:
                            g.x = GRID_WIDTH - 2
                            g.y = 1

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

    # Draw Pac-Man
    pacman.draw()

    # Draw ghosts
    for ghost in ghosts:
        ghost.draw(scared=pacman.powered_up)

    # Display score and lives
    score_text = font.render(f"Score: {score}", True, WHITE)
    lives_text = font.render(f"Lives: {lives}", True, WHITE)
    screen.blit(score_text, (10, 10))
    screen.blit(lives_text, (WIDTH - 120, 10))

    # Display game over message
    if game_over:
        if lives <= 0:
            game_over_text = font.render("Game Over! Press SPACE to restart", True, RED)
        else:
            game_over_text = font.render("You Win! Press SPACE to restart", True, YELLOW)
        screen.blit(game_over_text, (WIDTH // 2 - 200, HEIGHT // 2))

    # Update the display
    pygame.display.flip()

    # Cap the frame rate
    clock.tick(FPS)

# Quit Pygame
pygame.quit()
sys.exit()