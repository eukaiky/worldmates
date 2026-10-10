export {
  COUNTRIES,
  INTERESTS,
  countryName,
  isOnline,
  characterCount,
  profileComplete,
} from './catalog'

export function primaryPhoto(profile) {
  const photos = profile?.photos || []

  return (
    photos.find(photo => photo.slot === (profile.primary_photo_slot ?? 0)) ||
    photos.find(photo => photo.slot === 0) ||
    photos[0] ||
    null
  )
}

export function timeAgo(value) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return formatter.format(-Math.floor(seconds / 60), 'minute')
  if (seconds < 86400) return formatter.format(-Math.floor(seconds / 3600), 'hour')
  if (seconds < 604800) return formatter.format(-Math.floor(seconds / 86400), 'day')

  return new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}