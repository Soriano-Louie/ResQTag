import pool from '../config/db.js';

export async function getProfile(req, res) {
  try {
    const userId = req.user.user_id;

    const [userRows] = await pool.query(
      'SELECT user_id, first_name, middle_name, last_name, email FROM users WHERE user_id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const [profileRows] = await pool.query(
      `SELECT contact_number, address, date_of_birth, blood_type, allergies, 
              medical_conditions, medications, important_medical_info, 
              emergency_notes, profile_picture_url 
       FROM emergency_profiles WHERE user_id = ?`,
      [userId]
    );

    const profile = profileRows[0] || {};

    return res.json({
      personal: {
        userId: userRows[0].user_id,
        firstName: userRows[0].first_name,
        middleName: userRows[0].middle_name,
        lastName: userRows[0].last_name,
        email: userRows[0].email,
        contactNumber: profile.contact_number || '',
        address: profile.address || '',
        dateOfBirth: profile.date_of_birth ? profile.date_of_birth.toISOString().split('T')[0] : '',
        profilePictureUrl: profile.profile_picture_url || ''
      },
      medical: {
        bloodType: profile.blood_type || '',
        allergies: profile.allergies || '',
        medicalConditions: profile.medical_conditions || '',
        medications: profile.medications || '',
        importantMedicalInfo: profile.important_medical_info || '',
        emergencyNotes: profile.emergency_notes || ''
      }
    });
  } catch (error) {
    console.error('getProfile error:', error);
    return res.status(500).json({ message: 'Failed to retrieve profile.', error: error.message });
  }
}

export async function updatePersonalInfo(req, res) {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.user_id;
    const { firstName, middleName, lastName, contactNumber, address, dateOfBirth, profilePictureUrl } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ message: 'First name and last name are required.' });
    }

    await connection.beginTransaction();

    // 1. Update user name
    await connection.query(
      'UPDATE users SET first_name = ?, middle_name = ?, last_name = ? WHERE user_id = ?',
      [firstName.trim(), middleName ? middleName.trim() : null, lastName.trim(), userId]
    );

    // 2. Update profile personal fields
    await connection.query(
      `UPDATE emergency_profiles 
       SET contact_number = ?, address = ?, date_of_birth = ?, profile_picture_url = ? 
       WHERE user_id = ?`,
      [
        contactNumber ? contactNumber.trim() : null,
        address ? address.trim() : null,
        dateOfBirth || null,
        profilePictureUrl ? profilePictureUrl.trim() : null,
        userId
      ]
    );

    await connection.commit();

    return res.json({ message: 'Personal information updated successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('updatePersonalInfo error:', error);
    return res.status(500).json({ message: 'Failed to update personal information.', error: error.message });
  } finally {
    connection.release();
  }
}

export async function updateMedicalInfo(req, res) {
  try {
    const userId = req.user.user_id;
    const {
      bloodType,
      allergies,
      medicalConditions,
      medications,
      importantMedicalInfo,
      emergencyNotes
    } = req.body;

    await pool.query(
      `UPDATE emergency_profiles 
       SET blood_type = ?, allergies = ?, medical_conditions = ?, medications = ?, 
           important_medical_info = ?, emergency_notes = ? 
       WHERE user_id = ?`,
      [
        bloodType ? bloodType.trim() : null,
        allergies ? allergies.trim() : null,
        medicalConditions ? medicalConditions.trim() : null,
        medications ? medications.trim() : null,
        importantMedicalInfo ? importantMedicalInfo.trim() : null,
        emergencyNotes ? emergencyNotes.trim() : null,
        userId
      ]
    );

    return res.json({ message: 'Emergency medical information updated successfully.' });
  } catch (error) {
    console.error('updateMedicalInfo error:', error);
    return res.status(500).json({ message: 'Failed to update medical information.', error: error.message });
  }
}
