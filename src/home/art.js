const art=import.meta.glob('./art/*.webp',{eager:true,query:'?url',import:'default'});
export function characterArt(name){return art['./art/'+name.replace(/\.png$/,'.webp')];}
