// Isolate Electron/Windows renderer startup from all Samsung app code.
const {app,BrowserWindow}=require('electron');
app.disableHardwareAcceleration();
let win,finished=false;
function finish(code,message){if(finished)return;finished=true;console.log('[Probe] '+message);setTimeout(()=>app.exit(code),code?100:1500);}
app.whenReady().then(async()=>{
 console.log('[Probe] Electron '+process.versions.electron+' | Windows '+require('os').release()+' | '+process.arch);
 win=new BrowserWindow({width:640,height:340,show:true,webPreferences:{sandbox:true,nodeIntegration:false,contextIsolation:true}});
 win.webContents.on('render-process-gone',(_e,d)=>finish(2,'FAIL renderer '+d.reason+' exitCode='+d.exitCode));
 const timer=setTimeout(()=>finish(3,'FAIL renderer timeout after 15s'),15000);timer.unref();
 try{await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><meta charset="utf-8"><title>Electron startup probe</title><body><h1>Electron renderer OK</h1><p>This page contains no Samsung code and no network requests.</p></body>'));const title=await win.webContents.executeJavaScript('document.title');if(title!=='Electron startup probe')throw Error('Unexpected title');finish(0,'PASS minimal sandboxed renderer. App-specific startup needs investigation.');}catch(e){finish(2,'FAIL minimal page '+e.message);}
}).catch(e=>finish(2,'FAIL '+e.message));
app.on('window-all-closed',()=>{if(!finished)finish(2,'Probe closed before completion')});
