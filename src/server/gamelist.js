import { shuffle, safeCopy } from '../common/utils.js';
import { newGame } from '../common/actions.js';
import { initBuildings } from '../common/buildings.js';
import { player_colors } from '../common/data.js';
import mongodb from 'mongodb';
const { MongoClient } = mongodb;

export let colls = {};

const mgHostPort = process.env.MONGO_HOSTPORT || 'localhost:27017';
const mgDb = process.env.MONGO_DB || 'harbortown';

MongoClient.connect("mongodb://"+mgHostPort, (err,client) => {
    if (err) throw err;
    let db = client.db('harbortown');
    for (let c of ['games','seeds','ids','people']) {
        db.collection(c, (err, coll) => {
            if (err) throw err;
            colls[c] = coll;
        });
    }
});
            

export async function showGameList(req, res, msg) {
    if (typeof(msg)=='function') msg='';
    const name = req.cookies.name;
    const email = req.cookies.email;
    const now = Date.now();
    const ago = (t) => (now-t) / (24*60*60*1000);
    const showOld = !! req.query.showOld;
    const rawgames = await colls.games.find({players:{$elemMatch:{email}}}).toArray();
    let mygames, clipped;
    if (showOld) {
        mygames = rawgames;
        clipped = false;
    } else {
        mygames = rawgames.filter( (g) => ! (ago(g.ended)>2) );
        clipped = (mygames.length != rawgames.length);
    }
    let gameseeds = await colls.seeds.find().toArray();
    res.render('gamelist', {name,email,mygames,gameseeds,msg,ago,showOld,clipped});
}

async function startGame(seed, id, res) {
    let players = shuffle(seed.players);
    let promises = [];
    for (let p of players) {
        promises.push( colls.people.findOne({email:p.email}).then((person)=>{p.color=person.color}) );
    }
    for (let p of promises) await p;
    for (let p of players) {
        if (p.color=='random' || !p.color) p.color = player_colors[Math.floor(Math.random()*player_colors.length)];
    }
    let game = newGame(players, initBuildings);
    game.desc = seed.desc;
    game.id = id;
    await colls.seeds.removeOne({id});
    await colls.games.insertOne(game);
    res.redirect('/game?'+id);
}
    

export async function join(req, res) {
    const name = req.cookies.name;
    const email = req.cookies.email;
    const id = req.body.id;
    console.log(['query', {id}]);
    let seed = await colls.seeds.findOne({id});
    if ( !seed ) {
        return showGameList(req, res, "Not a valid game to join");
    }
    if (email in seed.players.map((x)=>x.email)) {
        return showGameList(req, res, "You are already in that game");
    }
    seed.players.push({name,email});
    delete seed._id;
    if (seed.players.length == seed.wanted) {
        startGame(seed, id, res);
    } else {
        await colls.seeds.updateOne({id}, {$set: seed});
        res.redirect('/');
    }
}

async function newId() {
    let idobj = await colls.ids.findOne();
    if (idobj) {
        let id = idobj.id + 1;
        await colls.ids.updateOne({},{$set: {id}});
        return id+'';
    } else {
        await colls.ids.insertOne({id:1});
        return '1';
    }
}

export async function createSeed(req, res) {
    const email = req.cookies.email;
    const name = req.cookies.name;
    const desc = req.body.desc;
    const wanted = req.body.wanted;
    if ( ! (desc && wanted) ) return showGameList(req, res, 'Must provide description and player count');
    let id = await newId();
    let seed = { id, desc, wanted, players:[{name,email}] };
    await colls.seeds.insertOne(seed);
    if (wanted==1) {
        startGame(seed, id, res);
    } else {
        res.redirect('/');
    }
}

export async function mkGame(req, res) {
    let game = JSON.parse(req.body.state);
    game.id = await newId();
    colls.games.insertOne(game);
    res.redirect('/');
}
