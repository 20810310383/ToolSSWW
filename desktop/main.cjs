const {app,BrowserWindow,ipcMain,dialog}=require('electron');const fs=require('node:fs');const path=require('node:path');const {validate}=require('./config.cjs');
// Software rendering avoids driver/RDP GPU failures on recipient machines.
app.disableHardwareAcceleration();
const diagnosticFile=path.join(app.getPath('userData'),'startup.log');
function diagnostic(message){try{fs.mkdirSync(path.dirname(diagnosticFile),{recursive:true});if(fs.existsSync(diagnosticFile)&&fs.statSync(diagnosticFile).size>1048576){fs.copyFileSync(diagnosticFile,diagnosticFile+'.previous');fs.writeFileSync(diagnosticFile,'');}fs.appendFileSync(diagnosticFile,new Date().toISOString()+' '+message+'\n');}catch{}}
function startupFailure(error){diagnostic(error?.stack||String(error));dialog.showErrorBox('Không mở được giao diện',String(error?.message||error)+'\n\nNhật ký: '+diagnosticFile);}
process.on('uncaughtException',startupFailure);process.on('unhandledRejection',startupFailure);
const debugPort=require('node:crypto').randomInt(42000,62000);
app.commandLine.appendSwitch('remote-debugging-address','127.0.0.1');app.commandLine.appendSwitch('remote-debugging-port',String(debugPort));
let win,runner,embeddedRunner,embedded;
app.whenReady().then(()=>{
 win=new BrowserWindow({show:false,width:1220,height:850,minWidth:960,minHeight:720,backgroundColor:'#0b1020',title:'Samsung Staging Toolkit',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 diagnostic('Starting version '+app.getVersion()+' on '+process.platform+' '+process.arch+'; software rendering.');
 win.once('ready-to-show',()=>win.show());
 win.webContents.on('preload-error',(_e,file,error)=>startupFailure(error));
 win.webContents.on('render-process-gone',(_e,details)=>startupFailure(Error('Renderer stopped: '+details.reason+' ('+details.exitCode+')')));
 win.webContents.on('did-fail-load',(_e,code,description,url,isMainFrame)=>{if(isMainFrame&&code!==-3)startupFailure(Error('UI load failed '+code+': '+description));});
 win.webContents.once('did-finish-load',()=>{setTimeout(async()=>{if(win.isDestroyed())return;try{const ready=await win.webContents.executeJavaScript("document.documentElement.dataset.ready==='true' && !!window.toolkit");if(!ready)startupFailure(Error('Giao diện hoặc preload chưa khởi tạo. Hãy giải nén toàn bộ bộ chạy.'));else diagnostic('UI ready.');}catch(error){startupFailure(error);}},3000);});
 const emit=event=>{if(!win.isDestroyed())win.webContents.send('run:event',event)};
 embedded=new (require('./embedded-browser.cjs').EmbeddedBrowser)(win,emit);win.on('resize',()=>embedded.layout());
 const getEmbedded=()=>{if(!embeddedRunner){embeddedRunner=new (require('./runner.cjs').Runner)('',emit);embeddedRunner.browser=async config=>{if(embeddedRunner.environment&&(embeddedRunner.environment.root!==config.root||embeddedRunner.environment.api!==config.api))throw Error('Dừng phiên trước khi đổi môi trường.');embeddedRunner.environment={root:config.root,api:config.api};const context=['checkout','loop'].includes(config.mode)?await embedded.automationContext(debugPort):embedded;embeddedRunner.context=context;return context;};}return embeddedRunner;};
 ipcMain.handle('browser:layout',(_,data)=>{embedded.visible=!!data.visible;if(data.bounds&&Object.values(data.bounds).every(Number.isFinite))embedded.bounds=data.bounds;embedded.layout();return {ok:true};});
 ipcMain.handle('browser:command',async(_,data)=>{await embedded.command(data.action,data.id,data.url);return {ok:true};});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());win.loadFile(path.join(__dirname,'index.html')).catch(startupFailure);
 const getRunner=()=>runner||(runner=new (require('./runner.cjs').Runner)(path.join(app.getPath('userData'),'chrome-profile'),event=>{if(!win.isDestroyed())win.webContents.send('run:event',event)}));
 ipcMain.handle('run:start',(_,raw)=>{const config=validate(raw);const task=config.browserMode==='external'?getRunner():getEmbedded();if(runner?.active||embeddedRunner?.active)throw Error('Một phiên đang chạy.');task.run(config).catch(e=>win.webContents.send('run:event',{type:'log',level:'error',message:e.message}));return {ok:true};});
 ipcMain.handle('history:open',async(_,raw)=>{const config=validate({...raw,mode:'orders',fillCard:false});await (config.browserMode==='external'?getRunner():getEmbedded()).openHistory(config);return {ok:true};});
 ipcMain.handle('cookies:reset',async(_,raw)=>{const config=validate({...raw,mode:'cart',skus:'_RESET_',fillCard:false});await (config.browserMode==='external'?getRunner():getEmbedded()).resetCookies(config);return {ok:true};});
 ipcMain.handle('run:stop',async()=>{await runner?.stop();await embedded.close();if(embeddedRunner){embeddedRunner.cancelled=true;embeddedRunner.environment=null;embeddedRunner.context=null;}emit({type:'browserClosed'});return {ok:true};});
});
app.on('window-all-closed',()=>{runner?.stop();embedded?.close();app.quit();});
