let log = [];
let active_dbg = [];

export function log_event(e) {
    log.push(e);
    console.log(e);
    for (let d of active_dbg) {
        send_log(d);
    }
}

export function dbg_socket_open(ws,req)  {
    const new_con = {ws, i:0};
    active_dbg.push(new_con);
    send_log(new_con);
}


function send_log(con) {
    for (; con.i < log.length; con.i+=1) {
        try {
            con.ws.send(JSON.stringify(log[con.i]));
        } catch (e) {
            console.log(e);
        }
    }
}
