/**
 * CRITICAL PRIVACY ENGINE:
 * Server-side Whitelist Filtering for ResQTag Public Emergency Endpoint.
 * 
 * NEVER returns private fields in the response.
 * Only keys explicitly set to truthy (is_public === 1 or true) in privacyMap will be exposed.
 */

export const DEFAULT_PRIVACY_FIELDS = {
  full_name: 1,              // Usually default public for identification
  profile_picture: 0,
  contact_number: 0,
  email: 0,
  address: 0,
  date_of_birth: 0,
  blood_type: 1,             // Essential for first responders
  allergies: 1,              // Essential for first responders
  medical_conditions: 0,
  medications: 0,
  important_medical_info: 1, // Critical rescue info
  emergency_notes: 0,
  emergency_contacts: 1      // Contacts with is_public=1
};

export function filterPublicEmergencyProfile(user, profile, contacts, privacyMap) {
  const publicData = {
    tagStatus: 'active'
  };

  // 1. Full Name
  if (privacyMap.full_name) {
    const parts = [user.first_name, user.middle_name, user.last_name].filter(Boolean);
    publicData.full_name = parts.join(' ');
  }

  // 2. Profile Picture
  if (privacyMap.profile_picture && profile?.profile_picture_url) {
    publicData.profile_picture_url = profile.profile_picture_url;
  }

  // 3. User email (if explicitly marked public)
  if (privacyMap.email && user.email) {
    publicData.email = user.email;
  }

  // 4. Contact & Medical Profile Fields
  if (profile) {
    const singleFields = [
      'contact_number',
      'address',
      'date_of_birth',
      'blood_type',
      'allergies',
      'medical_conditions',
      'medications',
      'important_medical_info',
      'emergency_notes'
    ];

    for (const field of singleFields) {
      if (privacyMap[field] && profile[field]) {
        publicData[field] = profile[field];
      }
    }
  }

  // 5. Emergency Contacts (Filtered: master privacy setting AND individual contact is_public flag)
  if (privacyMap.emergency_contacts !== 0 && contacts && contacts.length > 0) {
    publicData.emergency_contacts = contacts
      .filter(contact => contact.is_public === 1 || contact.is_public === true)
      .map(contact => ({
        contact_id: contact.contact_id,
        name: contact.name,
        relationship: contact.relationship,
        contact_number: contact.contact_number,
        email: contact.email || null
      }));
  } else {
    publicData.emergency_contacts = [];
  }

  return publicData;
}
