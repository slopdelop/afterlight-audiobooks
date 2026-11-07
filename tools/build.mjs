import {createHash} from 'node:crypto';
import {readFile,mkdir,copyFile,writeFile,readdir,access} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const SHELL=['index.html','styles.css','app.js','core.js','icons.js','storage.js','mp3.js','updates.js','reader.js','viewport.js','playback.js','progress.js','sleep.js','voice-review.js','volume-test.js','casting-view.js','manifest.webmanifest','catalog.json'];
const RAW_AUDIO='https://raw.githubusercontent.com/slopdelop/afterlight-audiobooks/';
export function archivedAudioPaths(catalog){
 const paths=new Set();
 for(const book of catalog.books??[]){
  const chapters=book.chapters??[],archived=chapters.filter(c=>Object.hasOwn(c,'archiveSrc'));
  if(!archived.length)continue;
  if(archived.length!==chapters.length||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(book.id))throw Error('Invalid archived audiobook coverage');
  let commit;
  for(const c of archived){
   const number=String(c.number).padStart(2,'0'),path=`audio/${book.id}/chapter-${number}.mp3`;
   const pin=typeof c.src==='string'&&c.src.startsWith(RAW_AUDIO)&&/^([a-f0-9]{40})\/(.+)$/.exec(c.src.slice(RAW_AUDIO.length));
   if(!Number.isSafeInteger(c.number)||c.number<1||c.id!==`${book.id}-${number}`||c.archiveSrc!==path||!pin||pin[2]!==path||paths.has(path)||commit&&pin[1]!==commit)throw Error(`Invalid pinned audio archive for ${c.id}`);
   commit=pin[1];paths.add(path);
  }
 }
 return paths;
}
async function filesIn(dir){const entries=await readdir(dir,{withFileTypes:true});const files=[];for(const e of entries){const path=resolve(dir,e.name);if(e.isDirectory())files.push(...await filesIn(path));else files.push(path);}return files;}
export async function build({root=ROOT,output=resolve(root,'_site')}={}){
 const textFiles=await filesIn(resolve(root,'text')).catch(error=>{if(error.code==='ENOENT')return [];throw error;});
 const archives=archivedAudioPaths(JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8')));
 for(const path of archives){
  const exists=await access(resolve(output,path)).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;});
  if(exists)throw Error(`Stale archived audio in build output: ${path}. Build into a fresh directory.`);
 }
 const audioFiles=(await filesIn(resolve(root,'audio'))).filter(path=>!archives.has(relative(root,path).replaceAll('\\','/')));
 const files=[...SHELL.map(f=>resolve(root,f)),...await filesIn(resolve(root,'assets')),...audioFiles,...textFiles].sort();
 const hash=createHash('sha256');for(const path of files){hash.update(relative(root,path).replaceAll('\\','/'));hash.update(await readFile(path));}const worker=await readFile(resolve(root,'sw.js'),'utf8');hash.update(worker);const version=hash.digest('hex').slice(0,16);
 await mkdir(output,{recursive:true});for(const path of files){const dest=resolve(output,relative(root,path));await mkdir(dirname(dest),{recursive:true});await copyFile(path,dest);}
 await writeFile(resolve(output,'sw.js'),worker.replaceAll('__AFTERLIGHT_BUILD__',version).replace('const TEXT_ASSETS=[];', 'const TEXT_ASSETS='+JSON.stringify(textFiles.map(path=>relative(root,path).replaceAll('\\','/')))+';'));await writeFile(resolve(output,'version.json'),JSON.stringify({version,schemaVersion:1})+'\n');await writeFile(resolve(output,'.nojekyll'),'');return {version,output};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const result=await build();console.log(`Afterlight release ${result.version}: ${result.output}`);}
