import express from 'express';
import expressWs from 'express-ws';
import cookieParser from 'cookie-parser';

import { dbg_socket_open } from './dbg.js';
import { game_socket_open } from './socket.js';
import { requireLogin, refererGrabber, handleLogin, showLogin, handleRegister, showRegister, showOpts, handleOpts, handleLoginLink } from './login.js';
import { showGameList, join, createSeed, mkGame } from './gamelist.js';

const port = 8080
export const app = express()
expressWs(app);
app.set("view engine","vash")
app.use(cookieParser());
app.use(express.urlencoded())
app.use(refererGrabber);

app.get('/login', showLogin);
app.post('/login', handleLogin);
app.get('/register', showRegister);
app.post('/register', handleRegister);
app.get('/frommail', handleLoginLink);

app.use(requireLogin);

app.use('/game', express.static('./build', {
  index: "index.html"
}))

app.ws('/socket', game_socket_open);

app.ws('/dbgsocket', dbg_socket_open);

app.get('/login', showLogin);
app.post('/login', handleLogin);

app.get('/', showGameList);
app.post('/join', join);
app.post('/new', createSeed);
app.post('/mkGame', mkGame);

app.get('/opts', showOpts);
app.post('/opts', handleOpts);


app.listen(port, () => console.log(`Example app listening on port ${port}!`))
