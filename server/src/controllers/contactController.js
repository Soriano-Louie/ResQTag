import pool from '../config/db.js';

export async function getContacts(req, res) {
  try {
    const userId = req.user.user_id;

    const [rows] = await pool.query(
      `SELECT contact_id, name, relationship, contact_number, email, is_public, priority_order, created_at 
       FROM emergency_contacts 
       WHERE user_id = ? 
       ORDER BY priority_order ASC, created_at ASC`,
      [userId]
    );

    return res.json({ contacts: rows });
  } catch (error) {
    console.error('getContacts error:', error);
    return res.status(500).json({ message: 'Failed to retrieve contacts.', error: error.message });
  }
}

export async function createContact(req, res) {
  try {
    const userId = req.user.user_id;
    const { name, relationship, contactNumber, email, isPublic } = req.body;

    if (!name || !relationship || !contactNumber) {
      return res.status(400).json({ message: 'Contact name, relationship, and phone number are required.' });
    }

    const [result] = await pool.query(
      `INSERT INTO emergency_contacts (user_id, name, relationship, contact_number, email, is_public) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name.trim(),
        relationship.trim(),
        contactNumber.trim(),
        email ? email.trim() : null,
        isPublic === false ? 0 : 1
      ]
    );

    return res.status(201).json({
      message: 'Emergency contact added successfully.',
      contactId: result.insertId
    });
  } catch (error) {
    console.error('createContact error:', error);
    return res.status(500).json({ message: 'Failed to add emergency contact.', error: error.message });
  }
}

export async function updateContact(req, res) {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;
    const { name, relationship, contactNumber, email, isPublic } = req.body;

    if (!name || !relationship || !contactNumber) {
      return res.status(400).json({ message: 'Contact name, relationship, and phone number are required.' });
    }

    const [result] = await pool.query(
      `UPDATE emergency_contacts 
       SET name = ?, relationship = ?, contact_number = ?, email = ?, is_public = ? 
       WHERE contact_id = ? AND user_id = ?`,
      [
        name.trim(),
        relationship.trim(),
        contactNumber.trim(),
        email ? email.trim() : null,
        isPublic === false ? 0 : 1,
        id,
        userId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Contact not found or unauthorized.' });
    }

    return res.json({ message: 'Emergency contact updated successfully.' });
  } catch (error) {
    console.error('updateContact error:', error);
    return res.status(500).json({ message: 'Failed to update emergency contact.', error: error.message });
  }
}

export async function deleteContact(req, res) {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM emergency_contacts WHERE contact_id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Contact not found or unauthorized.' });
    }

    return res.json({ message: 'Emergency contact removed successfully.' });
  } catch (error) {
    console.error('deleteContact error:', error);
    return res.status(500).json({ message: 'Failed to delete emergency contact.', error: error.message });
  }
}
