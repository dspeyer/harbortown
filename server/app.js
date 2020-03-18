const express = require('express')
const app = express()
const port = 3000

let expressWs = require('express-ws')(app);

let log = [];
let active_dbg = [];

app.use('/', express.static('./build', {
  index: "index.html"
}))

app.ws('/socket', (ws,req) => {
    ws.on('message', (msg) => {
        const pmsg = JSON.parse(msg);
        for (let e of pmsg) {
            log.push(e);
            console.log(e);
        }
        for (let d of active_dbg) {
            send_log(d);
        }
    });
});

app.ws('/dbgsocket', (ws,req) => {
    const new_con = {ws, i:0};
    active_dbg.push(new_con);
    send_log(new_con);
});

function send_log(con) {
    for (; con.i < log.length; con.i+=1) {
        con.ws.send(JSON.stringify(log[con.i]));
    }
}


app.listen(port, () => console.log(`Example app listening on port ${port}!`))
