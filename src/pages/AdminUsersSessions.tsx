import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Key, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/api";

const AdminUsersSessions = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchEmail, setSearchEmail] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Admin creation states
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [showAdminManagement, setShowAdminManagement] = useState(false);

  const authHeaders = () => {
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const handleSearch = async () => {
    try {
      setLoadingUsers(true);
      setSelectedUser(null);
      setSessions([]);

      const params: Record<string, string> = {};
      if (searchEmail.trim()) {
        params.email = searchEmail.trim();
      }

      const res = await api.get("/api/admin/users", {
        headers: authHeaders(),
        params,
      });

      const data = res.data;
      setUsers(data.users || []);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load users";
      toast.error(message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchSessions = async (userId: string) => {
    try {
      setLoadingSessions(true);
      const res = await api.get(`/api/admin/users/${userId}/sessions`, {
        headers: authHeaders(),
      });
      const data = res.data;
      setSessions(data.sessions || []);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load sessions";
      toast.error(message);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleSelectUser = async (user: any) => {
    setSelectedUser(user);
    await fetchSessions(user._id);
  };

  const handleLogoutAll = async () => {
    if (!selectedUser) return;
    try {
      const res = await api.post(
        "/api/admin/logout-all",
        { userId: selectedUser._id },
        { headers: authHeaders() }
      );

      toast.success("All devices logged out for this user");
      await fetchSessions(selectedUser._id);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to logout all devices";
      toast.error(message);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error("Current password and new password are required");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    try {
      setChangingPassword(true);
      await api.put(
        "/api/admin/change-password",
        { currentPassword, newPassword },
        { headers: authHeaders() }
      );
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to change password";
      toast.error(message);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!adminEmail || !adminPassword) {
      toast.error("Email and password are required");
      return;
    }
    
    if (adminPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    try {
      setCreatingAdmin(true);
      await api.post(
        "/api/admin/admins",
        { email: adminEmail, password: adminPassword },
        { headers: authHeaders() }
      );
      toast.success("Admin created successfully");
      setAdminEmail("");
      setAdminPassword("");
      await fetchAdmins();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create admin";
      toast.error(message);
    } finally {
      setCreatingAdmin(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await api.get("/api/admin/admins", {
        headers: authHeaders(),
      });
      const data = res.data;
      setAdmins(data.admins || []);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch admins";
      toast.error(message);
    }
  };

  const handleShowAdminManagement = async () => {
    setShowAdminManagement(true);
    await fetchAdmins();
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
        {/* Admin Management Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Password Change Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your admin account password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleChangePassword} 
                disabled={changingPassword}
                className="w-full"
              >
                {changingPassword ? "Changing..." : "Change Password"}
              </Button>
            </CardContent>
          </Card>

          {/* Admin Management Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Admin Management
              </CardTitle>
              <CardDescription>
                Create and manage admin accounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Dialog open={showAdminManagement} onOpenChange={setShowAdminManagement}>
                <DialogTrigger asChild>
                  <Button onClick={handleShowAdminManagement} className="w-full">
                    Manage Admins
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Admin Management</DialogTitle>
                    <DialogDescription>
                      Create new admin accounts and view existing admins
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6">
                    {/* Create Admin Form */}
                    <div className="space-y-4 p-4 border rounded-lg">
                      <h4 className="font-medium">Create New Admin</h4>
                      <div>
                        <Label htmlFor="admin-email">Email</Label>
                        <Input
                          id="admin-email"
                          type="email"
                          placeholder="admin@example.com"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="admin-password">Password</Label>
                        <Input
                          id="admin-password"
                          type="password"
                          placeholder="Enter password (min 6 chars)"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                        />
                      </div>
                      <Button 
                        onClick={handleCreateAdmin} 
                        disabled={creatingAdmin}
                        className="w-full"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        {creatingAdmin ? "Creating..." : "Create Admin"}
                      </Button>
                    </div>

                    {/* Existing Admins List */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Existing Admins</h4>
                      <div className="border rounded-lg">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Email</th>
                              <th className="text-left p-2">Role</th>
                              <th className="text-left p-2">Created</th>
                            </tr>
                          </thead>
                          <tbody>
                            {admins.map((admin) => (
                              <tr key={admin._id} className="border-b">
                                <td className="p-2">{admin.email}</td>
                                <td className="p-2">{admin.role}</td>
                                <td className="p-2">
                                  {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : "-"}
                                </td>
                              </tr>
                            ))}
                            {admins.length === 0 && (
                              <tr>
                                <td colSpan={3} className="p-4 text-center text-muted-foreground">
                                  No admins found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        {/* User Sessions Management */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h1 className="text-xl font-semibold mb-2">User Session Management</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Search users by email, then manage their active sessions.
          </p>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Search by email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
            />
            <Button onClick={handleSearch} disabled={loadingUsers}>
              {loadingUsers ? "Searching..." : "Search"}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Email</th>
                  <th className="text-left py-1">Role</th>
                  <th className="text-left py-1">Created</th>
                  <th className="text-left py-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-b">
                    <td className="py-1">{u.email}</td>
                    <td className="py-1">{u.role}</td>
                    <td className="py-1">
                      {u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}
                    </td>
                    <td className="py-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectUser(u)}
                      >
                        Manage sessions
                      </Button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !loadingUsers && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-2 text-center text-muted-foreground"
                    >
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedUser && (
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-semibold">Session Control (Admin)</h2>
                <p className="text-xs text-muted-foreground">
                  Managing sessions for: <strong>{selectedUser.email}</strong>
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={handleLogoutAll}>
                Logout all devices
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mb-3">
              Target userId: <code>{selectedUser._id}</code>
            </div>
            {loadingSessions ? (
              <div className="text-sm text-muted-foreground">Loading sessions...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">IP</th>
                      <th className="text-left py-1">User Agent</th>
                      <th className="text-left py-1">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s._id} className="border-b">
                        <td className="py-1">{s.ip}</td>
                        <td className="py-1 max-w-xs truncate">{s.userAgent}</td>
                        <td className="py-1">
                          {s.createdAt
                            ? new Date(s.createdAt).toLocaleString()
                            : "-"}
                        </td>
                      </tr>
                    ))}
                    {sessions.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-2 text-center text-muted-foreground"
                        >
                          No active sessions
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersSessions;
