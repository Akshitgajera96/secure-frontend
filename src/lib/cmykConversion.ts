import { api } from '@/config/api';

export async function convertPdfToCmykAndDownload(rgbPdfBlob: Blob, fileName: string = 'tickets-cmyk.pdf') {
  const formData = new FormData();
  formData.append('file', rgbPdfBlob, 'tickets-rgb.pdf');

  const response = await api.post('/api/convert-to-cmyk', formData, {
    responseType: 'blob',
  });

  const cmykBlob = response.data as Blob;
  const url = URL.createObjectURL(cmykBlob);

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}
