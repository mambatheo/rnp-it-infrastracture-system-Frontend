// Role constants — must match backend User model values exactly
export const ROLES = {
  ADMIN:      'ADMIN',
  IT_STAFF:   'IT STAFF',
  TECHNICIAN: 'TECHNICIAN',
  USER:       'USER',
};

// Permission helpers
export const ROLE_LABELS = {
  'ADMIN':      'Admin',
  'IT STAFF':   'IT Staff',
  'TECHNICIAN': 'Technician',
  'USER':       'User',
};

export const ALL_ROLES = Object.values(ROLES);
