import NodeRSA from 'node-rsa';
import fs from 'fs';

let key;
fs.readFile('private-key.pem','ascii',(err,keyData)=> {
    key = new NodeRSA(keyData);
});

export function requireLogin(req,res,next) {
//    console.log('checking login for '+req.method+' '+req.path+' (name='+(req.cookies?req.cookies.name:'""')+')')
    if (req.method=='POST') return next();
    if (req.path=='/game/manifest.json') return next();
    if ( ! (req.cookies && req.cookies.name)) return showLogin(req,res,false);
    if ( ! validToken(req.cookies) ) return showLogin(req,res,true);
//    console.log('...ok');
    next();
}

export function showLogin(req,res,trouble) {
    if (typeof(trouble)=='function') trouble=false;
    res.render('login',{trouble});
}

export function handleLogin(req,res) {
    const name = req.body['name']; // TODO: password?
    res.cookie('name',name).cookie('token',makeToken(name)).redirect('/');
}

function makeToken(name) {
    const sig = key.sign(name);
    return sig.toString('base64');
}

function validToken({name,token}) {
    if (!token) return false;
    const sig = new Buffer(token,'base64');
    return key.verify(name,sig);
}
