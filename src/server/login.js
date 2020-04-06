import NodeRSA from 'node-rsa';
import bcrypt from 'bcrypt';
import fs from 'fs';
import { colls } from './gamelist.js';

let key;
fs.readFile('private-key.pem','ascii',(err,keyData)=> {
    key = new NodeRSA(keyData);
});

export function requireLogin(req,res,next) {
    if (req.method=='POST') return next();
    if (req.path=='/game/manifest.json') return next();
    if ( ! (req.cookies && req.cookies.email)) return showLogin(req,res,false);
    if ( ! validToken(req.cookies) ) return showLogin(req,res,true);
    next();
}

export function showLogin(req,res,trouble) {
    if (typeof(trouble)=='function') trouble=false;
    res.render('login',{trouble});
}

export async function handleLogin(req,res) {
    const {email, pass} = req.body;
    let person = await colls.people.findOne({email});
    if ( ! person ) return showLogin(req,res,true);
    let rp = await bcrypt.compare(pass, person.pwhash);
    if ( ! rp ) return showLogin(req,res,true);
    loginSuccess(res, person.name, email);
}

function loginSuccess(res,name,email) {
    res.cookie('name',name).cookie('email',email).cookie('token',makeToken(email)).redirect('/');
}

function makeToken(email) {
    const sig = key.sign(email);
    return sig.toString('base64');
}

function validToken({email,token}) {
    if (!token) return false;
    const sig = new Buffer(token,'base64');
    return key.verify(email,sig);
}


export function showRegister(req,res,msg) {
    if (typeof(msg)=='function') msg=false;
    res.render('register',{msg});
}

export async function handleRegister(req,res) {
    let {email,name,pass1,pass2,coo1,coo2,turnemails} = req.body;
    let person = await colls.people.findOne({email});
    if (person) return showRegister(req,res,'That email is already in use');
    if (pass1!=pass2) return showRegister(req,res,'Passwords must match');
    if (!coo1 || !coo2) return showRegister(req,res,'Must accept codes of coduct');
    let pwhash = await bcrypt.hash(pass1,10);
    person = { email, name, pwhash, turnemails };
    await colls.people.insertOne(person);
    loginSuccess(res, person.name, email);
}
