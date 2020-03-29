import { newGame, shuffle, gameState, safeCopy } from '../common/gamestate.js';

export const games = {};
export const gameseeds = {};
let id = 1;

export function showGameList(req, res, msg) {
    if (typeof(msg)=='function') msg='';
    const name = req.cookies.name;
    const now = Date.now()
    const mygames = Object.values(games).
          filter( (g)=> g.players.filter((p)=>p.name==name).length && ! ((now - g.ended) > 24*60*60*1000) );
    res.render('gamelist', {name,mygames,gameseeds,msg});
}

export function join(req, res) {
    const name = req.cookies.name;
    const id = req.body.id;
    if ( ! (id in gameseeds) ) {
        return showGameList(req, res, "Not a valid game to join");
    }
    let seed = gameseeds[id];
    if (name in seed.players) {
        return showGameList(req, res, "You are already in that game");
    }
    seed.players.push(name);
    if (seed.players.length == seed.wanted) {
        const players = shuffle(seed.players);
        newGame(players);
        games[id] = safeCopy(gameState);
        games[id].desc = seed.desc;
        games[id].id = id;
        delete gameseeds[id];
        res.redirect('/game?'+id);
    } else {
        res.redirect('/');
    }
}

export function createSeed(req, res) {
    const name = req.cookies.name;
    const desc = req.body.desc;
    const wanted = req.body.wanted;
    if ( ! (desc && wanted) ) return showGameList(req, res, 'Must provide description and player count');
    const newid = id++;
    gameseeds[newid] = { desc, wanted, players:[name] };
    res.redirect('/');
}

export function mkGame(req, res) {
    let game = JSON.parse(req.body.state);
    game.id = id++;
    delete game.whoami;
    games[game.id] = game;
    res.redirect('/');
}
