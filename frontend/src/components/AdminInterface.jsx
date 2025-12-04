import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { 
  UserPlus, 
  Users, 
  Edit, 
  Trash2, 
  Shield, 
  UserCheck,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  Key,
  Activity,
  BarChart3,
  Lock,
  Unlock
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function AdminInterface({ users, onAddUser, onUpdateUser, onDeleteUser, onToggleUserStatus }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  
  // Form state for creating/editing users
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: '',
    department: '',
    email: '',
    phone: ''
  });

  const roles = [
    { value: 'nurse', label: 'Nurse', color: 'bg-teal-500', icon: UserCheck },
    { value: 'doctor', label: 'Doctor', color: 'bg-purple-500', icon: UserCheck },
    { value: 'ed_manager', label: 'ED Manager', color: 'bg-orange-500', icon: Shield },
    { value: 'admin', label: 'Admin', color: 'bg-red-500', icon: Shield }
  ];

  // Calculate statistics
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    byRole: roles.reduce((acc, role) => {
      acc[role.value] = users.filter(u => u.role === role.value).length;
      return acc;
    }, {})
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Add activity log entry
  const addActivityLog = (action, userInfo) => {
    const logEntry = {
      id: Date.now(),
      timestamp: new Date(),
      action,
      userInfo,
      performedBy: 'Current Admin' // In real app, this would be the logged-in admin
    };
    setActivityLog(prev => [logEntry, ...prev].slice(0, 50)); // Keep last 50 entries
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
      name: '',
      role: '',
      department: '',
      email: '',
      phone: ''
    });
  };

  // Handle create user
  const handleCreateUser = () => {
    if (!formData.username || !formData.password || !formData.name || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    const newUser = {
      id: Date.now().toString(),
      username: formData.username.toLowerCase(),
      name: formData.name,
      role: formData.role,
      department: formData.department,
      email: formData.email,
      phone: formData.phone,
      status: 'active',
      createdAt: new Date(),
      lastLogin: null,
      password: formData.password // In real app, this would be hashed
    };

    onAddUser(newUser);
    addActivityLog('CREATE', { username: newUser.username, role: newUser.role });
    toast.success(`User ${newUser.username} created successfully`);
    resetForm();
    setIsCreateDialogOpen(false);
  };

  // Handle edit user
  const handleEditUser = () => {
    if (!formData.name || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updatedUser = {
      ...selectedUser,
      name: formData.name,
      role: formData.role,
      department: formData.department,
      email: formData.email,
      phone: formData.phone
    };

    onUpdateUser(updatedUser);
    addActivityLog('UPDATE', { username: updatedUser.username, role: updatedUser.role });
    toast.success(`User ${updatedUser.username} updated successfully`);
    resetForm();
    setIsEditDialogOpen(false);
    setSelectedUser(null);
  };

  // Handle delete user
  const handleDeleteUser = (user) => {
    if (window.confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
      onDeleteUser(user.id);
      addActivityLog('DELETE', { username: user.username, role: user.role });
      toast.success(`User ${user.username} deleted successfully`);
    }
  };

  // Handle toggle status
  const handleToggleStatus = (user) => {
    onToggleUserStatus(user.id);
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    addActivityLog(newStatus === 'active' ? 'ACTIVATE' : 'DEACTIVATE', { username: user.username });
    toast.success(`User ${user.username} ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
  };

  // Handle reset password
  const handleResetPassword = () => {
    if (!formData.password || !formData.confirmPassword) {
      toast.error('Please enter and confirm the new password');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    // In real app, this would hash the password and update via API
    const updatedUser = {
      ...selectedUser,
      password: formData.password
    };

    onUpdateUser(updatedUser);
    addActivityLog('RESET_PASSWORD', { username: selectedUser.username });
    toast.success(`Password reset for ${selectedUser.username}`);
    resetForm();
    setIsResetPasswordDialogOpen(false);
    setSelectedUser(null);
  };

  // Open edit dialog
  const openEditDialog = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '',
      confirmPassword: '',
      name: user.name,
      role: user.role,
      department: user.department || '',
      email: user.email || '',
      phone: user.phone || ''
    });
    setIsEditDialogOpen(true);
  };

  // Open reset password dialog
  const openResetPasswordDialog = (user) => {
    setSelectedUser(user);
    setFormData({
      ...formData,
      password: '',
      confirmPassword: ''
    });
    setIsResetPasswordDialogOpen(true);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card>
          <CardHeader style={{ paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <CardTitle style={{ fontSize: '14px', color: '#6b7280' }}>Total Users</CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader style={{ paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <CardTitle style={{ fontSize: '14px', color: '#6b7280' }}>Active Users</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader style={{ paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <CardTitle style={{ fontSize: '14px', color: '#6b7280' }}>Inactive Users</CardTitle>
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>{stats.inactive}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader style={{ paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <CardTitle style={{ fontSize: '14px', color: '#6b7280' }}>Roles</CardTitle>
              <Shield className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {roles.map(role => (
                <Badge key={role.value} variant="secondary" style={{ fontSize: '12px' }}>
                  {role.label}: {stats.byRole[role.value] || 0}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity Log
          </TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Create, edit, and manage user accounts</CardDescription>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2" onClick={resetForm}>
                      <UserPlus className="h-4 w-4" />
                      Create New User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Add a new staff member to the system
                      </DialogDescription>
                    </DialogHeader>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <Label htmlFor="create-username">Username *</Label>
                        <Input
                          id="create-username"
                          placeholder="username"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="create-name">Full Name *</Label>
                        <Input
                          id="create-name"
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="create-role">Role *</Label>
                        <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                          <SelectTrigger id="create-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map(role => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="create-department">Department</Label>
                        <Input
                          id="create-department"
                          placeholder="Emergency Department"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="create-email">Email</Label>
                        <Input
                          id="create-email"
                          type="email"
                          placeholder="user@hospital.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="create-phone">Phone</Label>
                        <Input
                          id="create-phone"
                          placeholder="+1 234 567 8900"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="create-password">Password *</Label>
                        <Input
                          id="create-password"
                          type="password"
                          placeholder="Min 6 characters"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="create-confirm-password">Confirm Password *</Label>
                        <Input
                          id="create-confirm-password"
                          type="password"
                          placeholder="Re-enter password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateUser}>
                        Create User
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search className="h-4 w-4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ paddingLeft: '40px' }}
                    />
                  </div>
                </div>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger style={{ width: '150px' }}>
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger style={{ width: '150px' }}>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Users Table */}
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <ScrollArea style={{ height: '500px' }}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead style={{ textAlign: 'right' }}>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                            <Users className="h-12 w-12" style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                            <div>No users found</div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map(user => {
                          const roleConfig = roles.find(r => r.value === user.role);
                          return (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div>
                                  <div style={{ fontWeight: '500' }}>{user.name}</div>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>@{user.username}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={roleConfig?.color} variant="secondary">
                                  {roleConfig?.label || user.role}
                                </Badge>
                              </TableCell>
                              <TableCell style={{ color: '#6b7280' }}>
                                {user.department || '-'}
                              </TableCell>
                              <TableCell>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                  {user.email && <div>{user.email}</div>}
                                  {user.phone && <div>{user.phone}</div>}
                                  {!user.email && !user.phone && '-'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                                  {user.status === 'active' ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <CheckCircle className="h-3 w-3" />
                                      Active
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <XCircle className="h-3 w-3" />
                                      Inactive
                                    </div>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell style={{ fontSize: '12px', color: '#6b7280' }}>
                                {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                              </TableCell>
                              <TableCell>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditDialog(user)}
                                    title="Edit user"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openResetPasswordDialog(user)}
                                    title="Reset password"
                                  >
                                    <Key className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleToggleStatus(user)}
                                    title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                                  >
                                    {user.status === 'active' ? (
                                      <Lock className="h-4 w-4" />
                                    ) : (
                                      <Unlock className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteUser(user)}
                                    title="Delete user"
                                    style={{ color: '#ef4444' }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <CardTitle>Activity Log</CardTitle>
                  <CardDescription>Recent administrative actions</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActivityLog([])}>
                  <RefreshCw className="h-4 w-4" style={{ marginRight: '8px' }} />
                  Clear Log
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea style={{ height: '500px' }}>
                {activityLog.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                    <Activity className="h-12 w-12" style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <div>No activity recorded yet</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activityLog.map(log => (
                      <Alert key={log.id}>
                        <Activity className="h-4 w-4" />
                        <AlertDescription>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div>
                              <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                                {log.action === 'CREATE' && `Created user: ${log.userInfo.username}`}
                                {log.action === 'UPDATE' && `Updated user: ${log.userInfo.username}`}
                                {log.action === 'DELETE' && `Deleted user: ${log.userInfo.username}`}
                                {log.action === 'ACTIVATE' && `Activated user: ${log.userInfo.username}`}
                                {log.action === 'DEACTIVATE' && `Deactivated user: ${log.userInfo.username}`}
                                {log.action === 'RESET_PASSWORD' && `Reset password for: ${log.userInfo.username}`}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                Role: {log.userInfo.role} • Performed by: {log.performedBy}
                              </div>
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                              {log.timestamp.toLocaleString()}
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information for {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={formData.username}
                disabled
                style={{ backgroundColor: '#f3f4f6' }}
              />
            </div>
            <div>
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-role">Role *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-department">Department</Label>
              <Input
                id="edit-department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The user will need to use this new password to log in. Make sure to communicate it securely.
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor="reset-password">New Password *</Label>
              <Input
                id="reset-password"
                type="password"
                placeholder="Min 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="reset-confirm-password">Confirm New Password *</Label>
              <Input
                id="reset-confirm-password"
                type="password"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword}>
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
