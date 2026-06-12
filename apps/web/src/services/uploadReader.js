import JSZip from 'jszip';

const skippedBinaryPattern = /\.(png|jpg|jpeg|gif|webp|ico|pdf|dll|exe|bin|lock|woff2?)$/i;

async function readFileAsText(file) {
  try {
    return await file.text();
  } catch {
    return '';
  }
}

export async function expandUploads(fileList) {
  const files = [];
  for (const file of fileList) {
    if (/\.zip$/i.test(file.name)) {
      const zip = await JSZip.loadAsync(file);
      for (const [name, entry] of Object.entries(zip.files)) {
        if (entry.dir || skippedBinaryPattern.test(name)) continue;
        const text = await entry.async('string').catch(() => '');
        files.push({ name, size: text.length, text });
      }
    } else {
      files.push({
        name: file.webkitRelativePath || file.name,
        size: file.size,
        text: await readFileAsText(file)
      });
    }
  }
  return files;
}
