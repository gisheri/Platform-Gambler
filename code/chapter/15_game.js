Game = {
  scale: 20,
  maxStep: 0.05,  
  playerXSpeed : 7,
  gravity : 30,
  jumpSpeed : 17,

}

var Level = {
  init: function(plan){
    var level = Object.create(this);
    level.width = plan[0].length;
    level.height = plan.length;
    level.grid = [];
    level.actors = [];

    for (var y = 0; y < level.height; y++) {
      var line = plan[y],
      gridLine = [];
      for (var x = 0; x < level.width; x++) {
        var ch = line[x],
        fieldType = null;
        switch(ch){
          case "@":
            var actor = Player.init(Vector.init(x, y));
            level.actors.push(actor);
            break;
          case "o":
            var actor = Coin.init(Vector.init(x, y));
            level.actors.push(actor);
            break;
          case "=":
            var actor = Lava.init(Vector.init(x, y), ch);
            level.actors.push(actor);
            break;
          case "|":
            var actor = Lava.init(Vector.init(x, y), ch);
            level.actors.push(actor);
            break;
          case "v":
            var actor = Lava.init(Vector.init(x, y), ch);
            level.actors.push(actor);
            break;
          case "x":
            fieldType = "wall";
            break;
          case "!":
            fieldType = "lava";
            break;
        }
        gridLine.push(fieldType);
      }
      level.grid.push(gridLine);
    }

    level.player = level.actors.filter(function(actor) {
      return actor.type == "player";
    })[0];
    level.status = level.finishDelay = null;
    return level;
  },

  isFinished: function(){
    return this.status != null && this.finishDelay < 0;
  },

  obstacleAt: function(pos, size){
    var xStart = Math.floor(pos.x);
    var xEnd = Math.ceil(pos.x + size.x);
    var yStart = Math.floor(pos.y);
    var yEnd = Math.ceil(pos.y + size.y);

    if (xStart < 0 || xEnd > this.width || yStart < 0)
      return "wall";
    if (yEnd > this.height)
      return "lava";
    for (var y = yStart; y < yEnd; y++) {
      for (var x = xStart; x < xEnd; x++) {
        var fieldType = this.grid[y][x];
        if (fieldType) return fieldType;
      }
    }
  }, 

  actorAt: function(actor){
    for (var i = 0; i < this.actors.length; i++) {
    var other = this.actors[i];
    if (other != actor &&
        actor.pos.x + actor.size.x > other.pos.x &&
        actor.pos.x < other.pos.x + other.size.x &&
        actor.pos.y + actor.size.y > other.pos.y &&
        actor.pos.y < other.pos.y + other.size.y)
      return other;
    }
  }, 

  animate: function(step, keys){
    if (this.status != null)
    this.finishDelay -= step;

    while (step > 0) {
      var thisStep = Math.min(step, Game.maxStep);
      this.actors.forEach(function(actor) {
        actor.act(thisStep, this, keys);
      }, this);
      step -= thisStep;
    }
  },

  playerTouched: function(type, actor){
    if (type == "lava" && this.status == null) {
      this.status = "lost";
      this.finishDelay = 1;
    } else if (type == "coin") {
      this.actors = this.actors.filter(function(other) {
        return other != actor;
      });
      if (!this.actors.some(function(actor) {
        return actor.type == "coin";
      })) {
        this.status = "won";
        this.finishDelay = 1;
      }
    }
  }
}



var Vector = {
  init: function(x, y){
    var vector = Object.create(this);
    vector.x = x;
    vector.y = y;
    return vector;
  },

  plus: function(other){
    return Vector.init(this.x+other.x, this.y+other.y);
  },
  times: function(factor){
    return Vector.init(this.x*factor, this.y*factor);
  }
}



/****  PLAYER   ****/
var Player = {
  type: "player",
  init: function(pos){
    var player = Object.create(this);
    player.pos = pos.plus(Vector.init(0,-0.5));
    player.size = Vector.init(0.8, 1.5);
    player.speed = Vector.init(0,0);
    player.stats = {
      xSpeed : 7,
      jumpHeight: 17,
    };
    player.abilities = {
      highjump: true,
      lowjump: true,
      doublejump: true,
      duck: true,
      haste: true,
      dash:true,
    };

    return player;
  },
  moveX: function(step, level, keys){
    this.speed.x = 0;
    if (keys.left) this.speed.x -= this.stats.xSpeed;
    if (keys.right) this.speed.x += this.stats.xSpeed;
    if(keys.space) this.speed.x *=2;

    var motion = Vector.init(this.speed.x * step, 0);
    var newPos = this.pos.plus(motion);
    var obstacle = level.obstacleAt(newPos, this.size);
    if (obstacle)
      level.playerTouched(obstacle);
    else
      this.pos = newPos;
  },
  moveY: function(step, level, keys){
    this.speed.y += step * Game.gravity;
    var motion = Vector.init(0, this.speed.y * step);
    var newPos = this.pos.plus(motion);
    var obstacle = level.obstacleAt(newPos, this.size);
    
   
    if (obstacle) {
      level.playerTouched(obstacle);
      if (keys.up && this.speed.y > 0)
        this.speed.y = -this.stats.jumpHeight;
      else if(keys.down && this.speed.y >0)
        this.speed.y = -this.stats.jumpHeight/1.5;
      else
        this.speed.y = 0;
    } else {
      if(this.abilities.doublejump){ 
        if(keys.up && this.speed.y > 0){
          this.speed.y = -this.stats.jumpHeight;
        }
        if(keys.down && this.speed.y > 0){
          this.speed.y = -this.stats.jumpHeight/1.5;
        }
      }
      this.pos = newPos;
    }
  },
  act: function(step, level, keys){
    this.moveX(step, level, keys);
    this.moveY(step, level, keys);

    var otherActor = level.actorAt(this);
    if (otherActor)
      level.playerTouched(otherActor.type, otherActor);

    // Losing animation
    if (level.status == "lost") {
      this.pos.y += step;
      this.size.y -= step;
    }
  },
  gainAbility: function(ability){
    this.abilities[ability] = true;

  },

}



var Lava = {
  type: "lava",
  init: function(pos, ch){
    var lava = Object.create(this);
    lava.pos = pos;
    lava.size = Vector.init(1,1);
    if(ch == "=")
      lava.speed = Vector.init(2,0);
    else if(ch == "|")
      lava.speed = Vector.init(0,2);
    else if(ch == "v"){
      lava.speed = Vector.init(0,3);
      lava.repeatPos = pos;
    }
    return lava;
  },

  act: function(step, level){
    var newPos = this.pos.plus(this.speed.times(step));
    if (!level.obstacleAt(newPos, this.size))
      this.pos = newPos;
    else if (this.repeatPos)
      this.pos = this.repeatPos;
    else
      this.speed = this.speed.times(-1);
  }
}






var Coin = {
  type: "coin",
  init: function(pos){
    var coin = Object.create(this);
    coin.basePos = coin.pos = pos.plus(Vector.init(0.2,0.1));
    coin.size = Vector.init(0.6,0.6);
    coin.wobble = Math.random() * Math.PI*2;
    coin.wobbleSpeed = 8;
    coin.wobbleDist = 0.2;
    return coin;
  },
  act: function(step){
    this.wobble += step * this.wobbleSpeed;
    var wobblePos = Math.sin(this.wobble) * this.wobbleDist;
    this.pos = this.basePos.plus(Vector.init(0, wobblePos));
  }
}






function elt(name, className) {
  var elt = document.createElement(name);
  if (className) elt.className = className;
  return elt;
}






var DOMDisplay = {
  init: function(parent, level){
    var DOMDisplay = Object.create(this);
    DOMDisplay.wrap = parent.appendChild(elt("div", "game"));
    DOMDisplay.level = level;

    DOMDisplay.wrap.appendChild(DOMDisplay.drawBackground());
    DOMDisplay.actorLayer = null;
    DOMDisplay.drawFrame();
    return DOMDisplay;
  },

  drawBackground: function(){
    var table = elt("table", "background");
    table.style.width = this.level.width * Game.scale + "px";
    
    var length = this.level.grid.length;
    var rowLength = this.level.grid[0].length;
    var nextRow;
    var prevRow;
    for(var i = 0;i<length;i++){
      var row = this.level.grid[i];
      var rowElt = table.appendChild(elt("tr"));
      rowElt.style.height = Game.scale + "px";
      prevRow = i>0 ? this.level.grid[i-1]: null;
      nextRow = i<this.level.grid.length-1 ? this.level.grid[i+1] : null;
      for(var j = 0;j<rowLength;j++){

        var character = row[j];
        var element = rowElt.appendChild(elt("td", character));
        //find rounded corners
        
        if(nextRow && !nextRow[j] && !nextRow[j+1] && !row[j+1]) element.className = element.className + " bottom-right-radius";
        if(nextRow && !nextRow[j] && !nextRow[j-1] && !row[j-1]) element.className = element.className + " bottom-left-radius";
        if(prevRow && !prevRow[j] && !prevRow[j+1] && !row[j+1]) element.className = element.className + " top-right-radius";
        if(prevRow && !prevRow[j] && !prevRow[j-1] && !row[j-1]) element.className = element.className + " top-left-radius";


      }
    }

    /*
    console.log(this.level.grid);
    this.level.grid.forEach(function(row) {
      var rowElt = table.appendChild(elt("tr"));
      rowElt.style.height = Game.scale + "px";
      row.forEach(function(type) {
        rowElt.appendChild(elt("td", type));
      });
    });
*/
    return table;
  },

  drawActors: function(){
    var wrap = elt("div");
    this.level.actors.forEach(function(actor) {
      var rect = wrap.appendChild(elt("div",
                                      "actor " + actor.type));
      rect.style.width = actor.size.x * Game.scale + "px";
      rect.style.height = actor.size.y * Game.scale + "px";
      rect.style.left = actor.pos.x * Game.scale + "px";
      rect.style.top = actor.pos.y * Game.scale + "px";

      if(actor.type == "lava") rect.className = rect.className+' bottom-right-radius bottom-left-radius top-right-radius top-left-radius';

    });
    return wrap;
  },

  drawFrame: function(){
    if (this.actorLayer)
      this.wrap.removeChild(this.actorLayer);
    this.actorLayer = this.wrap.appendChild(this.drawActors());
    this.wrap.className = "game " + (this.level.status || "");
    this.scrollPlayerIntoView();
  },

  scrollPlayerIntoView: function(){
    var width = this.wrap.clientWidth;
    var height = this.wrap.clientHeight;
    var margin = width / 3;

    // The viewport
    var left = this.wrap.scrollLeft, right = left + width;
    var top = this.wrap.scrollTop, bottom = top + height;

    var player = this.level.player;
    var center = player.pos.plus(player.size.times(0.5))
                   .times(Game.scale);

    if (center.x < left + margin)
      this.wrap.scrollLeft = center.x - margin;
    else if (center.x > right - margin)
      this.wrap.scrollLeft = center.x + margin - width;
    if (center.y < top + margin)
      this.wrap.scrollTop = center.y - margin;
    else if (center.y > bottom - margin)
      this.wrap.scrollTop = center.y + margin - height;
    },

    clear: function(){
      this.wrap.parentNode.removeChild(this.wrap);
    }
}


var arrowCodes = {
    37: "left",
    38: "up",
    39: "right",
    40: "down",
    16: "shift",
    32: "space",
    13: "enter",
  };

function trackKeys(codes) {
  var pressed = Object.create(null);
  function handler(event) {
    if (codes.hasOwnProperty(event.keyCode)) {
      var down = event.type == "keydown";
      pressed[codes[event.keyCode]] = down;
      event.preventDefault();
    }
  }
  addEventListener("keydown", handler);
  addEventListener("keyup", handler);
  return pressed;
}
var arrows = trackKeys(arrowCodes);



function runAnimation(frameFunc) {
  var lastTime = null;
  function frame(time) {
    var stop = false;
    if (lastTime != null) {
      var timeStep = Math.min(time - lastTime, 100) / 1000;
      stop = frameFunc(timeStep) === false;
    }
    lastTime = time;
    if (!stop)
      requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function runLevel(level, Display, andThen) {
  var display = DOMDisplay.init(document.getElementById('wrapper'), level);
  runAnimation(function(step) {
    level.animate(step, arrows);
    display.drawFrame(step);
    if (level.isFinished()) {
      display.clear();
      if (andThen)
        andThen(level.status);
      return false;
    }
  });
}

function runGame(plans, Display) {
  function startLevel(n) {
    runLevel(Level.init(plans[n]), Display, function(status) {
      if (status == "lost")
        startLevel(n);
      else if (n < plans.length - 1)
        startLevel(n + 1);
      else
        console.log("You win!");
    });
  }
  startLevel(0);
}















