export const BASE=globalThis.location?.pathname.match(/^\/app\/[^/]+\//)?.[0]||'/';
export const DEFAULT_SETTINGS={autoMood:true,slots:['reading','saved','assets'],plugins:{finance:true,feed:true}};
export async function api(path,method='GET',body){
 const response=await fetch(BASE+'api/'+path,{method,cache:'no-store',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
 const data=await response.json();if(!response.ok)throw Error(data.error||'暂时无法连接服务器');return data;
}
