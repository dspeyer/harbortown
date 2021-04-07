import mongodb from 'mongodb';
const { MongoClient } = mongodb;

export let colls = {};

const mgHostPort = process.env.MONGO_HOSTPORT || 'localhost:27017';
const mgProto = process.env.MONGO_PROTO || 'mongodb';
const mgDb = process.env.MONGO_DB || 'harbortown';
let mgUserPass = ''
if (process.env.MONGO_PASS) {
    mgUserPass = 'harbortown:'+process.env.MONGO_PASS+'@';
}

console.log({mgUserPass,mgDb,mgHostPort,url:mgProto+"://"+mgUserPass+mgHostPort+'/'+mgDb});

MongoClient.connect(mgProto+"://"+mgUserPass+mgHostPort+'/'+mgDb, (err,client) => {
    if (err) throw err;
    let db = client.db(mgDb);
    let cw = ['games','seeds','ids','people']
    for (let c of cw) {
        db.collection(c, (err, coll) => {
            if (err) throw err;
            colls[c] = coll;
            if (Object.keys(colls).length == cw.length) initIndices();
        });
    }
});

export const caseIns = {locale:'en',strength:2};

function initIndices() {
    colls.games.ensureIndex({id:1}, console.log.bind(null,'ensured games on id'));
    colls.games.ensureIndex({'players.email':1}, {collation:caseIns}, console.log.bind(null,'ensured games on email'));
    colls.seeds.ensureIndex({id:1}, console.log.bind(null,'ensured ids'));
    colls.people.ensureIndex({'email':1}, {collation:caseIns}, console.log.bind(null,'ensured players'));
}
