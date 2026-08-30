const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export const isCloudinaryConfigured = Boolean(cloudName && uploadPreset)

// Uploads directly from the browser via an unsigned upload preset — no API secret
// is ever exposed client-side. Returns the CDN url + public_id to store in Supabase.
export async function uploadPostcardImage(blob) {
  const formData = new FormData()
  formData.append('file', blob)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', 'postcards')

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error?.message || 'Cloudinary へのアップロードに失敗しました')
  }

  const data = await res.json()
  return { url: data.secure_url, publicId: data.public_id }
}
