const {WebContentsView,session}=require('electron');
const {EventEmitter}=require('node:events');
class EmbeddedBrowser extends EventEmitter{
 constructor(win,emit){super();this.win=win;this.emitUI=emit;this.tabs=[];this.selected=null;this.visible=false;this.bounds={x:252,y:215,width:800,height:500};this.storage=session.fromPartition('persist:samsung-embedded');this.storage.setPermissionRequestHandler((_wc,_permission,done)=>done(false));this.storage.setPermissionCheckHandler(()=>false);}
 state(){this.emitUI({type:'embeddedState',selected:this.selected,tabs:this.tabs.map(p=>({id:p.id,title:p.view.webContents.getTitle()||'Tab mới',url:p.view.webContents.getURL(),loading:p.view.webContents.isLoading()}))});}
 layout(){const [w,h]=this.win.getContentSize();const b=this.bounds;for(const p of this.tabs){p.view.setBounds({x:Math.max(0,b.x),y:Math.max(0,b.y),width:Math.max(1,Math.min(b.width,w-b.x)),height:Math.max(1,Math.min(b.height,h-b.y))});p.view.setVisible(this.visible&&p.id===this.selected);}}
 show(id){if(id)this.selected=id;this.visible=true;this.emitUI({type:'embeddedFocus'});this.layout();this.state();}
 async newPage(){
  const view=new WebContentsView({webPreferences:{session:this.storage,nodeIntegration:false,contextIsolation:true,sandbox:true}});const wc=view.webContents;const scripts=[];const page={id:String(wc.id),view,isClosed:()=>wc.isDestroyed(),setDefaultTimeout(){},goto:async url=>{if(!/^https:\/\//.test(url))throw Error('Chỉ mở HTTPS');await wc.loadURL(url);},evaluate:async(fn,arg)=>wc.executeJavaScript('('+fn.toString()+')('+JSON.stringify(arg)+')'),addInitScript:async(fn,arg)=>scripts.push('('+fn.toString()+')('+JSON.stringify(arg)+')'),bringToFront:async()=>this.show(page.id)};
  wc.on('dom-ready',()=>{for(const script of scripts)wc.executeJavaScript(script).catch(()=>{});});
  const safe=url=>/^https:\/\//.test(url);wc.on('will-navigate',(e,url)=>{if(!safe(url))e.preventDefault()});wc.on('will-redirect',(e,url)=>{if(!safe(url))e.preventDefault()});
  wc.setWindowOpenHandler(({url})=>{if(safe(url))this.newPage().then(p=>p.goto(url)).catch(e=>this.emitUI({type:'log',level:'error',message:e.message}));return {action:'deny'};});
  for(const event of ['did-start-loading','did-stop-loading','did-navigate','did-navigate-in-page','page-title-updated'])wc.on(event,()=>this.state());
  wc.on('destroyed',()=>{this.tabs=this.tabs.filter(p=>p!==page);if(this.selected===page.id)this.selected=this.tabs[0]?.id||null;this.layout();this.state();});
  this.tabs.push(page);this.win.contentView.addChildView(view);this.show(page.id);return page;
 }
 pages(){return this.tabs.filter(p=>!p.isClosed());}
 async automationContext(port){
  if(!this.cdpBrowser?.isConnected())this.cdpBrowser=await require('playwright').chromium.connectOverCDP('http://127.0.0.1:'+port);
  const pages=()=>this.cdpBrowser.contexts().flatMap(c=>c.pages());
  return {newPage:async()=>{const native=await this.newPage();const marker='about:blank#embedded-'+native.id;await native.view.webContents.loadURL(marker);let page;for(let i=0;i<100;i++){page=pages().find(p=>p.url()===marker);if(page)break;await new Promise(r=>setTimeout(r,30));}if(!page)throw Error('Không kết nối được tab nhúng cho checkout.');page.bringToFront=async()=>this.show(native.id);return page;},pages:()=>pages().filter(p=>this.tabs.some(t=>t.view.webContents.getURL()===p.url())),clearCookies:()=>this.clearCookies(),close:()=>this.close(),once:(...args)=>this.once(...args)};
 }
 async clearCookies(){const cookies=await this.storage.cookies.get({});for(const c of cookies)await this.storage.cookies.remove((c.secure?'https://':'http://')+c.domain.replace(/^\./,'')+(c.path||'/'),c.name);await this.storage.flushStorageData();}
 async close(){for(const p of [...this.tabs]){this.win.contentView.removeChildView(p.view);p.view.webContents.close();}this.emit('close');}
 async command(action,id,url){
 if(action==='new'){await this.newPage();return;}
 if(action==='navigate'){
  const value=String(url||'').trim();let target;try{target=new URL(/^[a-z][a-z0-9+.-]*:/i.test(value)?value:'https://'+value);}catch{throw Error('URL không hợp lệ.');}
  if(target.protocol!=='https:'||target.username||target.password)throw Error('Nhập URL HTTPS, không kèm tài khoản/mật khẩu.');
  const page=this.tabs.find(p=>p.id===(id||this.selected))||await this.newPage();await page.goto(target.href);return;
 }
const p=this.tabs.find(p=>p.id===(id||this.selected));if(!p)return;const wc=p.view.webContents;if(action==='select')this.show(p.id);if(action==='close'){this.win.contentView.removeChildView(p.view);wc.close();}if(action==='reload')wc.reload();if(action==='back'&&wc.navigationHistory.canGoBack())wc.navigationHistory.goBack();if(action==='forward'&&wc.navigationHistory.canGoForward())wc.navigationHistory.goForward();}
}
module.exports={EmbeddedBrowser};
