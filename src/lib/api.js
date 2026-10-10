import { supabase } from './supabase'

async function q(build, count = false) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)

  try {
    const result = await build(controller.signal)

    if (controller.signal.aborted) throw new Error('Request timed out. Try again.')
    if (result.error) throw result.error

    return count ? result.count || 0 : result.data
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Request timed out. Try again.')
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export function unwrap({ data, error }) {
  if (error) throw error
  return data
}

function notifyProfile() {
  window.dispatchEvent(new Event('worldmates:profile-updated'))
}

async function timeout(promise) {
  let timer

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Photos could not be loaded.')), 15000)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

export async function getBasicProfile(id) {
  const profile = await q(signal =>
    supabase.from('profiles').select('*').eq('id', id).maybeSingle().abortSignal(signal),
  )

  if (!profile) throw new Error('Profile not found. Check your database setup.')
  return profile
}

export async function attachPhotos(profiles) {
  if (!profiles.length) return []

  const photos = await q(signal =>
    supabase.from('photos').select('profile_id, slot, path')
      .in('profile_id', [...new Set(profiles.map(profile => profile.id))])
      .abortSignal(signal),
  )

  const signed = photos.length
    ? unwrap(await timeout(
        supabase.storage.from('profile-photos')
          .createSignedUrls(photos.map(photo => photo.path), 3600),
      ))
    : []

  if (signed.some(item => item.error || !item.signedUrl)) {
    throw new Error('Some photos are unavailable.')
  }

  return profiles.map(profile => ({
    ...profile,
    photos: photos
      .filter(photo => photo.profile_id === profile.id)
      .map(photo => ({
        ...photo,
        url: signed.find(item => item.path === photo.path)?.signedUrl,
      }))
      .sort((a, b) => a.slot - b.slot),
  }))
}

async function pictures(profiles) {
  try {
    return await attachPhotos(profiles)
  } catch (error) {
    return profiles.map(profile => ({
      ...profile,
      photos: [],
      photoWarning: error.message,
    }))
  }
}

export async function getProfile(id) {
  return (await pictures([await getBasicProfile(id)]))[0]
}

export async function discover(mode = 'recent') {
  const rows = await q(signal =>
    supabase.rpc('discover_people', { mode }).abortSignal(signal),
  )

  return pictures(rows)
}

export async function saveProfile(id, values) {
  const name = values.name.trim()
  const bio = values.bio.trim()

  if (!name || !values.country) throw new Error('Add your name and country.')
  if (Array.from(name).length > 50 || Array.from(bio).length > 100) {
    throw new Error('Name: 50 characters maximum. Bio: 100.')
  }
  if (values.interests.length > 8) throw new Error('Choose up to 8 interests.')

  const result = await q(signal =>
    supabase.from('profiles')
      .update({ name, country: values.country, bio, interests: values.interests })
      .eq('id', id).select('*').single().abortSignal(signal),
  )

  notifyProfile()
  return result
}

export function validatePhoto(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a JPEG, PNG or WebP image.')
  }
  if (!file.size || file.size > 5 * 1024 * 1024) {
    throw new Error('Choose a photo smaller than 5 MB.')
  }
}

function slotCheck(slot) {
  if (!Number.isInteger(slot) || slot < 0 || slot > 3) {
    throw new Error('Invalid photo position.')
  }
}

export async function uploadPhoto(userId, slot, file) {
  slotCheck(slot)
  validatePhoto(file)

  unwrap(await supabase.storage.from('profile-photos')
    .upload(`${userId}/${slot}`, file, {
      upsert: true, contentType: file.type, cacheControl: '0',
    }))

  unwrap(await supabase.from('photos').upsert(
    { profile_id: userId, slot },
    { onConflict: 'profile_id,slot', ignoreDuplicates: true },
  ))

  notifyProfile()
}

export async function removePhoto(userId, slot) {
  slotCheck(slot)
  unwrap(await supabase.storage.from('profile-photos').remove([`${userId}/${slot}`]))
  await q(signal =>
    supabase.from('photos').delete().eq('profile_id', userId)
      .eq('slot', slot).abortSignal(signal),
  )
  notifyProfile()
}

export async function setPrimaryPhoto(slot) {
  slotCheck(slot)
  await q(signal =>
    supabase.rpc('set_primary_photo', { target_slot: slot }).abortSignal(signal),
  )
  notifyProfile()
}

export async function sayHi(target) {
  return q(signal => supabase.rpc('say_hi', { target }).abortSignal(signal))
}

export async function getInbox() {
  const rows = await q(signal => supabase.rpc('get_inbox').abortSignal(signal))
  const people = await pictures(rows.map(row => row.person))
  return rows.map((row, index) => ({ ...row, person: people[index] }))
}

export async function getMessages(id, before = null) {
  const rows = await q(signal => {
    let request = supabase.from('messages').select('*').eq('conversation_id', id)

    if (before) {
      request = request.or(
        `created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`,
      )
    }

    return request.order('created_at', { ascending: false })
      .order('id', { ascending: false }).limit(50).abortSignal(signal)
  })

  return { messages: rows.reverse(), hasMore: rows.length === 50 }
}

export async function sendMessage(id, userId, body, clientId) {
  const text = body.trim()
  if (!text || Array.from(text).length > 2000) throw new Error('Use up to 2,000 characters.')

  const message = await q(signal =>
    supabase.from('messages').upsert({
      conversation_id: id, sender_id: userId, body: text, client_id: clientId,
    }, {
      onConflict: 'sender_id,client_id', ignoreDuplicates: true,
    }).select('*').maybeSingle().abortSignal(signal),
  )

  if (message) return message

  return q(signal =>
    supabase.from('messages').select('*').eq('sender_id', userId)
      .eq('client_id', clientId).single().abortSignal(signal),
  )
}

export async function getFeed(mode = 'all', before = null, author = null) {
  const rows = await q(signal =>
    supabase.rpc('get_feed', {
      feed_mode: mode,
      cursor_at: before?.created_at || null,
      cursor_id: before?.id || null,
      author_filter: author,
    }).abortSignal(signal),
  )

  const authors = await pictures(rows.map(row => row.author))
  return rows.map((row, index) => ({ ...row, author: authors[index] }))
}

export async function createPost(userId, body) {
  const text = body.trim()
  if (!text || Array.from(text).length > 500) throw new Error('Write up to 500 characters.')

  return q(signal =>
    supabase.from('posts').insert({ author_id: userId, body: text })
      .select('*').single().abortSignal(signal),
  )
}

export async function deletePost(id) {
  return q(signal => supabase.from('posts').delete().eq('id', id).abortSignal(signal))
}

export async function setLike(postId, userId, liked) {
  await q(signal => {
    const request = liked
      ? supabase.from('post_likes').upsert(
          { post_id: postId, user_id: userId },
          { onConflict: 'post_id,user_id', ignoreDuplicates: true },
        )
      : supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId)

    return request.abortSignal(signal)
  })

  return q(signal =>
    supabase.from('post_likes').select('*', { count: 'exact', head: true })
      .eq('post_id', postId).abortSignal(signal),
    true,
  )
}

export async function getComments(postId) {
  const rows = await q(signal =>
    supabase.from('post_comments')
      .select('*, author:profiles!post_comments_author_id_fkey(*)')
      .eq('post_id', postId).order('created_at', { ascending: false })
      .order('id', { ascending: false }).limit(50).abortSignal(signal),
  )

  const authors = await pictures(rows.map(row => row.author))
  return rows.map((row, index) => ({ ...row, author: authors[index] })).reverse()
}

export async function addComment(postId, userId, body) {
  const text = body.trim()
  if (!text || Array.from(text).length > 500) throw new Error('Write up to 500 characters.')

  return q(signal =>
    supabase.from('post_comments')
      .insert({ post_id: postId, author_id: userId, body: text })
      .select('*').single().abortSignal(signal),
  )
}

export async function getProfileStats(id, viewerId) {
  const [followers, following, posts, relation] = await Promise.all([
    q(signal => supabase.from('follows').select('*', { count: 'exact', head: true })
      .eq('following_id', id).abortSignal(signal), true),
    q(signal => supabase.from('follows').select('*', { count: 'exact', head: true })
      .eq('follower_id', id).abortSignal(signal), true),
    q(signal => supabase.from('posts').select('*', { count: 'exact', head: true })
      .eq('author_id', id).abortSignal(signal), true),
    q(signal => supabase.from('follows').select('follower_id')
      .eq('follower_id', viewerId).eq('following_id', id)
      .maybeSingle().abortSignal(signal)),
  ])

  return { followers, following, posts, isFollowing: Boolean(relation) }
}

export async function setFollow(userId, target, following) {
  await q(signal => {
    const request = following
      ? supabase.from('follows').upsert(
          { follower_id: userId, following_id: target },
          { onConflict: 'follower_id,following_id', ignoreDuplicates: true },
        )
      : supabase.from('follows').delete()
          .eq('follower_id', userId).eq('following_id', target)

    return request.abortSignal(signal)
  })

  return getProfileStats(target, userId)
}