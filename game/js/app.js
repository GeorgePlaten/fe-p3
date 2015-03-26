/* MileStones:

BASIC TODO:
    DONE: Get game background rendering to canvas
    DONE: Get enemies added
    DONE: Get enemies moving
        DONE: Refactor code
    DONE: Get Player to render
    DONE: Get Player to move
        DONE: Disallow player to move off screen
        (weird zogabond painting on top row
            repainting with c.width = c.width; would fix this)
        DONE: Add drowning in top row
    DONE: Add collision detection
    DONE: Add game restart on collision
    DONE: Add game restart on drown
    DONE: Add a Sprite super class
        DONE: refactor code to work with improved class structure
    DONE: Make collision detection a method of Player
ADVANCED TODO:
    DONE: Add death modes (just a console.log() for now)
        DONE: Add water death
        DONE: Add collision death
        DONE: Add lives counter
            DONE: Show with hearts graphics
    DONE: Add score
        DONE: For moves made
            DONE: Add graphics
    DONE: Add Bonus spawner
        DONE: Add Bonus values and rarity / frequency
        DONE: Add random location
            DONE: Reject player's location
        DONE: Add timer for spawn and despawn (seems erratic)
        DONE: Gem capture remover
    DONE: Add intensity based on bonuses captured
    Allow enemies to travel both ways
    Prevent enemies doubling up on line rows


*/

// GAME SETTINGS //
var game = {
    // Difficulty: use a multiplier that increases based on time
    // elapsed (first) or score (later).
    score: 0,
    topScore: 0,
    // Intensity setting in video is 1, start at 0.5 so it doesn't get too
    // difficult too quickly.
    intensity: 0.5
};

// CONSTANTS //
// Images seem to have a headspace, don't know why yet.
var IMGHEAD = 20;
// Width of columns
var COLUMNS = 101;
// Height of rows
var ROWS = 83;

// GENERAL FUNCTIONS //
// Random Integer generator
// From http://stackoverflow.com/questions/4959975/
// Used because I was repeating myself making random nums
// Note: S/O shows a better method using default op |, but I want to understand
// how it works better before using it.
var randInt = function(min, max) {
    return Math.floor( (Math.random()*(max-min)) + min);
};

// SPRITES //
// This game uses JavaScript's Pseudoclassical Class pattern (pre-ECMA 6)
// Enemy, Player and Bonus Classes will delegate failed lookups to the
// Sprite Superclass. The Sprite superclass holds basic shared properties
// and move, render, moveCB and renderCB methods.
var Sprite = function() {
    this.sprite = '';
    this.speed = 0;
    this.x = 0;
    this.y = 0;
    // cd: Collision Detection rectangle
    this.cdColor = '';
    // Padding = offset from Sprite border
    this.cdLeftPadding = 0;
    this.cdTopPadding = 0;
    this.cdWidth = 0;
    this.cdHeight = 0;
    // Since none of the above properties are set, I could probably leave these
    // properties to be set by the subclasses, but I'm do it here to help see
    // properties in the debugger, and in case I'd like to set them
    // in a future version.
};

Sprite.prototype.render = function() {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y);
};

// Basic position updating for sprites
Sprite.prototype.move = function(dx, dy) {
    // Adding a delta x and y value to current position
    this.x += dx;
    this.y += dy;
};

Sprite.prototype.renderCB = function() {
    // Rendering the Collision Box with Context2D methods
    ctx.beginPath();
    ctx.rect(this.cdLeft, this.cdTop, this.cdWidth, this.cdHeight);
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.cdColor;
    ctx.stroke();
};

Sprite.prototype.moveCB = function() {
    this.cdLeft = this.x + this.cdLeftPadding;
    this.cdTop = this.y + this.cdTopPadding;
    this.cdRight = this.cdLeft + this.cdWidth;
    this.cdBottom = this.cdTop + this.cdHeight;
};


// ENEMY //

var Enemy = function() {
    // Delegate failed Enemy lookups to Sprite
    Sprite.call(this);

    // The image/sprite for our enemies, this uses
    // a helper Udacity provided to easily load images
    this.sprite = 'images/enemy-bug.png';

    // TODO: Speed pos/neg  will give direction.
    // Speed will increase as an intensity feature.
    // Start with 3 basic speeds picked at random.
    // What unit will I use: pixels per x(milliseconds)?
    // 600px/1000ms will cross the canvas in one second.
    // This seems to match the video approx (small canvas!)
    // TODO: figure out why it's 0.005 and not 5.0
    this.speed = randInt(1,4) / 0.005 * game.intensity;

    // TODO: will need to randomize off-stage left or right depending
    // on direction. But... the video only shows one direction.
    // So I'm using a constant value here (for now).
    this.x = -150.0;

    // Pick a random row from 1 to 3
    // NB: video doesn't care about using same row twice
    this.y = randInt(1,4) * ROWS - IMGHEAD;

    // Collision Detection Bounding Box (CDBB):
    // CDBB Color,
    this.cdColor = 'red';
    // CDBB Dimensions,
    this.cdWidth = 90;
    this.cdHeight = 50;
    // CDBB location relative to sprite origin
    this.cdLeftPadding = 5;
    this.cdTopPadding = 85;
};

// Superclass method delegation
Enemy.prototype = Object.create(Sprite.prototype);
Enemy.prototype.constructor = Enemy;

// Update the enemy's position
// Parameter: dt, a time delta between ticks
Enemy.prototype.update = function(dt) {
    // Any movement should be multiplies by the dt parameter.
    // This will ensure the game runs at the same speed for
    // all computers.
    this.move(this.speed * dt, 0);
    // Collision box tracking
    this.moveCB();
};


// PLAYER 1 //

var Player = function() {
    // Delegate failed Player lookups to Sprite
    Sprite.call(this);

    // Start position is tile 2,5 (Zero based row counting)
    this.startX = COLUMNS * 2;
    this.startY = ROWS * 5 - IMGHEAD;

    // Current position
    this.x = this.startX;
    this.y = this.startY;
    // Add a sprite, this will be choosable later...
    this.sprite = 'images/char-boy.png';

    // Collision Detection Bounding Box (CDBB):
    // CDBB Color,
    this.cdColor = 'blue';
    // CDBB Dimensions,
    this.cdWidth = 35;
    this.cdHeight = 50;
    // CDBB location relative to sprite origin
    this.cdLeftPadding = 35;
    this.cdTopPadding = 85;

    // A tester object of sprites that are being collided with
    this.isCollidingWith = {
        enemy: false,
        bonus: false
    };

    // a lives counter, start with 3, lose one for every death
    // also gain one when heart bonus captured
    this.lives = 3;
};

// Delegate failed method lookups to Sprite superclass
Player.prototype = Object.create(Sprite.prototype);
Player.prototype.constructor = Player;

Player.prototype.reset = function() {
    // Called after an hitting an enemy
    this.x = this.startX;
    this.y = this.startY;
    game.intensity = 0.5;
};

Player.prototype.jump = function(dx, dy) {
    // Use temp newX and newY to test proposed new position is within bounds
    // before making the move
    var newX = this.x + dx;
    var newY = this.y + dy;

    // Drown: reset the player if they move to top row of water
    if (newY <= 0 - IMGHEAD) {
        this.deathBy('drowning');
        this.reset();
        return;
    }

    // Make a move
        // Do move if proposed coordinates remain within the bounds
        // of the play area. Also allow for IMGHEAD.
    if (newX <= COLUMNS * 4 &&
        newX >= 0 &&
        newY <= ROWS * 5 - IMGHEAD &&
        newY >= 0 - IMGHEAD) {
        // Move the sprite
        this.move(dx, dy);

        //SCORE!
        // only score on road tiles
        if (newY <= ROWS * 3 - IMGHEAD) {
            this.scores(10);
        }
    }
};

Player.prototype.update = function() {
    // Update the collision detection box
    this.moveCB();
    // and check collisions
    this.checkCollisions();
};

Player.prototype.scores = function(score) {
    // this looks overly elaborate but it is help the code
    // self-document elsewhere
    game.score += score;
};

Player.prototype.checkCollisions = function() {
    var len = allEnemies.length;
    for (var i = 0; i < len; i++) {
        this.isCollidingWith.enemy = isColliding(this, allEnemies[i]);
        if (this.isCollidingWith.enemy) {
            this.deathBy('enemy');
            // Kick straight out, when true
            return;
        }
    }

    // Capturing a Bonus with collisions
    // Set the player property
    this.isCollidingWith.bonus = isColliding(this, bonus);

    // What should happen when you capture a bonus
    if (this.isCollidingWith.bonus) {
        // reset the player property for the next capture
        this.isCollidingWith.bonus = false;
        // Get some points for it
        this.scores(bonus.value);
        // Make the game a bit more fun
        game.intensity += 0.1;

        // Prevent continuous collisions by kicking the Sprite and CB off canvas
        bonus.y += 1000;
        bonus.cdTop += 1000;

        // Getting the rare key, gives you a clue
        if (bonus.sprite === 'images/Key.png') {
            console.log("up, up, down, down, left, right, left, right, B, A");
        }
        // Getting a heart can be a life saver
        if (bonus.sprite === 'images/Heart.png') {
            player.lives ++;
        }
        // return is required here to keep the game running smoothly
        // as checkCollisions is being called effectively in loop by
        // engine.js#requestAnimationFrame
        return;
    }
};

Player.prototype.handleInput = function(keyName) {
    switch(keyName) {
        case 'left':
            player.jump(-COLUMNS, 0);
            break;
        case 'right':
            player.jump(COLUMNS, 0);
            break;
        case 'up':
            player.jump(0, -ROWS);
            break;
        case 'down':
            player.jump(0, ROWS);
            break;
        default:
            break;
    }

};

Player.prototype.deathBy = function(cause) {
    this.lives--;

    switch(cause) {
        case 'enemy':
            console.log("Bug bite!");
            break;
        case 'drowning':
            console.log("glugugug");
            break;
        default:
            break;
    }

    this.reset();

    if (!this.lives) {
        console.log('See you in a milli... seconds....');
        if (game.score > game.topScore) {
            game.topScore = game.score;
        }
        game.score = 0;
        init();
    }
};


// Nothing to see here, I was more of a mega-drive fan myself
var seq = [];
var kcode = ['up','up','down','down','left','right','left','right','b','a'];
var eegg = function(key) {
    seq.push(key);
    var check = function(key){
        for (var i = 0; i < seq.length; i++) {
            if (seq[i] === kcode[i]) {
                if (seq.length === kcode.length) {
                    player.sprite = 'images/char-horn-girl.png';
                }
            } else {
                seq = [];
            }
        }
    }();
};

// This listens for key presses and sends the keys to your
// Player.handleInput() method.
document.addEventListener('keyup', function(e) {
    var allowedKeys = {
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down',
        65: 'a',
        66: 'b'
    };

    player.handleInput(allowedKeys[e.keyCode]);
    eegg(allowedKeys[e.keyCode]);
});

var spawnEnemies = function() {
    while (allEnemies.length < 3) {
        allEnemies.push(new Enemy());
    }
    allEnemies = allEnemies.filter(function(enemy) {
        return enemy.x < 650;
    });
};

var isColliding = function(caller, tester) {
    return !(
                caller.cdRight < tester.cdLeft ||
                tester.cdRight < caller.cdLeft ||
                caller.cdBottom < tester.cdTop ||
                tester.cdBottom < caller.cdTop
            );
};

var Hearts = function() {
    Sprite.call(this);

    this.sprite = 'images/Heart.png';
    this.x = 10;
    this.y = 50;
    // image dims: 101 x 171
};

Hearts.prototype = Object.create(Sprite.prototype);
Hearts.prototype.constructor = Hearts;

Hearts.prototype.update = function() {
    var offset = 0;
    for (var i = player.lives; i>0; i--) {
        ctx.drawImage(  Resources.get(this.sprite),
                        this.x + offset, this.y, 20, 35);
        offset += 20;
    }
};

var drawScoreBoard = function() {
    // Current Score
    var s = game.score.toString();
    ctx.font = '16px "Press Start 2P"';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'black';
    ctx.fillText(s.toUpperCase(), 495, 80, 200);
    ctx.fillStyle = 'gold';
    ctx.fillText(s.toUpperCase(), 493, 78, 200);

    // Top Score
    var ts = game.topScore.toString();
    if (game.score > game.topScore) {
        ts = game.score.toString();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = 'black';
    ctx.fillText(ts.toUpperCase(), 258, 80, 200);
    ctx.fillStyle = 'gold';
    ctx.fillText(ts.toUpperCase(), 256, 78, 200);
};

var bonuses = [
    {image: 'images/Gem Green.png', value: 50, frequency: 1.0},
    {image: 'images/Gem Blue.png', value: 200, frequency: 0.2},
    {image: 'images/Gem Orange.png', value: 100, frequency: 0.5},
    {image: 'images/Heart.png', value: 50, frequency: 0.1},
    {image: 'images/Key.png', value: 50, frequency: 0.05}
];

var Bonus = function() {
    Sprite.call(this);

    var getRandBonus = function() {
        return bonuses[randInt(0,5)];
    };

    var randBonus = getRandBonus();
    var rand = Math.random();

    while (randBonus.frequency < rand) {
        randBonus = getRandBonus();
    }

    this.sprite = randBonus.image;
    this.value  = randBonus.value;

    this.x = -500;
    this.y = -500;
    this.cdColor = 'yellow';
    // Padding = offset from Sprite border
    this.cdWidth = 75;
    this.cdHeight = 60;
    this.cdLeftPadding = 12;
    this.cdTopPadding = 80;

    this.moveCB();
};

Bonus.prototype = Object.create(Sprite.prototype);
Bonus.prototype.constructor = Bonus;

Bonus.prototype.locate = function() {
    var newX;
    var newY;
    var genNewLoc = function() {
        newX = randInt(0,5) * COLUMNS;
        newY = randInt(1,4) * ROWS - IMGHEAD;
    };
    var newLoc = genNewLoc();

    // Check not on player tile
    while (newX === player.x && newY === player.y) {
        genNewLoc();
    }

    this.x = newX;
    this.y = newY;

    this.moveCB();
};

Bonus.prototype.render = function() {
    // the Sprite Image with custom width and height
    ctx.drawImage(  Resources.get(this.sprite),
                    this.x + 15, this.y + 50,
                    70, 90);
};

var spawnBonuses = function() {
    if (bonus.x === -500) {
        bonus.locate();
    } else {
        bonus = new Bonus();
    }
};

// ../index.html engine.js@renderEntities @Sprite ###testme
