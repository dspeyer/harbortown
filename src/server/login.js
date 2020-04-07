import fs from 'fs';

import NodeRSA from 'node-rsa';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';

import { player_colors } from '../common/data.js';
import { colls } from './gamelist.js';

let key;
if (process.env.PRIVATE_KEY) {
    key = new NodeRSA(process.env.PRIVATE_KEY);
} else {
    fs.readFile('private-key.pem','ascii',(err,keyData)=> {
        if (err) throw err;
        key = new NodeRSA(keyData);
    });
}

let tr;
if (process.env.GMAIL_PASS) {
    tr = nodemailer.createTransport({service:'gmail',auth:{user:'harbortownbot',pass:process.env.GMAIL_PASS}});
} else {
    fs.readFile('gmail-auth.json','ascii',(err,txt)=> {
        if (err) throw err;
        tr = nodemailer.createTransport({service:'gmail',auth:JSON.parse(txt)});
    });
}

let baseurl = '';

export function refererGrabber(req,res,next) {
    if ( ! baseurl && req.headers.referer && req.path.indexOf('favicon')!=-1) {
        baseurl = req.headers.referer.split('/').slice(0,3).join('/');
    }
    next();
}

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

function makeToken(email,ts) {
    const sig = key.sign(email+(ts||''));
    const out = sig.toString('base64');
    console.log('Token is', out);
    return out;
}

function validToken({email,ts,token}) {
    if (!token) return false;
    if (ts && Date.now()-ts > 60*60*1000) return false;
    const sig = new Buffer(token,'base64');
    return key.verify(email+(ts||''),sig);
}


export function showRegister(req,res,msg) {
    if (typeof(msg)=='function') msg=false;
    res.render('register',{msg,player_colors});
}

export async function handleRegister(req,res) {
    let {email,name,pass1,pass2,coo1,coo2,turnemails,color} = req.body;
    let person = await colls.people.findOne({email});
    if (person) return showRegister(req,res,'That email is already in use');
    if (pass1!=pass2) return showRegister(req,res,'Passwords must match');
    if (!coo1 || !coo2) return showRegister(req,res,'Must accept codes of coduct');
    let pwhash = await bcrypt.hash(pass1,10);
    person = { email, name, pwhash, turnemails, color };
    await colls.people.insertOne(person);
    loginSuccess(res, person.name, email);
}

export async function showOpts(req,res) {
    const email = req.cookies.email;
    const {name, turnemails, validated, color} = await colls.people.findOne({email});
    res.render('opts',{email,name,turnemails,validated,color,player_colors});
}

export async function handleOpts(req,res) {
    const email = req.cookies.email;
    let { name, turnemails, resend, color, reset, pass1, pass2 } = req.body;
    let old = await colls.people.findOne({email});
    if (reset && pass1!=pass2) {
        res.send('When resetting password, passwords must match');
        return;
    }
    if (turnemails && ! old.eversent && ! old.validated) {
        resend = true;
    }
    if (resend) {
        sendLoginLink('Validation', "Use this HarborTown login link to validate your email address", email, req.headers.referer);
    }
    let pwhash;
    if (reset) {
        pwhash = await bcrypt.hash(pass1,10);
    } else {
        pwhash = old.pwhash;
    }
    let eversent = old.eversent || resend;
    await colls.people.updateOne({email}, {$set: {name,turnemails,pwhash,eversent,color}});
    res.cookie('name',name).cookie('email',email).cookie('token',makeToken(email)).redirect('/');
}


export function sendLoginLink(subj, msg, email, redir) {
    const ts = Date.now();
    const token = makeToken(email, ts);
    const _ = encodeURIComponent;
    const url = baseurl + '/frommail?email='+_(email)+'&ts='+ts+'&token='+_(token)+'&redir='+_(redir||'/');
    tr.sendMail({ to: email,
                  from: "HarborTown Bot <harbortownbot@gmail.com>",
                  subject: '[HarborTown] '+subj,
                  text: msg+'\n\n'+url+'\n\n(This url is good for 1 hour)' });

}

export async function handleLoginLink(req, res) {
    const { email, ts, token, redir } = req.query;
    console.log({ email, ts, token, redir });
    if (validToken({email, ts, token})) {
        const name = (await colls.people.findOne({email})).name;
        await colls.people.update({email}, {$set: {validated: true}});
        res.cookie('name',name).cookie('email',email).cookie('token',makeToken(email)).redirect(redir);
    } else {
        res.send('Invalid link');
    }
}

export async function css(req, res) {
    res.type('css').render('login-css', {player_colors});
}
