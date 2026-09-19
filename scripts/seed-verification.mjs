import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
const db=new DatabaseSync('tmp/verification/intelligence.db');
db.exec(fs.readFileSync('src/server/db/schema.sql','utf8'));
const insert=db.prepare('INSERT OR REPLACE INTO observations(id,domain,source,entity_id,lat,lon,alt,timestamp,data_json) VALUES (?,?,?,?,?,?,?,?,?)');
const now=Date.now();
for(const domain of ['aviation','maritime','gpsjam','satellite','seismic','thermal','market'])insert.run('verification-'+domain,domain,'test_fixture',domain,26,56,10000,now,JSON.stringify({name:'VERIFICATION FIXTURE',callsign:'TEST',symbol:'TEST',price:100,changePct:0}));
for(let i=0;i<60;i++)insert.run('replay-fixture-'+i,'aviation','test_fixture','replay-plane',26+i*.01,56+i*.01,10000,now-12*3600000+i*60000,JSON.stringify({callsign:'REPLAY FIXTURE'}));
db.close();
