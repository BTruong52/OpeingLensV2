const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('lens',{
  onPaint:callback=>ipcRenderer.on('paint',(_,data)=>callback(data)),
  onCoachState:callback=>ipcRenderer.on('coach-state',(_,data)=>callback(data)),
  onStreamBoard:callback=>ipcRenderer.on('stream-board',(_,data)=>callback(data))
});
