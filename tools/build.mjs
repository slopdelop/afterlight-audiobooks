import {createHash} from 'node:crypto';
import {readFile,mkdir,copyFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const SHELL=['index.html','styles.css','app.js','core.js','icons.js','storage.js','mp3.js','updates.js','reader.js','playback.js','sleep.js','voice-review.js','manifest.webmanifest','catalog.json'];
async function filesIn(dir){const entries=await readdir(dir,{withFileTypes:true});const files=[];for(const e of entries){const path=resolve(dir,e.name);if(e.isDirectory())files.push(...await filesIn(path));else files.push(path);}return files;}
export async function build({root=ROOT,output=resolve(root,'_site')}={}){
 const textFiles=await filesIn(resolve(root,'text')).catch(error=>{if(error.code==='ENOENT')return [];throw error;});
 const files=[...SHELL.map(f=>resolve(root,f)),...await filesIn(resolve(root,'assets')),...await filesIn(resolve(root,'audio')),...textFiles].sort();
 const hash=createHash('sha256');for(const path of files){hash.update(relative(root,path).replaceAll('\\','/'));hash.update(await readFile(path));}const worker=await readFile(resolve(root,'sw.js'),'utf8');hash.update(worker);const version=hash.digest('hex').slice(0,16);
 await mkdir(output,{recursive:true});for(const path of files){const dest=resolve(output,relative(root,path));await mkdir(dirname(dest),{recursive:true});await copyFile(path,dest);}
 await writeFile(resolve(output,'sw.js'),worker.replaceAll('__AFTERLIGHT_BUILD__',version).replace('const TEXT_ASSETS=[];', 'const TEXT_ASSETS='+JSON.stringify(textFiles.map(path=>relative(root,path).replaceAll('\\','/')))+';'));await writeFile(resolve(output,'version.json'),JSON.stringify({version,schemaVersion:1})+'\n');await writeFile(resolve(output,'.nojekyll'),'');return {version,output};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const result=await build();console.log(`Afterlight release ${result.version}: ${result.output}`);}
