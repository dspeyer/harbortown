export const resources = {
    "money": {
        "food": 1,
    },
    "fish": {
        "food": 1,
        "value": 1,
    },
    "lox": {
        "food": 2,
        "value": 2,
        "advanced": true,
    },
    "wood": {
        "energy": 1,
        "value": 1,
    },
    "charcoal": {
        "energy": 3,
        "value": 2,
        "advanced": true,
    },
    "clay": {
        "value": 1,
    },
    "brick": {
        "value": 2,
        "advanced": true,
    },
    "coal": {
        "energy": 3,
        "value": 3
    },
    "coke": {
        "energy": 10,
        "value": 5,
        "advanced": true,
    },
    "cattle": {
        "value": 3,
    },
    "meat": {
        "value": 2,
        "food": 3,
        "advanced": true
    },
    "iron": {
        "value": 2,
    },
    "steel": {
        "value": 8,
        "advanced": true,
    },
    "wheat": {
        "value": 1,
    },
    "bread": {
        "value": 3,
        "food": 2,
        "advanced": true,
    },
    "hides": {
        "value": 2,
    },
    "leather": {
        "value": 4,
        "advanced": true,
    },
    "loans": {
        "value": -5
    }
};


export const drop_tiles = [
    ['wood','fish'],
    ['wood','cattle'],
    ['wood', 'money'],
    ['wood', 'clay'],
    ['wheat', 'fish'],
    ['fish', 'clay'],
    ['iron', 'money']
]

export const player_colors = [ 'green', 'darkblue', 'red', 'khaki', 'purple' ];


export const game_events = [
    [], //0 players
    [], //1 player
    [ //2 players
        {feed: 3, ship:['wood',2]},
        {feed: 4, ship:['wood',2], building:true},
        {feed: 5, ship:['wood',4], special:true},
        {feed: 7, ship:['wood',4]},
        {feed: 9, ship:['wood',6], building:true},
        {feed: 11, ship:['iron',4], special:true},
        {feed: 13, ship:['iron',6]},
        {feed: 15, ship:['iron',8], building:true},
        {feed: 16, ship:['iron',10], special:true},
        {feed: 17, ship:['steel',16]},
        {feed: 18, ship:['steel',20], building:true},
        {feed: 19, ship:['steel',24], special:true},
        {feed: 20, ship:['luxury',34]},
        {feed: 20, ship:['luxury',30], noharvest:true}
    ],
    
    [ //3 players
        {feed: 2, ship:['wood',2], noharvest:true},
        {feed: 2, ship:['wood',2]},        
        {feed: 3, ship:['wood',2], building:true},
        {feed: 3, ship:['wood',4], special:true},
        {feed: 4, ship:['wood',4]},        
        {feed: 5, ship:['iron',2], noharvest:true},
        {feed: 6, ship:['wood',6], building:true},
        {feed: 7, ship:['iron',4], special:true},
        {feed: 8, ship:['iron',6]},
        {feed: 9, ship:['iron',8]},
        {feed: 10, ship:['steel',10], building:true, noharvest:true},
        {feed: 11, ship:['iron',10], special:true},
        {feed: 12, ship:['steel',16]},
        {feed: 13, ship:['steel',20], building:true},
        {feed: 14, ship:['steel',24], special:true},
        {feed: 14, ship:['luxury',38], noharvest:true},
        {feed: 15, ship:['luxury',34]},
        {feed: 15, ship:['luxury',30], noharvest:true}
    ],

    [ // 4 players
        {feed: 1, ship:['wood',2]},
        {feed: 1, ship:['wood',2]},
        {feed: 2, ship:['wood',2], noharvest:true},
        {feed: 2, ship:['wood',4], building:true},
        {feed: 2, ship:['wood',4], special:true},
        {feed: 3, ship:['iron',2], noharvest:true},
        {feed: 3, ship:['wood',4], building:true},
        {feed: 4, ship:['iron',4], special:true},
        {feed: 4, ship:['wood',6], noharvest:true},
        {feed: 5, ship:['iron',6], building:true},
        {feed: 5, ship:['iron',8], special:true},
        {feed: 6, ship:['steel',10], noharvest:true},
        {feed: 7, ship:['iron',10], building:true},
        {feed: 8, ship:['steel',16], special:true},
        {feed: 9, ship:['iron',12], noharvest:true},
        {feed: 10, ship:['steel',20], building:true},
        {feed: 10, ship:['steel',24], special:true},
        {feed: 11, ship:['luxury',38], noharvest:true},
        {feed: 11, ship:['luxury',34]},
        {feed: 11, ship:['luxury',30], noharvest:true}
    ],

    [ // 5 players
        {feed: 0, ship:['wood',2]},
        {feed: 1, ship:['wood',2]},
        {feed: 1, ship:['wood',2], noharvest:true},
        {feed: 1, ship:['wood',4], building:true},
        {feed: 1, ship:['wood',4], special:true},
        {feed: 2, ship:['iron',2], noharvest:true},
        {feed: 2, ship:['wood',4], building:true},
        {feed: 2, ship:['iron',4], special:true},
        {feed: 2, ship:['wood',6], noharvest:true},
        {feed: 3, ship:['iron',6], building:true},
        {feed: 3, ship:['iron',8], special:true},
        {feed: 3, ship:['steel',10], noharvest:true},
        {feed: 4, ship:['iron',10], building:true},
        {feed: 4, ship:['steel',16], special:true},
        {feed: 4, ship:['iron',12], noharvest:true},
        {feed: 5, ship:['steel',20], building:true},
        {feed: 5, ship:['steel',24], special:true},
        {feed: 5, ship:['luxury',38], noharvest:true},
        {feed: 6, ship:['luxury',34]},
        {feed: 6, ship:['luxury',30], noharvest:true}
    ]
]

export const ship_capacities = {wood: 2, iron: 3, steel: 4};
export const ship_feeds = {wood: [-1,5,4,3,2,1],
                           iron: [-1,7,5,4,3,2],
                           steel: [-1,10,7,6,5,3],
                           luxury: [-1,0,0,0,0,0]};
                   
        
        
                                 
