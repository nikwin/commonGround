var Media = function(category, name, aspects, combination, hypothetical){
    this.category = category;
    this.name = name;
    this.aspects = aspects.filter(x => x && x.length).filter(uniqueFunction);

    var width = 25 + Math.ceil(ctx.measureText(this.name).width);

    this.rect = [randInt(width - 80), randInt(height - 80), width, 25];
    this.velocity = [randInt(40) - 20, randInt(40) - 20];
    this.combination = combination;
    this.hypothetical = hypothetical;
};

Media.prototype.render = function(){
    var image = this.category;
    if (this.hypothetical){
        image += '_i';
    }
    
    ctx.drawImage(getImage(image), this.rect[0] + 1, this.rect[1] + 1);
    ctx.fillText(this.name, this.rect[0] + 22, this.rect[1] + this.rect[3] / 2 + 7);
    ctxRoundedRect(this.rect);
};

var Aspect = function(name){
    this.name = name;
    this.rect = [randInt(width - 80), randInt(height - 80), 40, 20];
    this.velocity = [(3 + randInt(5)) * (randInt(2) ? 1 : -1), (3 + randInt(5)) * (randInt(2) ? 1 : -1)];
};

Aspect.prototype.render = function(){
    ctx.fillText(this.name, this.rect[0], this.rect[1] + this.rect[3]);
};

var BackgroundElement = function(rect){
    this.rect = rect;
    this.color = [160 + randInt(48), 160 + randInt(48), 160 + randInt(48)];
    this.timeToUpdate = 20 + Math.random() * 10;
    this.transitionTime = 0;
    this.transitionColor = false;
};

BackgroundElement.prototype.render = function(){
    ctx.fillStyle = this.color.reduce((memo, i) => memo + i.toString(16), '#');
    ctx.fillRect(...this.rect);
};

BackgroundElement.prototype.update = function(interval){
    if (this.transitionTime > 0){
        this.color = interpolate(this.startColor, this.transitionColor, 
                                 (5 - this.transitionTime) / 5).map(i => Math.floor(i));
        this.transitionTime -= interval;
    }
    else{
        this.timeToUpdate -= interval;
        if (this.timeToUpdate < 0){
            this.timeToUpdate = 20 + Math.random() * 10;
            this.transitionTime = 5;
            this.transitionColor = [160 + randInt(48), 160 + randInt(48), 160 + randInt(48)];
            this.startColor = this.color;
        }
    }
};

var uniqueFunction = (ele, idx, ary) => ary.indexOf(ele) == idx;

var tasks = {
    start: {
        text: "Add 3 Games",
        description: "",
        check: media => media.filter(e => e.category == 'Game').length >= 3,
        nextKey: 'newAspect'
    },
    newAspect: {
        text: "Add New Aspect",
        description: "Add a new game that you appreciate for a reason you haven't listed yet.",
        check: media => {
            var aspects = media.slice(0, 3).map(med => med.aspects).flat();
            return media.slice(3).some(media => media.aspects.some(aspect => aspects.indexOf(aspect) == -1));
        },
        nextKey: 'updateAspect'
    },
    updateAspect: {
        text: "Update aspects",
        description: "Can you update any of your earlier games to note this reason?<br />If not, add a new game that shares a reason with this game.",
        check: media => media[3].aspects.every(aspect => media.some((chkMed, i) => i != 3 && chkMed.aspects.indexOf(aspect) != -1)),
        nextKey: 'uniqueAspect'
    },
    uniqueAspect: {
        text: "Unique aspect",
        description: "Now, can you think of a game which you like, but for none of the reasons you've<br />listed so far? Add that game.",
        check: media => media[media.length - 1].aspects.every(aspect => media.slice(0, -1).every(med => med.aspects.indexOf(aspect) == -1)),
        nextKey: 'startBook'
    },
    startBook: {
        text: "Add 2 Books",
        description: "Now, let's do books. Try changing the category and add some books",
        check: media => media.filter(med => med.category == 'Book').length >= 2,
        updateGame: (game) => {
            $('#selectCat').append('<option value="Book">Book</option>');
        },
        nextKey: "linkBook"
    },
    linkBook: {
        text: "Link Book",
        description: "Do you have any common aspects between the books and the rest?",
        check: media => media.filter(med => med.category == 'Book').some(med => med.aspects.some(aspect => media.some(med => med.category != 'Book' && med.aspects.indexOf(aspect) != -1))),
        nextKey: "explainBook"
    },
    explainBook: {
        text: "Common Ground",
        description: "This is what I want to get at with this game. We tend to treat different<br />media forms as entirely different experiences.<br />However, once we break things down, the commonalities start becoming clear.",
        check: trueFunction,
        nextKey: "startMovie"
    },
    startMovie: {
        text: "Add 2 Movies",
        description: "Now, let's do movies. Try changing the category and add some movies",
        check: media => media.filter(med => med.category == 'Movie').length >= 2,
        updateGame: (game) => {
            $('#selectCat').append('<option value="Movie">Movie</option>');
        },
        nextKey: "linkMovie"
    },
    linkMovie: {
        text: "Link Movie",
        description: "Do you have any common aspects between the movies and the rest?<br />Feel free to add more examples if you need.<br />Use the hypothetical checkbox if you want to make some up",
        check: media => media.filter(med => med.category == 'Movie').some(med => med.aspects.some(aspect => media.some(med => med.category != 'Movie' && med.aspects.indexOf(aspect) != -1))),
        nextKey: "linkAll"
    },
    linkAll: {
        text: "Link All",
        description: "Can you find an aspect common to all three forms of media? (Add more examples if it helps.)",
        check: media => {
            var gameAspects = media.filter(med => med.category == 'Game').map(med => med.aspects).flat();
            var bookAspects = media.filter(med => med.category == 'Book').map(med => med.aspects).flat();
            var movieAspects = media.filter(med => med.category == 'Movie').map(med => med.aspects).flat();
            return gameAspects.some(aspect => (bookAspects.indexOf(aspect) != -1 &&
                                               movieAspects.indexOf(aspect) != -1));
        },
        nextKey: "explainLink"
    },
    explainLink: {
        text: "Links",
        description: "Putting media in conversation with other, more unexpected media<br />changes the way it's read for the better.",
        check: trueFunction,
        nextKey: "musicMemory"
    },
    musicMemory: {
        text: "Music and Memories",
        description: "Now, add some of your favorite music and memories.",
        check: media => media.some(med => med.category == 'Music') && media.some(med => med.category == 'Memory'),
        nextKey: "combineStart",
        updateGame: (game) => {
            $('#selectCat').append('<option value="Music">Music</option>');
            $('#selectCat').append('<option value="Memory">Memory</option>');
            $('#selectCat').append('<option value="Other">Other</option>');
        }
    },
    combineStart: {
        text: "Combinations",
        description: "Try dragging a line from one media object to another to form a combination between the two.",
        check: media => media.some(med => med.combination),
        nextKey: "interestCombine"
    },
    existCombine: {
        text: "Existing combinations",
        description: "Can you identify an existing piece of media that's a combination of other media?<br />(Make a combination and then edit it to reflect the real media<br />(Make sure to mark it as not hypothetical))",
        check: media => media.some(med => med.combination && !med.hypothetical),
        nextKey: "interestCombine"
    },
    interestCombine: {
        text: "Find 3 Interesting Combinations",
        description: "Can you make some interesting combinations with what you have here? See if you can put<br />together something unexpected.",
        check: media => media.filter(med => med.combination).length >= 3,
        nextKey: "explainCombine"
    },
    explainCombine: {
        text: "Combinations as Bridges",
        description: "Maybe through combinations we can find paths to generating media that can be<br />engaged with in a manner usual to a different form entirely.",
        check: trueFunction,
        nextKey: "imagineStart"
    },
    imagineStart: {
        text: "Add imaginary media",
        description: "Is there something you wish existed and something that you can't combine media to get?<br />Put down some things that you would like to see.",
        check: media => media.filter(med => med.hypothetical).length >= 3,
        nextKey: "linkMap"
    },
    linkMap: {
        text: "Link map",
        description: "Now link up the whole map. You should be able to draw a line from anything to anything.<br />Make up media that sounds fun!.",
        check: media => {
            var linkedMedia = [media[0]];
            var currentAspects = media[0].aspects;
            var finishedAspects = [];
            while (currentAspects.length){
                finishedAspects = finishedAspects.concat(currentAspects);
                
                var newMedia = media.filter(med => (med.aspects.some(aspect => currentAspects.indexOf(aspect) != -1) &&
                                                    linkedMedia.indexOf(med) == -1));
                linkedMedia = linkedMedia.concat(newMedia);
                currentAspects = newMedia
                    .map(med => med.aspects)
                    .flat()
                    .filter(uniqueFunction)
                    .filter(aspect => finishedAspects.indexOf(aspect) == -1);
            }
            return linkedMedia.length == media.length;
        },
        nextKey: "finish"
    },
    finish: {
        text: "Now, go make some of what you want to see.",
        description: "",
        check: falseFunction
    }
};

var Game = function(gameProperties){
    this.media = [];
    this.tasks = [];

    this.aspects = [];
    this.currentMedia = undefined;
    this.aspectEntities = [];
    this.backgroundElements = [];

    var x = 0;
    while (x < width){
        var w = 100 + randInt(200);
        var y = 0;
        while (y < height){
            var h = 100 + randInt(200);
            this.backgroundElements.push(new BackgroundElement([x, y, w, h]));
            y += h;
        }
        x += w;
    }
};

Game.prototype.draw = function(){
    this.backgroundElements.forEach(entity => entity.render());
    
    ctx.fillStyle = '#000000';
    
    this.aspectEntities.forEach(entity => entity.render());
    
    this.media.forEach(entity => {
        entity.aspects.forEach(aspect => {
            var aspectEntity = this.aspectEntities.find(aspectEntity => aspectEntity.name == aspect);
            if (aspectEntity){
                var startPos = midpoint(entity.rect);
                var endPos = midpoint(aspectEntity.rect);

                ctx.beginPath();
                ctx.moveTo(...interpolate(startPos, endPos, 0.1));
                ctx.lineTo(...interpolate(startPos, endPos, 0.9));
                ctx.stroke();
            }
        });

        entity.render();
    });
};

Game.prototype.update = function(interval){
    this.backgroundElements.forEach(entity => entity.update(interval));
    this.media.forEach(med => med.aspects
                       .filter(aspect => !this.aspectEntities.some(aspectEntity => aspectEntity.name == aspect))
                       .forEach(aspect => this.aspectEntities.push(new Aspect(aspect))));

    this.media.forEach(med => {
        var delta = med.aspects
            .map(aspect => this.aspectEntities.find(aspectEntity => aspectEntity.name == aspect))
            .map(aspectEntity => aspectEntity ? [aspectEntity.rect[0] - med.rect[0],
                                                 aspectEntity.rect[1] - med.rect[1]] : [0, 0])
            .reduce((memo, ele) => [memo[0] + ele[0], memo[1] + ele[1]], [0, 0]);
        delta = delta.map(x => x * 0.2 * interval);
        med.velocity[0] += delta[0];
        med.velocity[1] += delta[1];

        var maxVel = 40;

        med.velocity[0] = max(-maxVel, min(maxVel, med.velocity[0]));
        med.velocity[1] = max(-maxVel, min(maxVel, med.velocity[1]));
    });

    this.aspectEntities = this.aspectEntities.filter(aspect => 
        this.media.some(med => med.aspects.indexOf(aspect.name) != -1));

    this.aspectEntities.concat(this.media).forEach(entity => {
        entity.rect[0] += entity.velocity[0] * interval;

        if (entity.rect[0] < 0){
            entity.rect[0] = 1;
            entity.velocity[0] *= -1;
        }
        else if (entity.rect[0] + entity.rect[2] > width){
            entity.rect[0] = width - entity.rect[2] - 1;
            entity.velocity[0] *= -1;
        }

        entity.rect[1] += entity.velocity[1] * interval;

        if (entity.rect[1] < 0){
            entity.rect[1] = 1;
            entity.velocity[1] *= -1;
        }
        else if (entity.rect[1] + entity.rect[3] > height){
            entity.rect[1] = height - entity.rect[3] - 1;
            entity.velocity[1] *= -1;
        }
    });

    return true;
};

Game.prototype.initialize = function(){
    $("form").submit(() => this.addMedia());
    $(document).on('change', '#selectAspect', () => this.selectAspect());
    $("#addAspect").click(() => this.addAspect());
    $("#checkTask").click(() => this.updateTasks());
    bindHandler.bindFunction(this.getTouchFunction());
    bindHandler.bindFunction(this.getMouseUp(), 'up');

    this.tasks.push(tasks.start);
    this.updateTaskDisplay();
};

Game.prototype.updateTaskDisplay = function(){
    var lines = this.tasks.map(task => `<li>${task.text}</li><p>${task.description}</p>`).reduce(addFunction, '');
    $('#tasks').html(lines);

    if (this.tasks[0].check == trueFunction){
        $("#checkTask").prop("value", "Continue");
    }
    else{
        $("#checkTask").prop("value", "Check");
    }
};

Game.prototype.addMedia = function(){
    var name = $('#name').val();
    var category = $('#selectCat').val();
    var hypo = $('#hypo').prop('checked');
    
    this.addAspect();

    if (name.length && this.aspects.length){
        if (this.currentMedia){
            this.currentMedia.name = name;
            this.currentMedia.aspects = this.aspects;
            this.currentMedia.hypothetical = hypo;
            this.currentMedia.category = category;
        }
        else{
            this.media.push(new Media(category, name, this.aspects, false, hypo));
        }
        
        this.unload();
    }
};

Game.prototype.updateTasks = function(){
    var updated = false;
    for (var i = this.tasks.length - 1; i >= 0; i--){
        var task = this.tasks[i];
        if (task.check(this.media)){
            updated = true;
            this.tasks.splice(i, 1);
            
            if (task.nextKey){
                this.addTask(task.nextKey);
            }
            
            if (task.nextKeys){
                task.nextKeys.forEach(key => this.addTask(key));
            }
        }
    }

    if (updated){
        this.updateTaskDisplay();
    }

    return updated;
};

Game.prototype.addTask = function(key){
    this.tasks.push(tasks[key]);
    if (tasks[key].updateGame){
        tasks[key].updateGame(this);
    }
};

Game.prototype.holdAspect = function(aspect){
    if (this.aspects.indexOf(aspect) == -1){
        $('#aspects').append(`<ul>${aspect} <input type="button" id="x_${aspect}" value="X" /></ul>`);
        $(`#x_${aspect}`).click(() => this.removeAspect(aspect));
        this.aspects.push(aspect);
        return true;
    }
    return false;
};

Game.prototype.removeAspect = function(aspect){
    this.aspects.splice(this.aspects.indexOf(aspect), 1);
    var aspects = this.aspects;
    $('#aspects').text('');
    this.aspects = [];
    aspects.forEach(aspect => this.holdAspect(aspect));
};

Game.prototype.selectAspect = function(){
    var aspect = $('#selectAspect').val();
    this.holdAspect(aspect);
};

Game.prototype.addAspect = function(){
    var aspect = $('#aspect').val();
        
    if (aspect.length){
        if (this.holdAspect(aspect)){
            if (!this.aspectEntities.some(aspectEntity => aspectEntity.name == aspect)){
                $("#selectAspect").append(`<option value="${aspect}">${aspect}</option>`);
            }
        }
        $('#aspect').val('');
    }
};

Game.prototype.getTouchFunction = function(){
    return e => {
        e.preventDefault();
        var pos = getPos(e);
        
        var media = this.media.find(med => containsPos(med.rect, pos));
        if (media){
            this.loadMedia(media);
        }
        else{
            this.unload();
        }
    };
};

Game.prototype.getMouseUp = function(){
    return e => {
        e.preventDefault();
        var pos = getPos(e);
        
        if (this.currentMedia){
            var linkMedia = this.media.find(med => containsPos(med.rect, pos));
            if (linkMedia && linkMedia != this.currentMedia){
                var newMedia = new Media(this.currentMedia.category,
                                         `${this.currentMedia.name} + ${linkMedia.name}`,
                                         this.currentMedia.aspects.concat(linkMedia.aspects),
                                         true, true);
                this.media.push(newMedia);
                this.loadMedia(newMedia);
            }
        }
    };
};

Game.prototype.loadMedia = function(media){
    this.unload();
    this.currentMedia = media;
    media.aspects.forEach(aspect => this.holdAspect(aspect));

    $('#name').val(media.name);
    $('#state').text('Edit Media');
    

    $('#selectCat').val(media.category);
    $('#hypo').prop('checked', media.hypothetical);
};

Game.prototype.unload = function(){
    $('#name').val('');
    $('#aspect').val('');
    $("#selectAspect option:eq(0)").prop("selected", true); 

    this.aspects = [];
    $('#aspects').text('');

    document.getElementById('name').focus();
    this.currentMedia = undefined;

    $('#state').text('Add Media');
};

var GameProperties = function(){
};

var getGame = function(gameProperties){
    return new Game(gameProperties);
};
