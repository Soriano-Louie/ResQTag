import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { contactService } from '../../services/contactService';
import { useToast } from '../../context/ToastContext';
import ContactModal from '../../components/dashboard/ContactModal';
import { 
  HeartHandshake, 
  Plus, 
  Phone, 
  Mail, 
  Edit2, 
  Trash2, 
  ArrowLeft, 
  Loader2, 
  Globe, 
  Lock,
  PhoneCall
} from 'lucide-react';

export default function ContactsPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const res = await contactService.getContacts();
      setContacts(res.contacts || []);
    } catch (err) {
      toast.error('Failed to load emergency contacts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleOpenAdd = () => {
    setSelectedContact(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contact) => {
    setSelectedContact(contact);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await contactService.deleteContact(deleteTarget.contact_id);
      toast.success('Emergency contact removed.');
      setDeleteTarget(null);
      loadContacts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleVisibility = async (contact) => {
    try {
      const newPublic = !(contact.is_public === 1 || contact.is_public === true);
      await contactService.updateContact(contact.contact_id, {
        name: contact.name,
        relationship: contact.relationship,
        contactNumber: contact.contact_number,
        email: contact.email,
        isPublic: newPublic
      });
      toast.success(`Contact visibility set to ${newPublic ? 'Public' : 'Private'}`);
      loadContacts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Emergency Contacts</h1>
            <p className="text-xs text-slate-500">Designate family, doctors, or friends for emergency responders to call</p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all"
        >
          <Plus className="w-4 h-4" /> Add New Contact
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
            <HeartHandshake className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">No Emergency Contacts Added</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add at least one guardian, parent, or emergency contact so responders can reach someone immediately.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md"
          >
            <Plus className="w-4 h-4" /> Add First Emergency Contact
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((contact) => {
            const isPublic = contact.is_public === 1 || contact.is_public === true;
            return (
              <div
                key={contact.contact_id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{contact.name}</h3>
                      <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-md bg-brand-100 text-brand-800 text-xs font-bold">
                        {contact.relationship}
                      </span>
                    </div>

                    {/* Public / Private Pill Button */}
                    <button
                      onClick={() => handleToggleVisibility(contact)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase transition-colors ${
                        isPublic
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                      title="Click to toggle public visibility on emergency QR page"
                    >
                      {isPublic ? <Globe className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-slate-500" />}
                      {isPublic ? 'Public' : 'Private'}
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800">{contact.contact_number}</span>
                    </div>
                    {contact.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{contact.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <a
                    href={`tel:${contact.contact_number}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5" /> Test Dial
                  </a>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(contact)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit Contact"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(contact)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <ContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contact={selectedContact}
        onSaved={loadContacts}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-lg">Remove Emergency Contact?</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to remove <strong>{deleteTarget.name}</strong> from your emergency contacts list?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
