/**
 * 이미지 파일을 canvas로 압축하여 새 File 객체 반환
 * @param {File} file - 원본 이미지 파일
 * @param {number} maxWidth - 최대 너비 (기본 1280px)
 * @param {number} quality - JPEG 품질 0~1 (기본 0.8)
 * @returns {Promise<File>}
 */
export const compressImage = (file, maxWidth = 1024, quality = 0.7) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
        },
        'image/jpeg',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
};
