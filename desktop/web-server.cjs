const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{randomBytes}=require('node:crypto');
async function createWebApp(options={}){
 const token=randomBytes(32).toString('hex'),events=[];let sequence=0,origin='';const emit=event=>{events.push({...event,id:++sequence});if(events.length>1000)events.splice(0,events.length-1000)};
 const browser=options.browser||(options.browserFactory?options.browserFactory(emit):new (require('./web-browser.cjs').WebBrowser)(emit,options.profile||path.resolve(__dirname,'../web-profile')));
 let runner,environment=null;function task(){if(!runner){runner=options.runnerFactory?options.runnerFactory(emit):new (require('./runner.cjs').Runner)('',emit);runner.browser=async config=>{if(environment&&(environment.root!==config.root||environment.api!==config.api))throw Error('Dừng phiên trước khi đổi ROOT/API.');environment={root:config.root,api:config.api};await browser.browser();runner.context=browser;return browser;};}return runner;}
 const files={'/style.css':['style.css','text/css'],'/renderer.js':['renderer.js','text/javascript'],'/web-bridge.js':['web-bridge.js','text/javascript']};
 function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body))}
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'");
  try{
   if(req.headers.host!==new URL(origin).host)return json(res,403,{error:'Host không hợp lệ.'});
   const url=new URL(req.url,origin);
   if(url.pathname.startsWith('/api/')){
    if(req.headers['x-tool-token']!==token)return json(res,401,{error:'Phiên không hợp lệ. Mở đường dẫn được in ở terminal.'});
    if(req.headers.origin&&req.headers.origin!==origin)return json(res,403,{error:'Origin không hợp lệ.'});
    if(req.headers['sec-fetch-site']==='cross-site')return json(res,403,{error:'Không chấp nhận yêu cầu từ website khác.'});
    if(req.method==='GET'&&url.pathname==='/api/events'){const after=Number(url.searchParams.get('after')||0);return json(res,200,{events:events.filter(e=>e.id>after),running:!!runner?.active,browserOpen:!!browser.context,environment});}
    if(req.method!=='POST')return json(res,405,{error:'Method không hợp lệ.'});
    if(!String(req.headers['content-type']||'').startsWith('application/json'))return json(res,415,{error:'Cần JSON.'});
    let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>65536)return json(res,413,{error:'Dữ liệu quá lớn.'});chunks.push(chunk)}
    const raw=JSON.parse(Buffer.concat(chunks).toString()||'{}');const {validate}=require('./config.cjs');const safe=value=>({...value,browserMode:'external',manualConfirmation:true});
    if(url.pathname==='/api/start'){
     const config={...validate(safe(raw)),manualConfirmation:true};const t=task();if(t.active)throw Error('Một tác vụ đang chạy.');
     t.run(config).catch(e=>emit({type:'log',level:'error',message:e.message}));return json(res,200,{ok:true});
    }
    if(url.pathname==='/api/history'){const config=validate(safe({...raw,mode:'orders',fillCard:false}));await task().openHistory(config);return json(res,200,{ok:true});}
    if(url.pathname==='/api/reset'){if(runner?.active)throw Error('Chờ tác vụ hoàn tất trước khi reset.');const config=validate(safe({...raw,mode:'cart',skus:'_RESET_',items:undefined,fillCard:false}));const t=task();if(!t.context&&browser.context)await t.browser(config);await t.resetCookies(config);return json(res,200,{ok:true});}
    if(url.pathname==='/api/stop'){if(runner)runner.cancelled=true;await browser.close();if(runner){runner.context=null;runner.historyPage=null;runner.cartPage=null;}environment=null;emit({type:'browserClosed'});return json(res,200,{ok:true});}
    if(url.pathname==='/api/browser'){await browser.command(raw);return json(res,200,{ok:true});}
    return json(res,404,{error:'Không tìm thấy API.'});
   }
   if(req.method!=='GET')return json(res,405,{error:'Method không hợp lệ.'});
   if(url.pathname==='/'){
    let html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');html=html.replace(/connect-src 'none'/g,"connect-src 'self'").replace('<script src="renderer.js"></script>','<script src="web-bridge.js"></script><script src="renderer.js"></script>');html=html.replace('Windows desktop · Chrome + VPN','Web local · Chrome / Edge + VPN');
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(html);
   }
   if(files[url.pathname]){const [file,mime]=files[url.pathname];res.writeHead(200,{'Content-Type':mime+'; charset=utf-8'});return res.end(fs.readFileSync(path.join(__dirname,file)));}
   return json(res,404,{error:'Không tìm thấy trang.'});
  }catch(e){if(!res.headersSent)json(res,400,{error:e.message});else res.end()}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(options.port??0,'127.0.0.1',resolve)});origin='http://127.0.0.1:'+server.address().port;
 return {server,browser,emit,url:origin+'/#'+token,origin,token,async close(){if(runner)runner.cancelled=true;await browser.shutdown();await new Promise(r=>server.close(r))}};
}
if(require.main===module)(async()=>{const app=await createWebApp();console.log('\nSamsung Toolkit — WEB LOCAL\n'+app.url+'\nGiữ terminal mở. Ctrl+C để dừng. Không cần Electron.\n');for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>app.close().then(()=>process.exit(0)));try{await app.browser.openDashboard(app.url)}catch(e){console.error(e.message);console.log('Mở thủ công đường dẫn ở trên, rồi thử tác vụ sau khi cài Chrome/Edge.')}})().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={createWebApp};
