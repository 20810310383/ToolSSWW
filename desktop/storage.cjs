const fs=require('node:fs'),path=require('node:path'),{createHash,randomUUID}=require('node:crypto');
function writableDirectory(candidates){
 const failures=[];
 for(const candidate of candidates){let probe;try{fs.mkdirSync(candidate,{recursive:true});probe=path.join(candidate,'.write-check-'+randomUUID());fs.writeFileSync(probe,'ok',{flag:'wx'});fs.unlinkSync(probe);return {directory:candidate,failures};}catch(error){failures.push({directory:candidate,code:error.code||'UNKNOWN'});}}
 throw Error('Không tạo được thư mục cache có quyền ghi: '+failures.map(x=>x.directory+' ['+x.code+']').join('; '));
}
function configureBrowserStorage(app){
 const key=createHash('sha256').update(path.resolve(app.getPath('userData')).toLowerCase()).digest('hex').slice(0,12);
 const local=process.env.LOCALAPPDATA||path.join(app.getPath('appData'),'Local');
 const selected=writableDirectory([path.join(local,'SamsungStagingToolkit','browser-session-v2',key),path.join(app.getPath('temp'),'SamsungStagingToolkit','browser-session-v2',key)]);
 app.setPath('sessionData',selected.directory);
 const http=path.join(selected.directory,'http-cache');fs.mkdirSync(http,{recursive:true});app.commandLine.appendSwitch('disk-cache-dir',http);app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
 return selected;
}
module.exports={writableDirectory,configureBrowserStorage};
