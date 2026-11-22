const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('toolkit',{start:config=>ipcRenderer.invoke('run:start',config),history:config=>ipcRenderer.invoke('history:open',config),stop:()=>ipcRenderer.invoke('run:stop'),onEvent:fn=>{const listener=(_,event)=>fn(event);ipcRenderer.on('run:event',listener);return()=>ipcRenderer.removeListener('run:event',listener);}});
