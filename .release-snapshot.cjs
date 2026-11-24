const fs=require('fs');let s=fs.readFileSync('desktop/release.cjs','utf8');s=s.replace(" const relative=path.relative(root,output);",` const relative=path.relative(root,output);
 // Build an isolated manual-confirmation snapshot; never edit the user's runner.
 const stage=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'samsung-manual-release-'));
 fs.cpSync(path.join(root,'desktop'),path.join(stage,'desktop'),{recursive:true});
 fs.copyFileSync(path.join(root,'orders-popup.cjs'),path.join(stage,'orders-popup.cjs'));
 const stagedPackage={...pkg};delete stagedPackage.build;delete stagedPackage.devDependencies;delete stagedPackage.scripts;
 fs.writeFileSync(path.join(stage,'package.json'),JSON.stringify(stagedPackage,null,2));
 for(const name of ['playwright','playwright-core'])fs.cpSync(path.join(root,'node_modules',name),path.join(stage,'node_modules',name),{recursive:true});
 const stagedRunner=path.join(stage,'desktop','runner.cjs');let runner=fs.readFileSync(stagedRunner,'utf8');
 runner=runner.replace(/^[ \\t]*await p\\.locator\\('#es-adyenCcPaymentModeOptin-input'\\)\\.click\\(\\);\\r?\\n/gm,'');
 runner=runner.replace(/^[ \\t]*await p\\.locator\\('button\\[data-an-la="payment:pay now:credit card"\\]'\\)\\.click\\(\\);\\r?\\n/gm,'');
 if(/await p\\.locator\\([^\\n]*(?:adyenCcPaymentModeOptin-input|payment:pay now:credit card)[^\\n]*\\.click\\(/.test(runner))throw Error('Manual confirmation snapshot validation failed.');
 fs.writeFileSync(stagedRunner,runner);
 const configPath=path.join(output,'release-config.json');
 fs.writeFileSync(configPath,JSON.stringify({...pkg.build,npmRebuild:false,directories:{app:stage,output}},null,2));
 console.log('Manual-confirmation snapshot prepared; original source preserved.');`);
s=s.replace("'--config.directories.output='+relative", "'--config='+configPath");s=s.replace("'-r',archive", "'-r','-idq',archive");s=s.replace(" - by Tumo", " - by Khac Tu");s=s.replace("Can Windows x64, Google Chrome va VPN.","Can Windows x64 va VPN. Chrome chi can cho che do trinh duyet ben ngoai. Neu man hinh den, gui file %APPDATA%/samsung-staging-toolkit/startup.log de kiem tra.");fs.writeFileSync('desktop/release.cjs',s);
s=fs.readFileSync('desktop/main.cjs','utf8').replace("fs.copyFileSync(diagnosticFile,diagnosticFile+'.previous');", "{fs.copyFileSync(diagnosticFile,diagnosticFile+'.previous');fs.writeFileSync(diagnosticFile,'');}");fs.writeFileSync('desktop/main.cjs',s);
