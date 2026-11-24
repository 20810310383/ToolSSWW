const fs=require('node:fs');const path=require('node:path');const {spawn,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),pkg=require('../package.json'),dist=path.join(root,'dist');
function run(executable,args,cwd=root){return new Promise((resolve,reject)=>{const child=spawn(executable,args,{cwd,stdio:'inherit',windowsHide:true,shell:false});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(path.basename(executable)+' exit '+code)));});}
(async()=>{
 const rar=[process.env.RAR_PATH,'C:\\Program Files\\WinRAR\\Rar.exe','C:\\Program Files (x86)\\WinRAR\\Rar.exe'].find(x=>x&&fs.existsSync(x));
 if(!rar)throw Error('Can WinRAR Rar.exe hoac dat RAR_PATH.');
 fs.mkdirSync(dist,{recursive:true});
 // Always create a new output. Never delete, clean or overwrite old releases.
 const output=fs.mkdtempSync(path.join(dist,pkg.version+'-'));
 const relative=path.relative(root,output);
 // Build an isolated manual-confirmation snapshot; never edit the user's runner.
 const stage=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'samsung-manual-release-'));
 fs.cpSync(path.join(root,'desktop'),path.join(stage,'desktop'),{recursive:true});
 fs.copyFileSync(path.join(root,'orders-popup.cjs'),path.join(stage,'orders-popup.cjs'));
 const stagedPackage={...pkg};delete stagedPackage.build;delete stagedPackage.devDependencies;delete stagedPackage.scripts;
 fs.writeFileSync(path.join(stage,'package.json'),JSON.stringify(stagedPackage,null,2));
 for(const name of ['playwright','playwright-core'])fs.cpSync(path.join(root,'node_modules',name),path.join(stage,'node_modules',name),{recursive:true});
 const stagedRunner=path.join(stage,'desktop','runner.cjs');let runner=fs.readFileSync(stagedRunner,'utf8');
 runner=runner.replace(/^[ \t]*await p\.locator\('#es-adyenCcPaymentModeOptin-input'\)\.click\(\);\r?\n/gm,'');
 runner=runner.replace(/^[ \t]*await p\.locator\('button\[data-an-la="payment:pay now:credit card"\]'\)\.click\(\);\r?\n/gm,'');
 if(/await p\.locator\([^\n]*(?:adyenCcPaymentModeOptin-input|payment:pay now:credit card)[^\n]*\.click\(/.test(runner))throw Error('Manual confirmation snapshot validation failed.');
 fs.writeFileSync(stagedRunner,runner);
 const configPath=path.join(output,'release-config.json');
 fs.writeFileSync(configPath,JSON.stringify({...pkg.build,npmRebuild:false,directories:{app:stage,output}},null,2));
 console.log('Manual-confirmation snapshot prepared; original source preserved.');
 console.log('NEW OUTPUT:',output);
 await run(process.execPath,[require.resolve('electron-builder/cli.js'),'--win','portable','--x64','--config='+configPath]);
 const name='Samsung-Staging-Toolkit-'+pkg.version,exe=path.join(output,name+'.exe'),archive=path.join(output,name+'-full.rar');
 if(!fs.existsSync(exe)||fs.statSync(exe).size<1000000)throw Error('EXE missing or incomplete.');
 const unpacked=path.join(output,'win-unpacked');
 for(const required of ['Samsung Staging Toolkit.exe','resources/app.asar','locales/en-US.pak'])if(!fs.existsSync(path.join(unpacked,required)))throw Error('Missing runtime file: '+required);
 const guide='HUONG-DAN.txt';
 fs.writeFileSync(path.join(output,guide),'Samsung Staging Toolkit '+pkg.version+' - by Khac Tu\r\n\r\nGiai nen TOAN BO RAR truoc khi chay.\r\nCach 1: mo '+name+'.exe (portable).\r\nCach 2: mo win-unpacked/Samsung Staging Toolkit.exe, giu nguyen DLL, resources va locales.\r\nCan Windows x64 va VPN. Chrome chi can cho che do trinh duyet ben ngoai. Neu man hinh den, gui file %APPDATA%/samsung-staging-toolkit/startup.log de kiem tra.\r\nNhap ROOT/API va the TEST tren app. Ban tu xac nhan dieu khoan va dat hang.\r\nGoi khong chua cookie, profile hay log ca nhan.\r\n');
 fs.writeFileSync(path.join(output,'KHOI-DONG.cmd'),"@echo off\r\nsetlocal\r\nset ELECTRON_RUN_AS_NODE=\r\nstart \"\" \"%~dp0win-unpacked\\Samsung Staging Toolkit.exe\"\r\n");
 console.log('Creating full application RAR…');
 await run(rar,['a','-ma5','-m1','-r','-idq',archive,'win-unpacked',path.basename(exe),guide,'KHOI-DONG.cmd'],output);
 console.log('Verifying RAR…');await run(rar,['t','-inul',archive]);
 const entries=execFileSync(rar,['lb',archive],{encoding:'utf8',windowsHide:true}).replace(/\\/g,'/');
 for(const required of ['win-unpacked/resources/app.asar','win-unpacked/locales/en-US.pak','win-unpacked/Samsung Staging Toolkit.exe',path.basename(exe),guide])if(!entries.includes(required))throw Error('RAR missing '+required);
 console.log('PASS: full application contents and archive integrity.');
 console.log('NO OLD FILES OR FOLDERS DELETED.');console.log('OUTPUT:',output);console.log('RAR:',archive);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
