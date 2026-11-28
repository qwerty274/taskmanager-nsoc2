import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTasks, commitTasks } from './src/utils/taskStorage.js';
const task = id => ({id,text:id,dueDate:'',priority:'medium',completed:false,completedAt:null});
function fixture(){
 let value=null,tail=Promise.resolve();
 return {
 storage:{getItem:()=>value,setItem:(_,v)=>{value=v;}},
 locks:{request:(_,fn)=>{const result=tail.then(fn);tail=result.catch(()=>{});return result;}}
 };
}
test('serialized mutations read current state and preserve concurrent adds',async()=>{
 const {storage,locks}=fixture();
 await Promise.all([commitTasks(storage,locks,p=>[...p,task('a')]),commitTasks(storage,locks,p=>[...p,task('b')])]);
 assert.deepEqual(parseTasks(storage.getItem()).map(t=>t.id),['a','b']);
 await Promise.all([commitTasks(storage,locks,p=>p.map(t=>t.id==='a'?{...t,text:'edited'}:t)),commitTasks(storage,locks,p=>p.filter(t=>t.id!=='b'))]);
 assert.deepEqual(parseTasks(storage.getItem()).map(t=>t.text),['edited']);
});
test('legacy IDs are repeatable between tabs and persist on first mutation',async()=>{
 const {storage,locks}=fixture();const old=task('a');delete old.id;
 storage.setItem('tasks',JSON.stringify([old]));
 const first=parseTasks(storage.getItem())[0].id;
 assert.equal(first,parseTasks(storage.getItem())[0].id);
 await commitTasks(storage,locks,p=>p);
 assert.equal(first,JSON.parse(storage.getItem())[0].id);
});
test('corrupt storage and unavailable locking never overwrite original data',async()=>{
 const {storage,locks}=fixture();storage.setItem('tasks','broken');
 await assert.rejects(commitTasks(storage,locks,p=>p));
 assert.equal(storage.getItem(),'broken');
 await assert.rejects(commitTasks(storage,null,[]));
 assert.equal(storage.getItem(),'broken');
});
test('storage clear and invalid shapes have explicit meanings',()=>{
 assert.deepEqual(parseTasks(null),[]);
 assert.throws(()=>parseTasks('{}'));
 assert.throws(()=>parseTasks('[{}]'));
});
