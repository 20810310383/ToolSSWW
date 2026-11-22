const {app,BrowserWindow,ipcMain}=require('electron');const path=require('node:path');const {validate}=require('./config.cjs');const {Runner}=require('./runner.cjs');
let win,runner;
app.whenReady().then(()=>{
 win=new BrowserWindow({width:1220,height:850,minWidth:960,minHeight:720,backgroundColor:'#0b1020',title:'Samsung Staging Toolkit',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());win.loadFile(path.join(__dirname,'index.html'));
 runner=new Runner(path.join(app.getPath('userData'),'chrome-profile'),event=>{if(!win.isDestroyed())win.webContents.send('run:event',event)});
 ipcMain.handle('run:start',(_,raw)=>{const config=validate(raw);if(runner.active)throw Error('Một phiên đang chạy.');runner.run(config).catch(e=>win.webContents.send('run:event',{type:'log',level:'error',message:e.message}));return {ok:true};});
 ipcMain.handle('history:open',async(_,raw)=>{const config=validate({...raw,mode:'orders',fillCard:false});await runner.openHistory(config);return {ok:true};});
 ipcMain.handle('run:stop',async()=>{await runner.stop();return {ok:true};});
});
app.on('window-all-closed',()=>{runner?.stop();app.quit();});
