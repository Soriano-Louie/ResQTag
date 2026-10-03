import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function ProfilePhotoUpload({ endpoint, disabled = false, family = false }) {
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    setBusy(true);
    api.get(endpoint).then(({ data }) => { if (active) setPhoto(data.photo); })
      .catch(err => { if (active) setMessage(err.message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [endpoint]);

  async function upload(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage('Choose a JPEG, PNG, or WebP image up to 5 MB.');
      return;
    }
    setBusy(true); setMessage('');
    try {
      const body = new FormData(); body.append('photo', file);
      const { data } = await api.put(endpoint, body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPhoto(data.photo); setMessage('Photo saved.');
    } catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setMessage('');
    try { await api.delete(endpoint); setPhoto(null); setMessage('Photo removed.'); }
    catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  }
  return <fieldset disabled={disabled || busy} className="rounded-xl border border-slate-200 p-4 space-y-3">
    <legend className="px-1 text-sm font-semibold text-slate-900">Profile photo (optional)</legend>
    {photo && <img src={photo} alt="Current profile photo" className="w-28 h-28 rounded-xl object-cover" />}
    <label className="block text-sm font-medium text-slate-700">{photo ? 'Replace photo' : 'Upload photo'}
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} className="mt-2 block w-full min-w-0 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-700" />
    </label>
    <p className="text-xs text-slate-500">JPEG, PNG, or WebP, up to 5 MB and 20 megapixels. Photos are resized and embedded metadata is removed. Photo changes save immediately.</p>
    <p className="text-xs text-slate-500">Photos are private by default. {family ? 'Use the Profile picture checkbox below and save the member to control visibility on scans.' : 'Use Profile Photo in Privacy Controls to choose whether your photo appears on scans.'}</p>
    {photo && <button type="button" onClick={remove} className="text-sm font-semibold text-rose-700">Remove photo</button>}
    <p role="status" className="text-sm text-slate-600">{busy ? 'Loading photo…' : message}</p>
  </fieldset>;
}
