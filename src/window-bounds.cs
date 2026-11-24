using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Web.Script.Serialization;
// A persistent, read-only window inventory. Coordinates are physical pixels.
class WindowBounds {
  delegate bool Callback(IntPtr hwnd, IntPtr data);
  [StructLayout(LayoutKind.Sequential)] struct Rect { public int Left,Top,Right,Bottom; }
  [StructLayout(LayoutKind.Sequential)] struct Point { public int X,Y; }
  [DllImport("user32.dll")] static extern bool EnumWindows(Callback callback,IntPtr data);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr hwnd);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hwnd,out Rect rect);
  [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr hwnd,out Rect rect);
  [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr hwnd,ref Point point);
  [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr context);
  [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr hwnd,int attribute,out Rect value,int size);
  [DllImport("dwmapi.dll",EntryPoint="DwmGetWindowAttribute")] static extern int DwmInt(IntPtr hwnd,int attribute,out int value,int size);
  static object Box(Rect r){return new {x=r.Left,y=r.Top,width=r.Right-r.Left,height=r.Bottom-r.Top};}
  static void Main(){
    try{SetProcessDpiAwarenessContext(new IntPtr(-4));}catch{}
    var json=new JavaScriptSerializer();
    while(Console.ReadLine()!=null){
      var windows=new List<object>();
      EnumWindows(delegate(IntPtr hwnd,IntPtr unused){
        int cloaked;
        if(!IsWindowVisible(hwnd) || IsIconic(hwnd) || (DwmInt(hwnd,14,out cloaked,4)==0 && cloaked!=0))return true;
        Rect bounds,frame;
        if(!GetWindowRect(hwnd,out bounds) || bounds.Right<=bounds.Left || bounds.Bottom<=bounds.Top)return true;
        if(DwmGetWindowAttribute(hwnd,9,out frame,16)!=0)frame=bounds;
        Rect client;Point origin=new Point();
        if(!GetClientRect(hwnd,out client) || !ClientToScreen(hwnd,ref origin))client=frame;
        else {client.Right+=origin.X;client.Bottom+=origin.Y;client.Left+=origin.X;client.Top+=origin.Y;}
        windows.Add(new {id=hwnd.ToInt64().ToString(),bounds=Box(bounds),frame=Box(frame),client=Box(client)});
        return true;
      },IntPtr.Zero);
      Console.WriteLine(json.Serialize(windows));
    }
  }
}
