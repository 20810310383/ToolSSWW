const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
function launchOptions(args=process.argv.slice(2),environment=process.env){
 const env={...environment};delete env.ELECTRON_RUN_AS_NODE;
 const fresh=args.includes('--fresh-profile');
 const probe=args.includes('--probe');const electronArgs=[probe?path.join(__dirname,'probe.cjs'):path.resolve(__dirname,'..'),...args.filter(a=>!['--fresh-profile','--probe'].includes(a))];
 let profile=null;
 if(fresh){profile=fs.mkdtempSync(path.join(os.tmpdir(),'samsung-desktop-fresh-'));electronArgs.push('--user-data-dir='+profile);}
 return {env,args:electronArgs,profile};
}
if(require.main===module){
 const config=launchOptions();
 if(process.env.ELECTRON_RUN_AS_NODE)console.log('[Desktop] Bo ELECTRON_RUN_AS_NODE cho rieng tien trinh app.');
 if(config.profile)console.log('[Desktop] Profile kiem tra moi: '+config.profile+' (khong xoa profile cu).');
 const child=spawn(require('electron'),config.args,{cwd:path.resolve(__dirname,'..'),env:config.env,stdio:'inherit',windowsHide:true});
 child.once('error',e=>{console.error('[Desktop] '+e.message);process.exitCode=1;});
 child.once('exit',(code,signal)=>{if(signal)console.error('[Desktop] Ket thuc: '+signal);process.exitCode=code??1;});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(child.exitCode===null)child.kill(signal)});
}
module.exports={launchOptions};
