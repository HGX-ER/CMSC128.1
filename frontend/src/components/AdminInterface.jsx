// frontend/src/components/AdminInterface.jsx
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
import { UserPlus, Users, Edit, Trash2, Shield, UserCheck, AlertCircle, CheckCircle, XCircle, Search, RefreshCw, Key, Activity, BarChart3, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { useAdmin } from '../hooks/useAdmin';

export function AdminInterface() {
  const { 
    users, 
    loading, 
    loadUsers, 
    createUser, 
    updateUser, 
    deleteUser, 
    toggleUserStatus,
    resetPassword 
  } = useAdmin();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
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

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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
    const matchesSearch = (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.username || '').toLowerCase().includes(searchTerm.toLowerCase());
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
      performedBy: 'Current Admin'
    };
    setActivityLog(prev => [logEntry, ...prev].slice(0, 50));
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
  const handleCreateUser = async () => {
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

    const result = await createUser({
      username: formData.username.toLowerCase(),
      password: formData.password,
      name: formData.name,
      role: formData.role,
      department: formData.department,
      email: formData.email,
      phone: formData.phone
    });

    if (result.success) {
      addActivityLog('CREATE', { username: formData.username, role: formData.role });
      toast.success(`User ${formData.username} created successfully`);
      resetForm();
      setIsCreateDialogOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  // Handle edit user
  const handleEditUser = async () => {
    if (!formData.name || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    const result = await updateUser(selectedUser.id, {
      name: formData.name,
      role: formData.role,
      department: formData.department,
      email: formData.email,
      phone: formData.phone,
      status: selectedUser.status
    });

    if (result.success) {
      addActivityLog('UPDATE', { username: selectedUser.username, role: formData.role });
      toast.success(`User ${selectedUser.username} updated successfully`);
      resetForm();
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    } else {
      toast.error(result.error);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (user) => {
    if (window.confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
      const result = await deleteUser(user.id);
      if (result.success) {
        addActivityLog('DELETE', { username: user.username, role: user.role });
        toast.success(`User ${user.username} deleted successfully`);
      } else {
        toast.error(result.error);
      }
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (user) => {
    const result = await toggleUserStatus(user.id);
    if (result.success) {
      addActivityLog(result.newStatus === 'active' ? 'ACTIVATE' : 'DEACTIVATE', { username: user.username });
      toast.success(`User ${user.username} ${result.newStatus === 'active' ? 'activated' : 'deactivated'}`);
    } else {
      toast.error(result.error);
    }
  };

  // Handle reset password
  const handleResetPassword = async () => {
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

    const result = await resetPassword(selectedUser.id, formData.password);
    if (result.success) {
      addActivityLog('RESET_PASSWORD', { username: selectedUser.username });
      toast.success(`Password reset for ${selectedUser.username}`);
      resetForm();
      setIsResetPasswordDialogOpen(false);
      setSelectedUser(null);
    } else {
      toast.error(result.error);
    }
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
    setFormData({ ...formData, password: '', confirmPassword: '' });
    setIsResetPasswordDialogOpen(true);
  };

  const getRoleBadge = (role) => {
    const roleConfig = roles.find(r => r.value === role);
    return roleConfig ? (
      <Badge className={`${roleConfig.color} text-white`}>
        {roleConfig.label}
      </Badge>
    ) : (
      <Badge variant="secondary">{role}</Badge>
    );
  };

  const getStatusBadge = (status) => {
    return status === 'active' ? (
      <Badge className="bg-green-500 text-white">Active</Badge>
    ) : (
      <Badge className="bg-gray-500 text-white">Inactive</Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage system users and permissions</p>
        </div>
        <Button onClick={() => loadUsers()} disabled={loading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <XCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Doctors</CardTitle>
            <UserCheck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.byRole.doctor || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="flex justify-between w-full space-x-3 overflow-x-auto pb-1 bg-transparent border-b pb-2">
          <TabsTrigger
            value="users"
            className="
              flex items-center justify-center gap-2 min-w-[120px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium
              text-blue-700 border border-blue-200 bg-white shadow-sm transition-all duration-200
              hover:bg-blue-50 hover:text-blue-700
              dark:hover:bg-gray-800 
              data-[state=active]:!bg-blue-100
              dark:data-[state=active]:!bg-blue-100 
              data-[state=active]:!text-blue-800
              dark:data-[state=active]:!text-blue-800
              data-[state=active]:!border-blue-300
              dark:data-[state=active]:!border-blue-300
              data-[state=active]:shadow-lg
              data-[state=active]:scale-[1.05]
            "
          >
            Users
          </TabsTrigger>
          
          <TabsTrigger
            value="activity-log"
            className="
              flex items-center justify-center gap-2 min-w-[120px] px-6 py-3 rounded-xl text-sm sm:text-base font-medium
              text-blue-700 border border-blue-200 bg-white shadow-sm transition-all duration-200
              hover:bg-blue-50 hover:text-blue-700
              dark:hover:bg-gray-800 
              data-[state=active]:!bg-blue-100
              dark:data-[state=active]:!bg-blue-100 
              data-[state=active]:!text-blue-800
              dark:data-[state=active]:!text-blue-800
              data-[state=active]:!border-blue-300
              dark:data-[state=active]:!border-blue-300
              data-[state=active]:shadow-lg
              data-[state=active]:scale-[1.05]
            "
          >
            Activity Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Filters and Actions */}
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Create User Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>Add a new user to the system</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role *</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => (
                          <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="department">Department/Specialty</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="Enter department"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter phone"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter password (min 6 chars)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Confirm password"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateUser} disabled={loading}>
                    {loading ? 'Creating...' : 'Create User'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {loading ? 'Loading users...' : 'No users found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{user.department || '-'}</TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openResetPasswordDialog(user)}>
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(user)}>
                              {user.status === 'active' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user)} className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Recent user management actions</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {activityLog.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No recent activity</p>
                ) : (
                  <div className="space-y-2">
                    {activityLog.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="font-medium">{log.action}</span>
                          <span className="text-muted-foreground"> - {log.userInfo.username}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {log.timestamp.toLocaleString()}
                        </span>
                      </div>
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
            <DialogDescription>Update user information for {selectedUser?.username}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-department">Department/Specialty</Label>
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
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditUser} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Set a new password for {selectedUser?.username}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-password">New Password *</Label>
              <Input
                id="new-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter new password (min 6 chars)"
              />
            </div>
            <div>
              <Label htmlFor="confirm-new-password">Confirm Password *</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
