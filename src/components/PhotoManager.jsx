import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Star, Trash2, X } from 'lucide-react'
import {
  getProfile, removePhoto, setPrimaryPhoto, uploadPhoto, validatePhoto,
} from '../lib/api'

export default function PhotoManager({
  userId, profile, onChange, onBusyChange, disabled = false,
}) {
  const [pending, setPending] = useState(null)
  const [decoded, setDecoded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const dialog = useRef(null)

  const primary = profile.primary_photo_slot ?? 0
  const photos = profile.photos || []
  const locked = disabled || busy

  useEffect(() => {
    onBusyChange?.(busy || Boolean(pending))
  }, [busy, pending, onBusyChange])

  useEffect(() => {
    if (pending && !dialog.current.open) dialog.current.showModal()
    if (!pending && dialog.current.open) dialog.current.close()
    return () => { if (pending) URL.revokeObjectURL(pending.url) }
  }, [pending])

  function choose(slot, file) {
    if (locked || !file) return
    setError('')
    setNotice('')

    try {
      validatePhoto(file)
      setDecoded(false)
      setPending({ slot, file, url: URL.createObjectURL(file) })
    } catch (failure) {
      setError(failure.message)
    }
  }

  function cancel() {
    if (busy) return
    setPending(null)
    setError('')
  }

  async function act(task, success) {
    if (busy) return false
    setBusy(true)
    setError('')
    setNotice('')

    try {
      await task()
      onChange(await getProfile(userId))
      setNotice(success)
      return true
    } catch (failure) {
      setError(failure.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!pending || !decoded || busy) return
    const chosen = pending
    if (await act(() => uploadPhoto(userId, chosen.slot, chosen.file), 'Photo saved.')) {
      setPending(null)
    }
  }

  function tile(slot, main) {
    const photo = photos.find(item => item.slot === slot)

    return (
      <div
        className={`photo-drop ${main ? 'primary' : ''}`}
        data-drag={drag === slot}
        onDragOver={event => { event.preventDefault(); if (!locked) setDrag(slot) }}
        onDragLeave={() => setDrag(null)}
        onDrop={event => {
          event.preventDefault()
          setDrag(null)
          choose(slot, event.dataTransfer.files[0])
        }}
      >
        <div className="relative flex aspect-square items-center justify-center bg-slate-50">
          {photo?.url ? <img src={photo.url} alt={main ? 'Profile photo' : 'Additional photo'} className="h-full w-full object-cover" /> : (
            <div className="text-center text-slate-400">
              <ImagePlus className="mx-auto mb-2" size={main ? 36 : 26} />
              <p className="text-xs">{main ? 'Your profile photo' : 'Add a photo'}</p>
            </div>
          )}
          {main && <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[10px] font-bold text-brand-700">PROFILE PHOTO</span>}
        </div>

        <div className="space-y-2 bg-white p-3">
          <label className={`flex items-center justify-center rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 ${locked ? 'opacity-40' : 'cursor-pointer'}`}>
            {photo ? 'Replace photo' : 'Choose photo'}
            <input
              className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={locked}
              onChange={event => {
                const file = event.target.files?.[0]
                event.target.value = ''
                choose(slot, file)
              }}
            />
          </label>

          {photo && !main && <button type="button" className="flex w-full items-center justify-center gap-1 text-xs text-slate-500" disabled={locked} onClick={() => act(() => setPrimaryPhoto(slot), 'Profile photo updated.')}><Star size={12} /> Make profile photo</button>}
          {photo && <button type="button" className="flex w-full items-center justify-center gap-1 text-xs text-red-600" disabled={locked} onClick={() => act(() => removePhoto(userId, slot), 'Photo removed.')}><Trash2 size={12} /> Remove</button>}
        </div>
      </div>
    )
  }

  return (
    <section>
      <h2 className="text-lg font-bold">Your photos</h2>
      <p className="mb-5 mt-1 text-xs text-slate-400">One profile photo. Three extra moments from your world.</p>

      {profile.photoWarning && (
        <div className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          {profile.photoWarning}
          <button type="button" className="ml-2 underline" disabled={locked} onClick={() => act(async () => {}, 'Photos refreshed.')}>Reload</button>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
        <div>{tile(primary, true)}</div>
        <div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {[0, 1, 2, 3].filter(slot => slot !== primary).map(slot => <div key={slot}>{tile(slot, false)}</div>)}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-400">Drop a photo into a space or choose a file. JPEG, PNG or WebP, up to 5 MB.</p>
        </div>
      </div>

      {busy && <p className="mt-4 text-xs text-brand-700" role="status">Updating photos...</p>}
      {error && !pending && <p className="error mt-4" role="alert">{error}</p>}
      {notice && <p className="mt-4 text-xs text-brand-700" role="status">{notice}</p>}

      <dialog ref={dialog} className="dialog" aria-labelledby="photo-title" onCancel={event => { event.preventDefault(); cancel() }}>
        {pending && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 id="photo-title" className="text-lg font-bold">Looks good?</h3>
              <button type="button" aria-label="Close preview" disabled={busy} onClick={cancel}><X size={20} /></button>
            </div>
            <img
              className="aspect-square w-full rounded-2xl object-cover" src={pending.url} alt="Photo preview"
              onLoad={() => setDecoded(true)}
              onError={() => { setDecoded(false); setError('This image could not be opened.') }}
            />
            <p className="mt-3 text-xs text-slate-400">This is the square preview. Your file uploads when you save.</p>
            {error && <p className="error mt-4" role="alert">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className="btn-secondary" disabled={busy} onClick={cancel}>Cancel</button>
              <button type="button" className="btn" disabled={busy || !decoded} onClick={save}>{busy ? 'Saving...' : 'Save photo'}</button>
            </div>
          </>
        )}
      </dialog>
    </section>
  )
}