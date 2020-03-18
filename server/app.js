import express from 'express';
import expressWs from 'express-ws';
import { dbg_socket_open } from './dbg.js';
import { game_socket_open, init_game } from './game.js';

const app = express()
expressWs(app);
const port = 3000

app.use('/', express.static('./build', {
  index: "index.html"
}))

app.ws('/socket', game_socket_open);

app.ws('/dbgsocket', dbg_socket_open);

init_game();

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
