export const materialCategories=['Criativo','Vídeo','Apresentação','Expositor','Institucional','Outros'];
export const materialMimeTypes={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf','video/mp4':'mp4','video/quicktime':'mov','video/webm':'webm','application/zip':'zip'};
export const materialMaxBytes=50*1024*1024;
export const materialAccept=Object.keys(materialMimeTypes).join(',');
