import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../services/api';
import { Users, UserPlus, HeartHandshake } from 'lucide-react';
import { RELATIONSHIPS } from '../../utils/relationships';
import { BLOOD_TYPES } from '../../utils/bloodTypes';

function RelationshipSelect({ value, onChange, className }) {
  return <select value={value || ''} onChange={onChange} className={className}>
    <option value="">Select relationship</option>
    {value && !RELATIONSHIPS.includes(value) && <option value={value}>{value}</option>}
    {RELATIONSHIPS.map(relationship => <option key={relationship} value={relationship}>{relationship}</option>)}
  </select>;
}

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
      if (!form.member_id) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch (err) { setMessage(err.message); } finally { setBusy(false); }
  }
  async function archive(m) {
    if (!window.confirm(`Archive ${m.first_name}? Their QR code will become inactive. Existing order history will remain.`)) return;
    setBusy(true);
    try { await api.delete(`/family/${m.member_id}`); await load(); if (form.member_id === m.member_id) setForm(empty()); }
    catch (err) { setMessage(err.message); } finally { setBusy(false); }
  }
  const input = 'w-full px-3 py-2 mt-1 bg-slate-50 border border-slate-200 rounded-xl text-sm font-normal normal-case text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all';
  return <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
    <Link to="/dashboard" className="text-brand-700">Back to dashboard</Link>
    <div className="flex items-center gap-3"><div className="p-3 rounded-2xl bg-brand-50 text-brand-600"><Users className="w-6 h-6" /></div><h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Family Members</h1></div>
    <p className="text-sm text-slate-500">Manage each person's emergency information, then choose who to include when ordering physical tags.</p>
    {message && <p role="status" className="p-3 bg-amber-50 rounded-xl">{message}</p>}
    <div className="grid md:grid-cols-2 gap-4">{members.map(m => <article key={m.member_id} className="bg-white rounded-2xl border p-5 space-y-3">
      <h2 className="font-bold">{m.first_name} {m.last_name} {m.relationship && `(${m.relationship})`}</h2>
      <QRCodeSVG value={`${window.location.origin}/emergency/${m.qr_token}`} size={96} />
      <div className="flex flex-wrap gap-3 text-sm font-semibold"><button disabled={busy} onClick={() => setForm(m)} className="text-brand-700">Edit details</button><a className="text-brand-700" href={`/emergency/${m.qr_token}`} target="_blank" rel="noreferrer">Preview emergency page</a><button disabled={busy} onClick={() => archive(m)} className="text-rose-700">Archive</button></div>
    </article>)}</div>
    <form onSubmit={save} className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4"><div className="p-2 rounded-xl bg-brand-50 text-brand-600"><UserPlus className="w-5 h-5" /></div><h2 className="font-bold text-slate-900">{form.member_id ? 'Edit Family Member' : 'Add Family Member'}</h2></div>
      <div className="grid sm:grid-cols-2 gap-4">{['first_name', 'last_name'].map(key => <label key={key} className="block text-xs font-semibold text-slate-700 capitalize">{label(key)} <span className="text-rose-500">*</span><input className={input} required maxLength={50} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}<label className="block text-xs font-semibold text-slate-700">Relationship<RelationshipSelect className={input} value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })} /></label></div>
      <div className="grid sm:grid-cols-2 gap-4">{fields.map(key => <label key={key} className="block text-xs font-semibold text-slate-700 capitalize">{label(key)}{key === 'blood_type' ? (
        <select className={input} value={form.profile[key] || ''} onChange={e => setForm({ ...form, profile: { ...form.profile, [key]: e.target.value } })}>
          <option value="">Select Blood Type...</option>
          {form.profile[key] && !BLOOD_TYPES.includes(form.profile[key]) && <option value={form.profile[key]}>{form.profile[key]}</option>}
          {BLOOD_TYPES.map(bloodType => <option key={bloodType} value={bloodType}>{bloodType}</option>)}
        </select>
      ) : <input className={input} type={key === 'date_of_birth' ? 'date' : 'text'} maxLength={2000} value={form.profile[key] || ''} onChange={e => setForm({ ...form, profile: { ...form.profile, [key]: e.target.value } })} />}</label>)}</div>
      <fieldset className="space-y-3"><legend className="font-bold text-slate-900 flex items-center gap-2"><HeartHandshake className="w-4 h-4 text-brand-600" />Emergency Contacts</legend>{form.contacts.map((c, i) => <div key={i} className="border rounded-xl p-3 space-y-2">{['name','relationship','contact_number'].map(key => <label className="block text-xs font-semibold text-slate-700 capitalize" key={key}>{label(key)}{key === 'relationship' ? <RelationshipSelect className={input} value={c[key]} onChange={e => setForm({ ...form, contacts: form.contacts.map((v,j) => j === i ? { ...v, [key]: e.target.value } : v) })} /> : <input required={key !== 'relationship'} maxLength={key === 'name' ? 100 : key === 'relationship' ? 50 : 30} className={input} value={c[key]} onChange={e => setForm({ ...form, contacts: form.contacts.map((v,j) => j === i ? { ...v, [key]: e.target.value } : v) })} />}</label>)}<label className="block"><input type="checkbox" checked={c.is_public} onChange={e => setForm({ ...form, contacts: form.contacts.map((v,j) => j === i ? { ...v, is_public: e.target.checked } : v) })} /> Show this contact on scans</label><button type="button" className="text-rose-700" onClick={() => setForm({ ...form, contacts: form.contacts.filter((_,j) => j !== i) })}>Remove contact</button></div>)}<button type="button" disabled={form.contacts.length >= 10} className="text-brand-700" onClick={() => setForm({ ...form, contacts: [...form.contacts, { name: '', relationship: '', contact_number: '', is_public: false }] })}>Add emergency contact</button></fieldset>
      <fieldset><legend className="font-bold mb-2">Information visible when the tag is scanned</legend><div className="grid sm:grid-cols-2 gap-2">{['full_name', ...fields, 'emergency_contacts'].map(key => <label key={key} className="capitalize text-sm text-slate-600 flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 p-3"><input className="accent-brand-600" type="checkbox" checked={form.privacy[key] === true} onChange={e => setForm({ ...form, privacy: { ...form.privacy, [key]: e.target.checked } })} /> {label(key)}</label>)}</div></fieldset>
      <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-100"><button disabled={busy} className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md transition-all disabled:opacity-50">{busy ? 'Saving...' : 'Save member'}</button>{form.member_id && <button type="button" className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors" onClick={() => setForm(empty())}>Cancel editing</button>}</div>
    </form>
  </div>;
}
