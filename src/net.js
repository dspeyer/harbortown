let log = [];
let socket;

export function init() {
    let hn = window.location.hostname;
    let port = window.location.port;
    socket = new WebSocket('ws://'+hn+':'+port+'/socket');
}

export function prepare_log(txt) {
    log.push([txt]);
}

export function annotate_log(obj) {
    log[log.length-1].push(obj);
}

export function send_log() {
    if (socket.readyState == WebSocket.OPEN) {
        console.log(log);
        socket.send(JSON.stringify(log));
    }
    log = [];
}

export function abort_log() {
    log.pop();
}
