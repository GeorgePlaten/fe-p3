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
        DONE: Add Bonus values and rarity / frequency engine
        DONE: Add random location
            DONE: Reject player's location
        DONE: Add timer for spawn and despawn (seems erratic)
        DONE: Gem capture remover
    DONE: Add intensity based on bonuses captured
    Allow enemies to travel both ways
    Prevent enemies doubling up on line rows

*/

/* Contents / Summary

Generic Functions
    randInt() // for getting random intergers
Game Constants
    IMGHEAD, COLUMNS, ROWS // image handling and layout
Game Settings
    .score, .topscore, .intensity
Game Data
    allEnemies[] (empty holder for enemies to spawn into),
    bonuses[] (list of all available bonus objects)
General Game Functions
    Keyboard event listener on document
    isCollding() // collision detection function
    drawScoreBoard() // Draws current score and top score
Sprites (SuperClass)
    image source, speed, xy position, collision box data,
    render(), move(), renderCB(), moveCB()
  Enemy (Class)
    update() // things to be updated by game engine
  Player (Class)
    .isCollidingWith.enemy/bonus, .hearts,
    reset(), // things to reset with deaths
    deathBy(), // death handler
    jump(), // moves the player (and scores on road tiles)
    update(), // updates for the game engine
    scores(), // changes the current game score
    checkCollisions() // checks for enemy and bonus collisions
        AND performs whatever reactions are required
    handleInput(), // converts key inputs to jump()s
  Bonus (Class)
    // each bonus instance is generated randomly from bonuses[]
    // a frequency / rarity engine is used during instantiation
    .value // value to be added to game score when captured
    locate() // moves the bonus to a scoring position, and checks
        to prevent it being located where the player is.
    .render() // had own render method to enable custom image size
  Heart (Class)
    render() // custom position and size for players hearts counter
Spawners
    spawnEnemies() // keeps a count of at least 3 enemies in
        allEnemies[] by losing any enemies that have exited canvas
        right and creating a new enemy when the count is less that 3
        spawnEnemies() is called on every frame by the game engine
    spawnBonuses() // This is called every 5 to 8 seconds
        by a setInterval timer in init() in engine.js.
*/

// GENERIC FUNCTIONS //
// Random Integer generator //
// From http://stackoverflow.com/questions/4959975/
// Used because I was repeating myself making random nums
// Note: S/O shows a better method using default op |, but I want to understand
// how it works better before using it.
var randInt = function(min, max) {
    return Math.floor( (Math.random()*(max-min)) + min);
};

// GAME CONSTANTS //
// Images seem to have a headspace, don't know why yet.
var IMGHEAD = 20;
// Width of columns
var COLUMNS = 101;
// Height of rows
var ROWS = 83;

// GAME SETTINGS //
var game = {
    // Difficulty: use a multiplier that increases based on time
    // elapsed (DONE: first) or score (DONE: later).
    score: 0,
    topScore: 0,
    // Intensity setting in video is 1, start at 0.5 so it doesn't get too
    // difficult too quickly.
    intensity: 0.5
};

// GAME DATA //
// A container to be populated with enemies
var allEnemies = [];

// Bonus types available, with images sources, score values and
// a frequency value. Lower frequency increases item rarity.
var bonuses = [
    {image: 'images/Gem Green.png', value: 50, frequency: 1.0},
    {image: 'images/Gem Blue.png', value: 200, frequency: 0.2},
    {image: 'images/Gem Orange.png', value: 100, frequency: 0.5},
    {image: 'images/Heart.png', value: 50, frequency: 0.1},
    {image: 'images/Key.png', value: 50, frequency: 0.05}
];

// GENERAL GAME FUNCIONS //

// Controls> Input> keyboard listener
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

var isColliding = function(caller, tester) {
    return !(
                caller.cdRight < tester.cdLeft ||
                tester.cdRight < caller.cdLeft ||
                caller.cdBottom < tester.cdTop ||
                tester.cdBottom < caller.cdTop
            );
};

var drawScoreBoard = function() {
    // Current Score
    var s = game.score.toString();
    ctx.font = '16px "Press Start 2P"';
    ctx.textAlign = 'right';
    // Score shadow text
    ctx.fillStyle = 'black';
    ctx.fillText(s.toUpperCase(), 495, 80, 200);
    // score text
    ctx.fillStyle = 'gold';
    ctx.fillText(s.toUpperCase(), 493, 78, 200);

    // Top Score
    var ts = game.topScore.toString();
    // If the game currently being played has a score to beat the
    // top score, then keep updating top score too
    if (game.score > game.topScore) {
        ts = game.score.toString();
    }
    ctx.textAlign = 'center';
    // Score Text shadow
    ctx.fillStyle = 'black';
    ctx.fillText(ts.toUpperCase(), 258, 80, 200);
    // Score text
    ctx.fillStyle = 'gold';
    ctx.fillText(ts.toUpperCase(), 256, 78, 200);
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

// SPRITES (SUPERCLASS for Player, Enemy, Bonus, and Hearts) //

// This game uses JavaScript's Pseudoclassical Class pattern (pre-ECMA 6)
// Enemy, Player and Bonus Classes will delegate failed lookups to the
// Sprite SuperClass.
var Sprite = function() {
    this.sprite = ''; // url to Sprite Image
    this.speed = 0;
    this.x = 0;
    this.y = 0;
    // cb: Collision Box
    this.cbColor = '';
    this.cbLeftPadding = 0; // Padding = offset from Sprite border
    this.cbTopPadding = 0;
    this.cbWidth = 0;
    this.cbHeight = 0;
    // Since none of the above properties are set, I could probably leave these
    // properties to be set by the subclasses, but I'm do it here to help see
    // properties in the debugger (in which case, would 'null' be better?),
    // and in case I'd like to set them in a future version.
};

Sprite.prototype.render = function() {
    // HTML5 Canvas method for drawing images
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y);
};

// Basic position updating for sprites
Sprite.prototype.move = function(dx, dy) {
    // Adding a delta x and y value to current position
    this.x += dx;
    this.y += dy;
};

Sprite.prototype.renderCB = function() {
    // Rendering the Collision Box with Canvas Context2D methods
    ctx.beginPath();
    ctx.rect(this.cdLeft, this.cdTop, this.cbWidth, this.cbHeight);
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.cbColor;
    ctx.stroke();
};

// Moving the Collision Box
Sprite.prototype.moveCB = function() {
    this.cdLeft = this.x + this.cbLeftPadding;
    this.cdTop = this.y + this.cbTopPadding;
    this.cdRight = this.cdLeft + this.cbWidth;
    this.cdBottom = this.cdTop + this.cbHeight;
};


// SPRITES: ENEMY //
var Enemy = function() {
    // Delegate failed Enemy lookups to Sprite (PsuedoClassical OOJ)
    Sprite.call(this);

    // The image/sprite for our enemies. Note all Sprites use
    // a helper function Udacity provided for loading and caching images
    // in resources.js
    this.sprite = 'images/enemy-bug.png';

    // TODO: Speed pos/neg  will give direction.
    // Speed will increase as an intensity feature.
    // Start with 3 basic speeds picked at random.
    // What unit will I use: pixels per x(milliseconds)?
    // 600px/1000ms will cross the canvas in one second.
    // This seems to match the video approx (small canvas!)
    // TODO: figure out why it's 0.005 and not 5.0
    this.speed = randInt(1,4) / 0.005 * game.intensity;

    // Starting point: X
    // TODO: will need to randomize off-stage left or right depending
    // on direction. But... the video only shows one direction.
    // So I'm using a constant value here (for now).
    this.x = -150.0;

    // Starting point: Y
    // Pick a random row from 1 to 3
    // NB: video doesn't care about using same row twice
    this.y = randInt(1,4) * ROWS - IMGHEAD;

    // Collision detection bounding Box (CdbB):
    // CdbB Color,
    this.cbColor = 'red';
    // CdbB location relative to sprite origin
    this.cbLeftPadding = 5;
    this.cbTopPadding = 85;
    // CdbB Dimensions,
    this.cbWidth = 90;
    this.cbHeight = 50;
};

// Superclass method delegation //
// Give Enemy a prototype object (based on Sprite's prototype)
Enemy.prototype = Object.create(Sprite.prototype);
// Set constructor values to refer back to Enemy Class
Enemy.prototype.constructor = Enemy;

// Update the enemy's position //
// Parameter dt: a time delta between ticks
Enemy.prototype.update = function(dt) {
    // Any movement should be multiplies by the dt parameter.
    // This will ensure the game runs at the same speed for
    // all computers.
    this.move(this.speed * dt, 0);
    // Collision box tracking
    this.moveCB();
};


// SPITES: PLAYER 1 //
var Player = function() {
    // Delegate failed Player lookups to Sprite
    Sprite.call(this);

    // Start position is tile 2,5 (Zero based row counting)
    this.startX = COLUMNS * 2;
    this.startY = ROWS * 5 - IMGHEAD;

    // Current position
    this.x = this.startX;
    this.y = this.startY;
    // Add a sprite, TODO: this will be choosable later...
    this.sprite = 'images/char-boy.png';

    // Collision Detection Bounding Box (CdbB):
    this.cbColor = 'blue';
    this.cbLeftPadding = 35;
    this.cbTopPadding = 85;
    this.cbWidth = 35;
    this.cbHeight = 50;

    // A tester object of sprites that are being collided with
    this.isCollidingWith = {
        enemy: false,
        bonus: false
    };

    // a hearts counter, start with 3, lose one for every death
    // also gain one when heart bonus captured
    this.hearts = 3;
};

// Give Player a prototype object (from Sprite prototype)
Player.prototype = Object.create(Sprite.prototype);
// Set constructors to refer back to Player
Player.prototype.constructor = Player;

Player.prototype.reset = function() {
    // Called by Player.prototype.deathBy. Note this isn't death,
    // this is just a part of death.
    this.x = this.startX;
    this.y = this.startY;
    game.intensity = 0.5;
};

// This IS death
Player.prototype.deathBy = function(cause) {
    this.hearts--;

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

    // if player has no hearts left GAME OVER
    if (!this.hearts) {
        console.log('See you in a milli... seconds....');
        // Check if score is better than top score
        if (game.score > game.topScore) {
            // if so, change the top score
            game.topScore = game.score;
        }
        // Reset the game score to zerp
        game.score = 0;
        // Restart the Game Engine in engine.js
        init();
    }
};

// Move the player (called by Player.prototype.handleInput)
Player.prototype.jump = function(dx, dy) {
    // Use temp newX and newY for testing if player CAN jump to
    // new location before making the jump
    var newX = this.x + dx;
    var newY = this.y + dy;

    // Jumping into water? Death to player if newY is in top row of water
    if (newY <= 0 - IMGHEAD) {
        this.deathBy('drowning');
        this.reset();
        return;
    }

    // Do the Jump
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

// Per frame updates for the game engine
Player.prototype.update = function() {
    // Update the collision detection box
    this.moveCB();
    // and check collisions
    this.checkCollisions();
};

// A simple scoring function //
// this looks overly elaborate but it is help the code self-document
Player.prototype.scores = function(score) {
    game.score += score;
};

// Checks collisions for both Enemies and Bonuses
// Checking collision is done on every frame via Player.prototype.update
Player.prototype.checkCollisions = function() {
    // loop through each enemy, testing for collisions
    var len = allEnemies.length;
    for (var i = 0; i < len; i++) {
        // check collisions and set isCollidingWith.enemy property
        this.isCollidingWith.enemy = isColliding(this, allEnemies[i]);
        if (this.isCollidingWith.enemy) {
            this.deathBy('enemy');
            // Kick straight out, when true
            return;
        }
    }

    // Capturing a Bonus with collisions
    // check collisions and set isCollidingWith.bonus property
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

// SPRITES: BONUS //
var Bonus = function() {
    Sprite.call(this);

    // Random Bonus Rarity Engine //
    var getRandBonus = function() {
        return bonuses[randInt(0,5)];
    };

    // Prevent low frequency / high rarity items from being added.
    // Get a random bonus and a random number
    var randBonus = getRandBonus();
    var rand = Math.random();

    // Check the bonus's frequency is higher than the random number
    while (randBonus.frequency < rand) {
        // Otherwise get another random bonus
        randBonus = getRandBonus();
    }

    this.sprite = randBonus.image;
    this.value  = randBonus.value; // points awarded if captured

    // Starting position off screen
    // See spawnBonuses() for more info behind the logic
    this.x = -500;
    this.y = -500;
    this.cbColor = 'yellow';
    this.cbWidth = 75;
    this.cbHeight = 60;
    this.cbLeftPadding = 12;
    this.cbTopPadding = 80;

    this.moveCB();
};

Bonus.prototype = Object.create(Sprite.prototype);
Bonus.prototype.constructor = Bonus;

Bonus.prototype.locate = function() {
    // Set up proposed X,Y coordinated to ensure the tile to
    // appear on is not already occupied by the player
    var newX;
    var newY;
    var genNewLoc = function() {
        // new location can be on road tiles only
        // (rows 1, 2, and 3)
        newX = randInt(0,5) * COLUMNS;
        newY = randInt(1,4) * ROWS - IMGHEAD;
    };
    genNewLoc();

    // If the proposed location is where the player already is
    while (newX === player.x && newY === player.y) {
        // propose a new random location
        genNewLoc();
    }

    // The proposed location is acceptable, proceed
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

// SPRITES: HEARTS //
// This is the hearts indicator at top left of canvas, not to be
// confused with Heart Bonuses (bonuses[])
var Hearts = function() {
    Sprite.call(this);

    this.sprite = 'images/Heart.png'; // natural image dims: 101 x 171
    this.x = 10;
    this.y = 50;
};

Hearts.prototype = Object.create(Sprite.prototype);
Hearts.prototype.constructor = Hearts;

Hearts.prototype.render = function() {
    // draw a heart for each heart with a loop
    // and offset each heart 20px to the right of the previous one
    var offset = 0;
    for (var i = player.hearts; i>0; i--) {
        ctx.drawImage(  Resources.get(this.sprite),
                        this.x + offset, this.y, 20, 35);
        offset += 20;
    }
};

// SPAWNERS //
var spawnEnemies = function() {
    // Ensure allEnemies[] always has 3 enemies in it
    while (allEnemies.length < 3) {
        allEnemies.push(new Enemy());
    }
    // Rebuild the allEnemies on each frame, but only include enemies
    // that are not gone off canvas to the right
    allEnemies = allEnemies.filter(function(enemy) {
        return enemy.x < 650;
    });
};

// Because this is called by an setInterval, it effectively gives
// us 2 phases:
// Phase 1: If a bonus exists, it is deleted and a new bonus is
    // created at the Spawn location off-canvas
    // ... 5-8 seconds later
// Phase 2: The bonus is moved to the canvas where the player
    // can try to capture it. (If captured, it is moved off-screen again
    // to a capture-location, by player.checkCollisions)
    // ... 5-8 seconds later, go back to Phase 1
var spawnBonuses = function() {
    // If there is a bonus at the Bonus spawn location, it will
    // move it to a scoring location.
    if (bonus.x === -500) {
        bonus.locate();
    } else {
        // Otherwise it will delete any current bonuses
        // and create a new one at the spawn location
        delete(bonus);
        bonus = new Bonus();
    }
};
