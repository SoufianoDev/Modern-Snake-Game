const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const timerElement = document.getElementById("timer");
const levelElement = document.getElementById("level");
const gameOverElement = document.getElementById("game-over");
const playAgainBtn = document.getElementById("play-again-btn");
const startLayout = document.getElementById("start-layout");
const startGameBtn = document.getElementById("start-game-btn");

let score = 0;
let highScore = localStorage.getItem("highScore") || 0;
let timeLeft = 60; // Remaining time
let level = 1; // Current level
let isLunging = false; // Is the snake lunging?
let lungeDirection = { x: 0, y: 0 }; // Lunge direction
let keyPressCount = 0; // Number of key presses (for desktop)
let lastKeyPressTime = 0; // Last key press time (for desktop)
let swipeCount = 0; // Number of swipes (for mobile)
let lastSwipeTime = 0; // Last swipe time (for mobile)
let lastSwipeDirection = null; // Last swipe direction (for mobile)
let isEating = false; // Is the snake eating a worm?
let eatProgress = 0; // Eating effect progress
let gameActive = false; // Is the game active? (Initially false)
let obstacles = []; // Moving obstacles
let powerUps = []; // Special items

// Points required to unlock each level
const levelRequirements = [0, 50, 100, 200, 500]; // Level 1 starts at 0 points, Level 2 at 50 points, etc.

// Dynamic segment size based on screen size
const getSegmentSize = () => {
  const screenWidth = window.innerWidth;
  if (screenWidth <= 600) {
    // Phone screen
    return 30; // Larger size on phones
  } else {
    return 20; // Default size for larger screens
  }
};

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Draw moving background
function drawBackground() {
  const gradient = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    50,
    canvas.width / 2,
    canvas.height / 2,
    Math.max(canvas.width, canvas.height) / 2
  );
  gradient.addColorStop(0, "#1a1a1a");
  gradient.addColorStop(1, "#000000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Base Worm class
class Worm {
  constructor(type = "normal") {
    this.type = type; // Worm type (normal, golden, poisonous)
    this.segmentCount = type === "poisonous" ? 40 : 20; // Longer worm for poisonous type
    this.segmentSize = getSegmentSize(); // Dynamic size
    this.spacing = 15;
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.direction = this.getRandomDirection();
    this.speed = 2;
    this.history = [];
    this.eyeOffset = 0;
    this.lookAtSnake = false;
    this.changeDirectionTime = Date.now() + 2000;
  }

  getRandomDirection() {
    const directions = [
      { x: 1, y: 0 }, // Right
      { x: -1, y: 0 }, // Left
      { x: 0, y: 1 }, // Down
      { x: 0, y: -1 }, // Up
    ];
    return directions[Math.floor(Math.random() * directions.length)];
  }

  update(snakeHead) {
    if (Date.now() > this.changeDirectionTime) {
      this.direction = this.getRandomDirection();
      this.changeDirectionTime = Date.now() + 2000;
    }

    this.x += this.direction.x * this.speed;
    this.y += this.direction.y * this.speed;

    if (this.x < -this.segmentSize) this.x = canvas.width + this.segmentSize;
    if (this.x > canvas.width + this.segmentSize) this.x = -this.segmentSize;
    if (this.y < -this.segmentSize) this.y = canvas.height + this.segmentSize;
    if (this.y > canvas.height + this.segmentSize) this.y = -this.segmentSize;

    this.history.unshift({ x: this.x, y: this.y });
    if (this.history.length > this.segmentCount) {
      this.history.pop();
    }

    if (snakeHead) {
      const dx = snakeHead.x - this.x;
      const dy = snakeHead.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 150) {
        const angle = Math.atan2(dy, dx);
        this.direction = { x: -Math.cos(angle), y: -Math.sin(angle) };
        this.lookAtSnake = true;
      } else {
        this.lookAtSnake = false;
      }
    }
  }

  draw(snakeHead) {
    let color = "rgba(255, 105, 180, 0.8)"; // Normal worm color
    if (this.type === "golden") {
      color = "rgba(255, 215, 0, 0.8)"; // Golden worm color
    } else if (this.type === "poisonous") {
      color = "rgba(0, 0, 255, 0.8)"; // Poisonous worm color
    }

    this.history.forEach((pos, index) => {
      const radius = this.segmentSize / 2;
      const alpha = 1 - (index / this.segmentCount) * 0.8;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.closePath();

      // Add glow to the worm
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
    });

    const head = this.history[0];
    if (head) {
      const eyeRadius = 6;
      const pupilRadius = 3;
      const eyeYOffset = -5;

      this.eyeOffset = Math.sin(Date.now() / 200) * 5;

      let lookDirection = { x: 0, y: 0 };
      if (this.lookAtSnake && snakeHead) {
        const dx = snakeHead.x - head.x;
        const dy = snakeHead.y - head.y;
        const angle = Math.atan2(dy, dx);
        lookDirection = { x: Math.cos(angle), y: Math.sin(angle) };
      } else {
        lookDirection = { x: this.eyeOffset / 5, y: 0 };
      }

      ctx.beginPath();
      ctx.arc(head.x - 8, head.y + eyeYOffset, eyeRadius, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.closePath();

      ctx.beginPath();
      ctx.arc(
        head.x - 8 + lookDirection.x * 5,
        head.y + eyeYOffset + lookDirection.y * 5,
        pupilRadius,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = "black";
      ctx.fill();
      ctx.closePath();

      ctx.beginPath();
      ctx.arc(head.x + 8, head.y + eyeYOffset, eyeRadius, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.closePath();

      ctx.beginPath();
      ctx.arc(
        head.x + 8 + lookDirection.x * 5,
        head.y + eyeYOffset + lookDirection.y * 5,
        pupilRadius,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = "black";
      ctx.fill();
      ctx.closePath();
    }
  }
}

// Golden Worm class (inherits from Worm)
class GoldenWorm extends Worm {
  constructor() {
    super("golden");
  }
}

// Poisonous Worm class (inherits from Worm)
class PoisonousWorm extends Worm {
  constructor() {
    super("poisonous");
  }
}

class Snake {
  constructor() {
    this.segmentCount = 40; // Longer snake initially
    this.segmentSize = getSegmentSize() * 1.5; // Larger size for the snake
    this.spacing = 15;
    this.x = canvas.width / 4;
    this.y = canvas.height / 4;
    this.direction = { x: 1, y: 0 };
    this.speed = 3;
    this.history = [];
    this.mouthOpen = 0; // Mouth open degree
    this.eyeColor = "black"; // Eye color
  }

  update() {
    if (isLunging) {
      this.x += lungeDirection.x * this.speed * 3;
      this.y += lungeDirection.y * this.speed * 3;
    } else {
      this.x += this.direction.x * this.speed;
      this.y += this.direction.y * this.speed;
    }

    if (this.x < -this.segmentSize) this.x = canvas.width + this.segmentSize;
    if (this.x > canvas.width + this.segmentSize) this.x = -this.segmentSize;
    if (this.y < -this.segmentSize) this.y = canvas.height + this.segmentSize;
    if (this.y > canvas.height + this.segmentSize) this.y = -this.segmentSize;

    this.history.unshift({ x: this.x, y: this.y });
    if (this.history.length > this.segmentCount) {
      this.history.pop();
    }
  }

  draw() {
    this.history.forEach((pos, index) => {
      const radius = this.segmentSize / 2;
      const alpha = 1 - (index / this.segmentCount) * 0.8;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`; // Bright green color
      ctx.fill();
      ctx.closePath();

      // Add glow to the snake
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(0, 255, 0, 0.8)";
    });

    const head = this.history[0];
    if (head) {
      const eyeRadius = 6;
      const pupilRadius = 3;
      const eyeYOffset = -5;

      // Eye color (always black unless near a worm or lunging)
      const eyeColor = this.eyeColor;

      // Left eye
      ctx.beginPath();
      ctx.arc(head.x - 8, head.y + eyeYOffset, eyeRadius, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.closePath();

      // Left pupil
      ctx.beginPath();
      ctx.arc(
        head.x - 8 + this.direction.x * 3,
        head.y + eyeYOffset + this.direction.y * 3,
        pupilRadius,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = eyeColor;
      ctx.fill();
      ctx.closePath();

      // Right eye
      ctx.beginPath();
      ctx.arc(head.x + 8, head.y + eyeYOffset, eyeRadius, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.closePath();

      // Right pupil
      ctx.beginPath();
      ctx.arc(
        head.x + 8 + this.direction.x * 3,
        head.y + eyeYOffset + this.direction.y * 3,
        pupilRadius,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = eyeColor;
      ctx.fill();
      ctx.closePath();

      // Draw mouth and fangs based on snake direction
      if (this.mouthOpen > 0) {
        // Open mouth with fangs
        const mouthWidth = 10 * this.mouthOpen;
        const mouthHeight = 5 * this.mouthOpen;
        ctx.beginPath();
        ctx.ellipse(
          head.x,
          head.y + 10,
          mouthWidth,
          mouthHeight,
          0,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = "red";
        ctx.fill();
        ctx.closePath();

        // Draw fangs
        ctx.beginPath();
        ctx.moveTo(head.x - 5, head.y + 10 - mouthHeight);
        ctx.lineTo(head.x - 8, head.y + 10 - mouthHeight - 10);
        ctx.lineTo(head.x - 2, head.y + 10 - mouthHeight);
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.closePath();

        ctx.beginPath();
        ctx.moveTo(head.x + 5, head.y + 10 - mouthHeight);
        ctx.lineTo(head.x + 8, head.y + 10 - mouthHeight - 10);
        ctx.lineTo(head.x + 2, head.y + 10 - mouthHeight);
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.closePath();
      } else {
        // Mouth in normal state (black line with white fangs)
        ctx.beginPath();
        ctx.moveTo(head.x - 5, head.y + 10);
        ctx.lineTo(head.x + 5, head.y + 10);
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();

        // Draw fangs
        ctx.beginPath();
        ctx.moveTo(head.x - 4, head.y + 10);
        ctx.lineTo(head.x - 6, head.y + 15);
        ctx.lineTo(head.x - 2, head.y + 10);
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.closePath();

        ctx.beginPath();
        ctx.moveTo(head.x + 4, head.y + 10);
        ctx.lineTo(head.x + 6, head.y + 15);
        ctx.lineTo(head.x + 2, head.y + 10);
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.closePath();
      }
    }
  }

  increaseLength() {
    this.segmentCount += 5;
  }

  decreaseLength() {
    this.segmentCount = Math.max(5, this.segmentCount - 5);
  }
}

// Create worms with guaranteed normal worms
const worms = [];
const totalWorms = 5; // Total number of worms
const guaranteedNormalWorms = 3; // Number of guaranteed normal worms

// Add guaranteed normal worms
for (let i = 0; i < guaranteedNormalWorms; i++) {
  worms.push(new Worm());
}

// Add additional worms with random types
for (let i = guaranteedNormalWorms; i < totalWorms; i++) {
  const random = Math.random();
  if (random < 0.05) {
    // 5% chance for golden worm (نادرة)
    worms.push(new GoldenWorm());
  } else if (random < 0.55) {
    // 50% chance for poisonous worm
    worms.push(new PoisonousWorm());
  } else {
    worms.push(new Worm()); // 45% chance for normal worm
  }
}

const snake = new Snake();

// Control snake with arrow keys (for desktop)
window.addEventListener("keydown", (e) => {
  if (!gameActive) return; // Ignore input if game is not active

  const currentTime = Date.now();
  if (currentTime - lastKeyPressTime > 300) {
    keyPressCount = 0;
  }

  if (e.key === "ArrowUp" && snake.direction.y !== 1) {
    snake.direction = { x: 0, y: -1 };
    keyPressCount++;
  } else if (e.key === "ArrowDown" && snake.direction.y !== -1) {
    snake.direction = { x: 0, y: 1 };
    keyPressCount++;
  } else if (e.key === "ArrowLeft" && snake.direction.x !== 1) {
    snake.direction = { x: -1, y: 0 };
    keyPressCount++;
  } else if (e.key === "ArrowRight" && snake.direction.x !== -1) {
    snake.direction = { x: 1, y: 0 };
    keyPressCount++;
  }

  lastKeyPressTime = currentTime;

  if (keyPressCount >= 3) {
    lungeDirection = { ...snake.direction };
    isLunging = true;
    keyPressCount = 0;
    setTimeout(() => {
      isLunging = false;
    }, 300);
  }
});

// Control with swipes on mobile
const hammer = new Hammer(canvas);
hammer.get("swipe").set({ direction: Hammer.DIRECTION_ALL });
hammer.on("swipe", (event) => {
  if (!gameActive) return; // Ignore input if game is not active

  const currentTime = Date.now();
  if (currentTime - lastSwipeTime > 300) {
    swipeCount = 0;
  }

  let direction = null;
  if (event.direction === Hammer.DIRECTION_UP) {
    direction = { x: 0, y: -1 };
  } else if (event.direction === Hammer.DIRECTION_DOWN) {
    direction = { x: 0, y: 1 };
  } else if (event.direction === Hammer.DIRECTION_LEFT) {
    direction = { x: -1, y: 0 };
  } else if (event.direction === Hammer.DIRECTION_RIGHT) {
    direction = { x: 1, y: 0 };
  }

  if (
    direction &&
    JSON.stringify(direction) === JSON.stringify(lastSwipeDirection)
  ) {
    swipeCount++;
  } else {
    swipeCount = 1;
  }

  lastSwipeDirection = direction;
  lastSwipeTime = currentTime;

  if (swipeCount >= 3) {
    lungeDirection = { ...direction };
    isLunging = true;
    swipeCount = 0;
    setTimeout(() => {
      isLunging = false;
    }, 300);
  }

  // Update snake direction
  if (direction) {
    snake.direction = direction;
  }
});

function checkCollision() {
  const head = snake.history[0];
  worms.forEach((worm, index) => {
    worm.history.forEach((wormSegment) => {
      if (head) {
        const dx = head.x - wormSegment.x;
        const dy = head.y - wormSegment.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < snake.segmentSize / 2 + worm.segmentSize / 2) {
          isEating = true; // Activate eating effect
          eatProgress = 0; // Start eating effect
          worms.splice(index, 1); // Remove eaten worm
          if (worm.type === "golden") {
            score += 50; // Add 50 points for golden worm
          } else if (worm.type === "poisonous") {
            score -= 20; // Deduct 20 points for poisonous worm
            snake.decreaseLength(); // Decrease snake length
          } else {
            score += 10; // Add 10 points for normal worm
          }
          // Add a new worm to maintain five worms
          const random = Math.random();
          if (random < 0.05) {
            // 5% chance for golden worm
            worms.push(new GoldenWorm());
          } else if (random < 0.55) {
            // 50% chance for poisonous worm
            worms.push(new PoisonousWorm());
          } else {
            worms.push(new Worm()); // 45% chance for normal worm
          }
        }
      }
    });
  });
}

function resetGame() {
  score = 0;
  timeLeft = 60;
  level = 1;
  gameActive = true;
  gameOverElement.style.display = "none";
  playAgainBtn.style.display = "none";
  scoreElement.textContent = `Score: ${score}`;
  timerElement.textContent = `Time: ${Math.ceil(timeLeft)}`;
  levelElement.textContent = `Level: ${level}`;
  worms.length = 0;
  for (let i = 0; i < guaranteedNormalWorms; i++) {
    worms.push(new Worm());
  }
  for (let i = guaranteedNormalWorms; i < totalWorms; i++) {
    const random = Math.random();
    if (random < 0.05) {
      worms.push(new GoldenWorm());
    } else if (random < 0.55) {
      worms.push(new PoisonousWorm());
    } else {
      worms.push(new Worm());
    }
  }
  snake.history = [];
  snake.x = canvas.width / 4;
  snake.y = canvas.height / 4;
  snake.direction = { x: 1, y: 0 };
  animate();
}

function startGame() {
  startLayout.style.display = "none"; // Hide start layout
  scoreElement.style.display = "block"; // Show score
  timerElement.style.display = "block"; // Show timer
  levelElement.style.display = "block"; // Show level
  gameActive = true; // Start the game
  animate(); // Start the game loop
}

function animate() {
  if (!gameActive) {
    gameOverElement.style.display = "block";
    playAgainBtn.style.display = "block";
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background
  drawBackground();

  const snakeHead = snake.history[0];
  worms.forEach((worm) => worm.update(snakeHead));

  if (!isEating) {
    worms.forEach((worm) => worm.draw(snakeHead)); // Draw worms only if not being eaten
  }

  snake.update();
  snake.draw();

  if (snakeHead) {
    worms.forEach((worm) => {
      const dx = snakeHead.x - worm.x;
      const dy = snakeHead.y - worm.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Open mouth and change eye color based on distance
      if (distance < 100) {
        // If snake is near a worm
        snake.mouthOpen = Math.max(0, 1 - distance / 100);
        snake.eyeColor = "red"; // Red eyes
      } else {
        snake.mouthOpen = 0; // Close mouth
        snake.eyeColor = "black"; // Black eyes
      }

      // Activate effects when lunging
      if (isLunging) {
        snake.mouthOpen = 1; // Fully open mouth
        snake.eyeColor = "red"; // Red eyes
      }
    });
  }

  // Eating effect
  if (isEating) {
    eatProgress += 0.02; // Increase eating effect progress
    if (eatProgress >= 1) {
      isEating = false; // End eating effect
      if (score < 0) score = 0; // Ensure score doesn't go negative
      scoreElement.textContent = `Score: ${score}`; // Update score

      // Check if a new level is unlocked
      if (score >= levelRequirements[level]) {
        level++;
        levelElement.textContent = `Level: ${level}`;
        // Double time when a new level is unlocked
        timeLeft *= 2;
        timerElement.textContent = `Time: ${Math.ceil(timeLeft)}`;
      }
    } else {
      // Draw eating effect
      const alpha = 1 - eatProgress;
      worms.forEach((worm) => {
        worm.history.forEach((pos, index) => {
          const radius = (worm.segmentSize / 2) * alpha;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 105, 180, ${alpha})`;
          ctx.fill();
          ctx.closePath();
        });
      });
    }
  }

  // Update time
  timeLeft -= 0.016; // Decrease time by 1 second per frame (60 frames per second)
  timerElement.textContent = `Time: ${Math.ceil(timeLeft)}`;

  // Check if time is up
  if (timeLeft <= 0) {
    gameActive = false;
  }

  checkCollision();

  requestAnimationFrame(animate);
}

playAgainBtn.addEventListener("click", resetGame);
startGameBtn.addEventListener("click", startGame);

