import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

/**
 * Uploads a file to a Supabase Storage bucket.
 * 
 * @param bucketName - The name of the storage bucket (e.g. 'avatars', 'assignments')
 * @param filePath - The path to store the file within the bucket (e.g. 'public/user123.png')
 * @param file - The file object to upload (Blob, File, or ArrayBuffer)
 * @param contentType - The MIME type of the file (e.g. 'image/png', 'application/pdf')
 */
export async function uploadFile(bucketName: string, filePath: string, file: Blob | File | ArrayBuffer, contentType?: string) {
  const options = contentType ? { contentType } : {};
  
  const { data, error } = await supabase
    .storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      ...options
    });

  if (error) {
    console.error('Storage Upload Error:', error.message);
    throw error;
  }

  return data;
}

/**
 * Gets a publicly accessible URL for a file in a public bucket.
 */
export function getPublicUrl(bucketName: string, filePath: string) {
  const { data } = supabase
    .storage
    .from(bucketName)
    .getPublicUrl(filePath);
    
  return data.publicUrl;
}

/**
 * Downloads a file from a Supabase Storage bucket.
 */
export async function downloadFile(bucketName: string, filePath: string) {
  const { data, error } = await supabase
    .storage
    .from(bucketName)
    .download(filePath);

  if (error) {
    console.error('Storage Download Error:', error.message);
    throw error;
  }

  return data;
}
