import { shuffle, safeCopy } from '../common/utils.js';
import { newGame } from '../common/actions.js';
import { initBuildings } from '../common/buildings.js';
import mongodb from 'mongodb';
const { MongoClient } = mongodb;

export let colls = {};

MongoClient.connect("mongodb://localhost:27017", (err,client) => {
    if (err) throw err;
    let db = client.db('harbortown');
    for (let c of ['games','seeds','ids']) {
        db.collection(c, (err, coll) => {
            if (err) throw err;
            colls[c] = coll;
        });
    }
});
            

export async function showGameList(req, res, msg) {
    if (typeof(msg)=='function') msg='';
    const name = req.cookies.name;
    const now = Date.now()
    const mygames = await colls.games.find({players:{$elemMatch:{name}}}).toArray(); // TODO: clip old finished games
    const gameseeds = await colls.seeds.find().toArray();
    res.render('gamelist', {name,mygames,gameseeds,msg});
}

async function startGame(seed, id, res) {
    const players = shuffle(seed.players);
    let game = newGame(players, initBuildings);
    game.desc = seed.desc;
    game.id = id;
    await colls.seeds.removeOne({id});
    await colls.games.insertOne(game);
    res.redirect('/game?'+id);
}
    

export async function join(req, res) {
    const name = req.cookies.name;
    const id = req.body.id;
    console.log(['query', {id}]);
    let seed = await colls.seeds.findOne({id});
    if ( !seed ) {
        return showGameList(req, res, "Not a valid game to join");
    }
    if (name in seed.players) {
        return showGameList(req, res, "You are already in that game");
    }
    seed.players.push(name);
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
    const name = req.cookies.name;
    const desc = req.body.desc;
    const wanted = req.body.wanted;
    if ( ! (desc && wanted) ) return showGameList(req, res, 'Must provide description and player count');
    let id = await newId();
    let seed = { id, desc, wanted, players:[name] };
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
    delete game.whoami;
    colls.games.insertOne(game);
    res.redirect('/');
}
