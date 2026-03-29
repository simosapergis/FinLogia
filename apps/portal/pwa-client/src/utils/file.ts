export const extractFileExtension = (fileName: string) => fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
