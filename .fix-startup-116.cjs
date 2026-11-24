const fs=require('fs');let s=fs.readFileSync('desktop/main.cjs','utf8');s=s.replace("const {app,BrowserWindow,ipcMain}=require('electron');", "const {app,BrowserWindow,ipcMain,dialog}=require('electron');const fs=require('node:fs');");s=s.replace('const debugPort=',`// Software rendering avoids driver/RDP GPU failures on recipient machines.
app.disableHardwareAcceleration();
const diagnosticFile=path.join(app.getPath('userData'),'startup.log');
function diagnostic(message){try{fs.mkdirSync(path.dirname(diagnosticFile),{recursive:true});if(fs.existsSync(diagnosticFile)&&fs.statSync(diagnosticFile).size>1048576)fs.copyFileSync(diagnosticFile,diagnosticFile+'.previous');fs.appendFileSync(diagnosticFile,new Date().toISOString()+' '+message+'\\n');}catch{}}
function startupFailure(error){diagnostic(error?.stack||String(error));dialog.showErrorBox('Không mở được giao diện',String(error?.message||error)+'\\n\\nNhật ký: '+diagnosticFile);}
process.on('uncaughtException',startupFailure);process.on('unhandledRejection',startupFailure);
const debugPort=`);s=s.replace('new BrowserWindow({width:', 'new BrowserWindow({show:false,width:');s=s.replace(' const emit=event=>',` diagnostic('Starting version '+app.getVersion()+' on '+process.platform+' '+process.arch+'; software rendering.');
 win.once('ready-to-show',()=>win.show());
 win.webContents.on('preload-error',(_e,file,error)=>startupFailure(error));
 win.webContents.on('render-process-gone',(_e,details)=>startupFailure(Error('Renderer stopped: '+details.reason+' ('+details.exitCode+')')));
 win.webContents.on('did-fail-load',(_e,code,description,url,isMainFrame)=>{if(isMainFrame&&code!==-3)startupFailure(Error('UI load failed '+code+': '+description));});
 win.webContents.once('did-finish-load',()=>{setTimeout(async()=>{if(win.isDestroyed())return;try{const ready=await win.webContents.executeJavaScript("document.documentElement.dataset.ready==='true' && !!window.toolkit");if(!ready)startupFailure(Error('Giao diện hoặc preload chưa khởi tạo. Hãy giải nén toàn bộ bộ chạy.'));else diagnostic('UI ready.');}catch(error){startupFailure(error);}},3000);});
 const emit=event=>`);s=s.replace("win.loadFile(path.join(__dirname,'index.html'));", "win.loadFile(path.join(__dirname,'index.html')).catch(startupFailure);");fs.writeFileSync('desktop/main.cjs',s);
s=fs.readFileSync('desktop/renderer.js','utf8');s+="\ndocument.documentElement.dataset.ready='true';\n";fs.writeFileSync('desktop/renderer.js',s);
s=fs.readFileSync('desktop/index.html','utf8').replace('<body>','<body><div id="boot-status" role="status">Đang mở giao diện… Nếu thông báo này không biến mất, hãy giải nén đầy đủ thư mục trước khi chạy.</div>');fs.writeFileSync('desktop/index.html',s);
fs.appendFileSync('desktop/style.css',`\n#boot-status{position:fixed;inset:0;z-index:99999;background:#121c30;color:#deebfc;display:grid;place-content:center;padding:35px;font:15px/1.7 'Segoe UI',sans-serif}html[data-ready=true] #boot-status{display:none}\n`);
const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.version='1.1.6';p.build.directories.output='dist/1.1.6';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');const l=JSON.parse(fs.readFileSync('package-lock.json','utf8'));l.version=p.version;if(l.packages?.[''])l.packages[''].version=p.version;fs.writeFileSync('package-lock.json',JSON.stringify(l,null,2)+'\n');
