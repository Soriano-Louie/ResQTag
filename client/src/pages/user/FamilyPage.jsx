import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../services/api';

const fields = ['contact_number', 'address', 'date_of_birth', 'blood_type', 'allergies', 'medical_conditions', 'medications', 'important_medical_info', 'emergency_notes'];
const label = key => key.replaceAll('_', ' ');
const empty = () => ({ first_name: '', last_name: '', relationship: '', profile: {}, contacts: [], privacy: { full_name: true, blood_type: true, allergies: true, important_medical_info: true, emergency_contacts: true } });
export default function FamilyPage() {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const load = async () => setMembers((await api.get('/family')).data.members);
  useEffect(() => { load().catch(err => setMessage(err.message)); }, []);
  async function save(e) {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      await api[form.member_id ? 'put' : 'post'](form.member_id ? `/family/${form.member_id}` : '/family', form);
      await load(); setForm(empty()); setMessage('Family member saved.');
    } catch (err) { setMessage(err.message); } finally { setBusy(false); }
  }
  async function archive(m) {
    if (!window.confirm(`Archive ${m.first_name}? Their QR code will become inactive. Existing order history will remain.`)) return;
    setBusy(true);
    try { await api.delete(`/family/${m.member_id}`); await load(); if (form.member_id === m.member_id) setForm(empty()); }
    catch (err) { setMessage(err.message); } finally { setBusy(false); }
  }
  const input = 'w-full border border-slate-300 rounded-xl p-3 bg-white';
  return <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
    <Link to="/dashboard" className="text-brand-700">Back to dashboard</Link>
    <h1 className="text-3xl font-black">Family members</h1>
    <p>Manage each person's emergency information, then choose who to include when ordering physical tags.</p>
    {message && <p role="status" className="p-3 bg-amber-50 rounded-xl">{message}</p>}
    <div className="grid md:grid-cols-2 gap-4">{members.map(m => <article key={m.member_id} className="bg-white rounded-2xl border p-5 space-y-3">
      <h2 className="font-bold">{m.first_name} {m.last_name} {m.relationship && `(${m.relationship})`}</h2>
      <QRCodeSVG value={`${window.location.origin}/emergency/${m.qr_token}`} size={96} />
      <div className="flex gap-4"><button disabled={busy} onClick={() => setForm(m)} className="text-brand-700">Edit details</button><a className="text-brand-700" href={`/emergency/${m.qr_token}`} target="_blank" rel="noreferrer">Preview emergency page</a><button disabled={busy} onClick={() => archive(m)} className="text-rose-700">Archive</button></div>
    </article>)}</div>
    <form onSubmit={save} className="bg-white border rounded-2xl p-6 space-y-5">
      <h2 className="text-xl font-bold">{form.member_id ? 'Edit family member' : 'Add family member'}</h2>
      <div className="grid sm:grid-cols-2 gap-4">{['first_name', 'last_name', 'relationship'].map(key => <label key={key} className="capitalize">{label(key)}<input className={input} required={key !== 'relationship'} maxLength={50} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}</div>
      <div className="grid sm:grid-cols-2 gap-4">{fields.map(key => <label key={key} className="capitalize">{label(key)}<input className={input} type={key === 'date_of_birth' ? 'date' : 'text'} maxLength={2000} value={form.profile[key] || ''} onChange={e => setForm({ ...form, profile: { ...form.profile, [key]: e.target.value } })} /></label>)}</div>
      <fieldset className="space-y-3"><legend className="font-bold">Emergency contacts</legend>{form.contacts.map((c, i) => <div key={i} className="border rounded-xl p-3 space-y-2">{['name','relationship','contact_number'].map(key => <label className="block capitalize" key={key}>{label(key)}<input required={key !== 'relationship'} maxLength={key === 'name' ? 100 : key === 'relationship' ? 50 : 30} className={input} value={c[key]} onChange={e => setForm({ ...form, contacts: form.contacts.map((v,j) => j === i ? { ...v, [key]: e.target.value } : v) })} /></label>)}<label className="block"><input type="checkbox" checked={c.is_public} onChange={e => setForm({ ...form, contacts: form.contacts.map((v,j) => j === i ? { ...v, is_public: e.target.checked } : v) })} /> Show this contact on scans</label><button type="button" className="text-rose-700" onClick={() => setForm({ ...form, contacts: form.contacts.filter((_,j) => j !== i) })}>Remove contact</button></div>)}<button type="button" disabled={form.contacts.length >= 10} className="text-brand-700" onClick={() => setForm({ ...form, contacts: [...form.contacts, { name: '', relationship: '', contact_number: '', is_public: false }] })}>Add emergency contact</button></fieldset>
      <fieldset><legend className="font-bold mb-2">Information visible when the tag is scanned</legend><div className="grid sm:grid-cols-2 gap-2">{['full_name', ...fields, 'emergency_contacts'].map(key => <label key={key} className="capitalize"><input type="checkbox" checked={form.privacy[key] === true} onChange={e => setForm({ ...form, privacy: { ...form.privacy, [key]: e.target.checked } })} /> {label(key)}</label>)}</div></fieldset>
      <div className="flex gap-4"><button disabled={busy} className="bg-brand-600 text-white rounded-xl px-5 py-3">{busy ? 'Saving...' : 'Save member'}</button>{form.member_id && <button type="button" onClick={() => setForm(empty())}>Cancel editing</button>}</div>
    </form>
  </div>;
}
