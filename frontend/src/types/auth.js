// Demo users for authentication
export const DEMO_USERS = {
  'patient001': {
    password: 'patient123',
    user: {
      id: '1',
      username: 'patient001',
      role: 'patient',
      name: 'John Doe'
    }
  },
  'dr.smith': {
    password: 'doctor123',
    user: {
      id: '2',
      username: 'dr.smith',
      role: 'doctor',
      name: 'Dr. Sarah Smith',
      department: 'Emergency Medicine'
    }
  },
  'dr.johnson': {
    password: 'doctor123',
    user: {
      id: '5',
      username: 'dr.johnson',
      role: 'doctor',
      name: 'Dr. Robert Johnson',
      department: 'Emergency Medicine'
    }
  },
  'nurse.jones': {
    password: 'nurse123',
    user: {
      id: '3',
      username: 'nurse.jones',
      role: 'nurse',
      name: 'Nurse Michael Jones',
      department: 'Emergency Department'
    }
  },
  'manager.wilson': {
    password: 'manager123',
    user: {
      id: '4',
      username: 'manager.wilson',
      role: 'ed_manager',
      name: 'Lisa Wilson',
      department: 'ED Management'
    }
  },
  'admin.admin': {
    password: 'admin123',
    user: {
      id: '6',
      username: 'admin.admin',
      role: 'admin',
      name: 'Admin User'
    }
  }
}

