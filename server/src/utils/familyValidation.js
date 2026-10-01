import { z } from 'zod';

export const familySchema = z.object({
  first_name: z.string().trim().min(1).max(50),
  last_name: z.string().trim().min(1).max(50),
  relationship: z.string().trim().max(50).default(''),
  profile: z.object(Object.fromEntries(['contact_number', 'address', 'date_of_birth', 'blood_type', 'allergies', 'medical_conditions', 'medications', 'important_medical_info', 'emergency_notes'].map(key => [key, z.string().trim().max(2000).optional()]))).default({}),
  contacts: z.array(z.object({
    name: z.string().trim().min(1).max(100),
    relationship: z.string().trim().max(50).default(''),
    contact_number: z.string().trim().min(1).max(30),
    is_public: z.boolean().default(false)
  })).max(10).default([]),
  privacy: z.record(z.boolean()).default({})
});

export function validateBundle(raw, size) {
  let members;
  try { members = typeof raw.memberIds === 'string' ? JSON.parse(raw.memberIds) : raw.memberIds; }
  catch { throw new Error('Invalid family member selection.'); }
  if (!Array.isArray(members) || members.some(id => !Number.isSafeInteger(id) || id < 1) || new Set(members).size !== members.length) {
    throw new Error('Select distinct valid family members.');
  }
  if (![true, false, 'true', 'false'].includes(raw.includeSelf)) throw new Error('Choose whether to include your own tag.');
  const includeSelf = raw.includeSelf === true || raw.includeSelf === 'true';
  const quantity = Number(raw.bundleQuantity);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity * size > 20) throw new Error('Bundle quantity must be a whole number with at most 20 total sets.');
  if (members.length + Number(includeSelf) !== size) throw new Error(`Select exactly ${size} people for this package, including yourself if selected.`);
  return { members, includeSelf, quantity };
}
