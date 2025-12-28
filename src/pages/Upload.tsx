import { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import { Upload as UploadIcon, Layers, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { UploadZone } from '@/components/UploadZone';
import { SeriesGenerator } from '@/components/SeriesGenerator';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/config/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Navbar from '@/components/Navbar';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Upload = () => {
  const navigate = useNavigate();
  const { user, token, loading, signOut } = useAuth();

  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [overrideWidthMm, setOverrideWidthMm] = useState('');
  const [overrideHeightMm, setOverrideHeightMm] = useState('');
  const [overrideXmm, setOverrideXmm] = useState('');
  const [overrideYmm, setOverrideYmm] = useState('');
  const [overrideCutMarginMm, setOverrideCutMarginMm] = useState('');
  const [overrideRotationDeg, setOverrideRotationDeg] = useState('');
  const [overrideAlignment, setOverrideAlignment] = useState<'left' | 'center' | 'right' | 'default'>('default');
  const [overrideKeepProportions, setOverrideKeepProportions] = useState<'default' | 'on' | 'off'>('default');

  const [searchEmail, setSearchEmail] = useState('');
  const [selectedAdminTarget, setSelectedAdminTarget] = useState<
    { id: string; email: string } | null
  >(null);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const [sessions, setSessions] = useState<
    Array<{ _id: string; ip: string; userAgent: string; createdAt: string }>
  >([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [allUsers, setAllUsers] = useState<
    Array<{
      _id: string;
      email: string;
      role?: string;
      createdAt?: string;
      sessionCount?: number;
      distinctIpCount?: number;
    }>
  >([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [ipOverview, setIpOverview] = useState<
    Array<{
      ip: string;
      sessionCount: number;
      lastSeen?: string;
      isBlocked?: boolean;
      blockedReason?: string | null;
    }>
  >([]);
  const [isLoadingIpOverview, setIsLoadingIpOverview] = useState(false);
  const [blockedIps, setBlockedIps] = useState<
    Array<{
      ip: string;
      reason?: string;
      isActive?: boolean;
      createdAt?: string;
      expiresAt?: string;
      blockedBy?: { email?: string };
    }>
  >([]);
  const [isLoadingBlockedIps, setIsLoadingBlockedIps] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { state: { from: '/upload' } });
    }
  }, [user, loading, navigate]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);

    setOverrideWidthMm('');
    setOverrideHeightMm('');
    setOverrideXmm('');
    setOverrideYmm('');
    setOverrideCutMarginMm('');
    setOverrideRotationDeg('');
    setOverrideAlignment('default');
    setOverrideKeepProportions('default');
  };

  const handleUpload = async () => {
    if (!selectedFile || !user || !token) return;

    setIsUploading(true);

    try {
      const isSvg =
        selectedFile.type === 'image/svg+xml' || selectedFile.name.toLowerCase().endsWith('.svg');

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', selectedFile.name);
      formData.append('totalPrints', '5');

      const parseNullableNumber = (raw: string): number | null => {
        const s = String(raw || '').trim();
        if (!s) return null;
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
      };

      const ticketCropMm: Record<string, unknown> = {};

      const xMmVal = parseNullableNumber(overrideXmm);
      if (xMmVal !== null) ticketCropMm.xMm = xMmVal;
      const yMmVal = parseNullableNumber(overrideYmm);
      if (yMmVal !== null) ticketCropMm.yMm = yMmVal;
      const widthMmVal = parseNullableNumber(overrideWidthMm);
      if (widthMmVal !== null) ticketCropMm.widthMm = widthMmVal;
      const heightMmVal = parseNullableNumber(overrideHeightMm);
      if (heightMmVal !== null) ticketCropMm.heightMm = heightMmVal;
      const cutMarginMmVal = parseNullableNumber(overrideCutMarginMm);
      if (cutMarginMmVal !== null) ticketCropMm.cutMarginMm = cutMarginMmVal;
      const rotationDegVal = parseNullableNumber(overrideRotationDeg);
      if (rotationDegVal !== null) ticketCropMm.rotationDeg = rotationDegVal;

      if (overrideKeepProportions !== 'default') {
        ticketCropMm.keepProportions = overrideKeepProportions === 'on';
      }
      if (overrideAlignment !== 'default' && ['left', 'center', 'right'].includes(overrideAlignment)) {
        ticketCropMm.alignment = overrideAlignment;
        if (overrideAlignment === 'center' || overrideAlignment === 'right') {
          delete ticketCropMm.xMm;
        }
      }

      const hasTicketCropMm = Object.keys(ticketCropMm).length > 0;
      const ticketCropMmForClient = hasTicketCropMm ? ticketCropMm : null;
      if (hasTicketCropMm) {
        formData.append('ticketCropMm', JSON.stringify(ticketCropMm));
      }

      const res = await api.post('/api/docs/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = res.data as any;

      if (data?.documentId && ticketCropMmForClient) {
        try {
          sessionStorage.setItem(`ticketCropMm:${data.documentId}`, JSON.stringify(ticketCropMmForClient));
        } catch {
          // ignore
        }
      }

      toast.success('Document uploaded securely');

      const params = new URLSearchParams({
        sessionToken: String(data.sessionToken || ''),
        documentTitle: String(data.documentTitle || ''),
        documentId: String(data.documentId || ''),
        remainingPrints: String(data.remainingPrints ?? ''),
        maxPrints: String(data.maxPrints ?? ''),
        documentType: String(data.documentType || 'pdf'),
      });

      navigate(`/viewer?${params.toString()}`, {
        state: {
          sessionToken: data.sessionToken,
          documentTitle: data.documentTitle,
          documentId: data.documentId,
          remainingPrints: data.remainingPrints,
          maxPrints: data.maxPrints,
          documentType: data.documentType,
          ticketCropMm: ticketCropMmForClient,
        },
      });
    } catch (error) {
      const eAny = error as any;
      console.error('Upload error:', eAny);
      const status = eAny?.response?.status;
      const logout = Boolean(eAny?.response?.data?.logout);
      if (status === 401 && logout) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        await signOut();
        toast.error('Session expired. Please login again.');
        navigate('/auth', { state: { from: '/upload' } });
        return;
      }
      const message = eAny?.response?.data?.message || eAny?.message || 'Upload failed';
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const toggleSelectedUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleLoadSessions = async () => {
    if (!token || !selectedAdminTarget) return;
    setIsLoadingSessions(true);
    try {
      const res = await api.get(`/api/admin/sessions/${selectedAdminTarget.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data as any;
      setSessions(data?.sessions || []);
    } catch (error) {
      const eAny = error as any;
      console.error('Load sessions error:', eAny);
      const status = eAny?.response?.status;
      const logout = Boolean(eAny?.response?.data?.logout);
      if (status === 401 && logout) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        await signOut();
        toast.error('Session expired. Please login again.');
        navigate('/auth');
        return;
      }
      const message = eAny?.response?.data?.message || eAny?.message || 'Failed to load sessions';
      toast.error(message);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!token || !selectedAdminTarget) return;
    setIsLoggingOutAll(true);
    try {
      await api.post(
        `/api/admin/sessions/${selectedAdminTarget.id}/logout-all`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success('All devices logged out');
      setSessions([]);
    } catch (error) {
      const eAny = error as any;
      console.error('Logout all error:', eAny);
      const status = eAny?.response?.status;
      const logout = Boolean(eAny?.response?.data?.logout);
      if (status === 401 && logout) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        await signOut();
        toast.error('Session expired. Please login again.');
        navigate('/auth');
        return;
      }
      const message = eAny?.response?.data?.message || eAny?.message || 'Failed to logout all devices';
      toast.error(message);
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  const handleLoadAllUsers = async () => {
    if (!token) return;
    setIsLoadingUsers(true);
    try {
      const res = await api.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data as any;
      setAllUsers(data?.users || []);
    } catch (error) {
      const eAny = error as any;
      console.error('Load users error:', eAny);
      const status = eAny?.response?.status;
      const logout = Boolean(eAny?.response?.data?.logout);
      if (status === 401 && logout) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        await signOut();
        toast.error('Session expired. Please login again.');
        navigate('/auth');
        return;
      }
      const message = eAny?.response?.data?.message || eAny?.message || 'Failed to load users';
      toast.error(message);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleBulkLogout = async () => {
    if (!token || selectedUserIds.length === 0) return;
    try {
      await api.post(
        '/api/admin/sessions/bulk-logout',
        { userIds: selectedUserIds },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success('Selected users logged out');
      setSelectedUserIds([]);
    } catch (error) {
      const eAny = error as any;
      console.error('Bulk logout error:', eAny);
      const status = eAny?.response?.status;
      const logout = Boolean(eAny?.response?.data?.logout);
      if (status === 401 && logout) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        await signOut();
        toast.error('Session expired. Please login again.');
        navigate('/auth');
        return;
      }
      const message = eAny?.response?.data?.message || eAny?.message || 'Failed to bulk logout';
      toast.error(message);
    }
  };

  const handleLoadIpOverview = async () => {
    if (!token || !selectedAdminTarget) return;
    setIsLoadingIpOverview(true);
    try {
      const res = await api.get(`/api/admin/ip-overview/${selectedAdminTarget.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data as any;
      setIpOverview(data?.ipOverview || []);
    } catch (error) {
      const eAny = error as any;
      console.error('Load IP overview error:', eAny);
      const status = eAny?.response?.status;
      const logout = Boolean(eAny?.response?.data?.logout);
      if (status === 401 && logout) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        await signOut();
        toast.error('Session expired. Please login again.');
        navigate('/auth');
        return;
      }
      const message = eAny?.response?.data?.message || eAny?.message || 'Failed to load IP overview';
      toast.error(message);
    } finally {
      setIsLoadingIpOverview(false);
    }
  };

  const handleBlockOtherIps = async () => {
    if (!token || !selectedAdminTarget) return;
    try {
      const currentIps = new Set(ipOverview.map(row => row.ip));
      await api.post(
        `/api/admin/block-other-ips/${selectedAdminTarget.id}`,
        { exemptIps: Array.from(currentIps) },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success('Other IPs blocked');
      await handleLoadIpOverview();
    } catch (error) {
      const eAny = error as any;
      console.error('Block other IPs error:', eAny);
      const status = eAny?.response?.status;
      const logout = Boolean(eAny?.response?.data?.logout);
      if (status === 401 && logout) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        await signOut();
        toast.error('Session expired. Please login again.');
        navigate('/auth');
        return;
      }
      const message = eAny?.response?.data?.message || eAny?.message || 'Failed to block other IPs';
      toast.error(message);
    }
  };

  const handleLoadBlockedIps = async () => {
    if (!token) return;
    setIsLoadingBlockedIps(true);
    try {
      const res = await api.get('/api/admin/blocked-ips', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data as any;
      setBlockedIps(data?.blockedIps || []);
    } catch (error) {
      const eAny = error as any;
      console.error('Load blocked IPs error:', eAny);
      const status = eAny?.response?.status;
      const logout = Boolean(eAny?.response?.data?.logout);
      if (status === 401 && logout) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        await signOut();
        toast.error('Session expired. Please login again.');
        navigate('/auth');
        return;
      }
      const message = eAny?.response?.data?.message || eAny?.message || 'Failed to load blocked IPs';
      toast.error(message);
    } finally {
      setIsLoadingBlockedIps(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8">
        <h1 className="text-2xl font-semibold mb-8">Document Tools</h1>

        <Tabs defaultValue="upload" className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="upload" className="gap-2">
              <UploadIcon className="h-4 w-4" />
              Secure Upload
            </TabsTrigger>
            <TabsTrigger value="series" className="gap-2">
              <Layers className="h-4 w-4" />
              Batch Series
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <UploadZone
              onFileSelect={handleFileSelect}
              isUploading={isUploading}
            />

            {selectedFile && !isUploading && (
              <div className="rounded-xl bg-card border border-border p-4 space-y-4">
                <div className="text-sm font-semibold text-foreground">MM Layout Overrides (Optional)</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Object Width (mm)</div>
                    <Input value={overrideWidthMm} onChange={(e) => setOverrideWidthMm(e.target.value)} placeholder="e.g. 146" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Object Height (mm)</div>
                    <Input value={overrideHeightMm} onChange={(e) => setOverrideHeightMm(e.target.value)} placeholder="e.g. 66" />
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">X Position (mm) (optional)</div>
                    <Input value={overrideXmm} onChange={(e) => setOverrideXmm(e.target.value)} placeholder="e.g. 10" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Y Position (mm) (optional)</div>
                    <Input value={overrideYmm} onChange={(e) => setOverrideYmm(e.target.value)} placeholder="e.g. 10" />
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Cut Margin (mm) (optional)</div>
                    <Input value={overrideCutMarginMm} onChange={(e) => setOverrideCutMarginMm(e.target.value)} placeholder="e.g. 2" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Rotation (deg) (optional)</div>
                    <Input value={overrideRotationDeg} onChange={(e) => setOverrideRotationDeg(e.target.value)} placeholder="e.g. 0" />
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Alignment (optional)</div>
                    <Select
                      value={overrideAlignment}
                      onValueChange={(v) => setOverrideAlignment(v as 'left' | 'center' | 'right' | 'default')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Default" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Keep Proportions (optional)</div>
                    <Select
                      value={overrideKeepProportions}
                      onValueChange={(v) => setOverrideKeepProportions(v as 'default' | 'on' | 'off')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Default" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="on">ON</SelectItem>
                        <SelectItem value="off">OFF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {selectedFile && !isUploading && (
              <div className="flex justify-center animate-fade-in">
                <Button
                  size="lg"
                  onClick={handleUpload}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-14 px-8"
                >
                  <UploadIcon className="h-5 w-5" />
                  Upload & View Securely
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="series">
            {user && <SeriesGenerator userId={user.id} />}
          </TabsContent>
        </Tabs>

        {/* Security info */}
        <div className="mt-12 p-6 rounded-xl bg-card border border-border animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Security Features
          </h3>
          <ul className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
            {[
              "Vector format preserved",
              "No download option",
              "No copy/paste",
              "Session controlled",
              "Watermarked prints",
              "Print count limits"
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {user && user.role === 'admin' && (
          <div className="mt-6 p-4 rounded-xl bg-card border border-border animate-fade-in" style={{ animationDelay: '0.25s' }}>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Session Control (Admin)
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              View and control active sessions for a user. Search by email to see all logged-in devices.
            </p>
            {selectedAdminTarget && (
              <div className="text-xs text-muted-foreground mb-2">
                Selected user:&nbsp;
                <span className="font-medium text-foreground">{selectedAdminTarget.email}</span>
                &nbsp;(<code className="text-[10px]">{selectedAdminTarget.id}</code>)
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="User email (e.g. user@example.com)"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="sm:max-w-xs"
              />
              <Button
                variant="outline"
                onClick={handleLoadSessions}
                disabled={isLoadingSessions}
                className="w-full sm:w-auto"
              >
                {isLoadingSessions ? 'Loading sessions...' : 'View active sessions'}
              </Button>
              <Button
                variant="destructive"
                onClick={handleLogoutAllDevices}
                disabled={isLoggingOutAll}
                className="w-full sm:w-auto"
              >
                {isLoggingOutAll ? 'Logging out...' : 'Logout all devices'}
              </Button>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-foreground">Users with active sessions</h4>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleLoadAllUsers}
                    disabled={isLoadingUsers}
                  >
                    {isLoadingUsers ? 'Loading...' : 'Load all users'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBulkLogout}
                    disabled={selectedUserIds.length === 0}
                  >
                    Logout selected
                  </Button>
                </div>
              </div>
              {allUsers.length > 0 && (
                <div className="max-h-64 overflow-y-auto border border-border/60 rounded-md">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 border-b border-border/60">
                      <tr>
                        <th className="py-1 px-2 w-6 text-center">
                          <input
                            type="checkbox"
                            className="h-3 w-3"
                            checked={
                              allUsers.filter((u) => u.role !== 'admin').length > 0 &&
                              allUsers
                                .filter((u) => u.role !== 'admin')
                                .every((u) => selectedUserIds.includes(u._id))
                            }
                            onChange={(e) => {
                              const checked = e.target.checked;
                              if (checked) {
                                setSelectedUserIds(
                                  allUsers
                                    .filter((u) => u.role !== 'admin')
                                    .map((u) => u._id)
                                );
                              } else {
                                setSelectedUserIds([]);
                              }
                            }}
                          />
                        </th>
                        <th className="text-left py-1 px-2">Email</th>
                        <th className="text-left py-1 px-2">Role</th>
                        <th className="text-left py-1 px-2">Active sessions</th>
                        <th className="text-left py-1 px-2">Distinct IPs</th>
                        <th className="text-left py-1 px-2">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers
                        .filter((u) => u.role !== 'admin')
                        .map((u) => (
                          <tr
                            key={u._id}
                            className="border-b border-border/40 last:border-0 hover:bg-muted/30 cursor-pointer"
                            onClick={() => {
                              setSearchEmail(u.email);
                              setSelectedAdminTarget({ id: u._id, email: u.email });
                            }}
                          >
                            <td className="py-1 px-2 text-center">
                              <input
                                type="checkbox"
                                className="h-3 w-3"
                                checked={selectedUserIds.includes(u._id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleSelectedUser(u._id);
                                }}
                              />
                            </td>
                            <td className="py-1 px-2">{u.email}</td>
                            <td className="py-1 px-2">{u.role || 'user'}</td>
                            <td className="py-1 px-2">{u.sessionCount ?? 0}</td>
                            <td className="py-1 px-2">{u.distinctIpCount ?? 0}</td>
                            <td className="py-1 px-2">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
              {allUsers.length === 0 && !isLoadingUsers && (
                <p className="text-[11px] text-muted-foreground">
                  Users will appear here after you load them.
                </p>
              )}
            </div>

            {sessions.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2 pr-2 text-left">IP address</th>
                      <th className="py-2 px-2 text-left">Browser / Device</th>
                      <th className="py-2 px-2 text-left">Login time</th>
                      <th className="py-2 pl-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s._id} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-2 align-top font-mono text-[11px] sm:text-xs">{s.ip}</td>
                        <td className="py-2 px-2 align-top max-w-xs truncate" title={s.userAgent}>
                          {s.userAgent || 'Unknown'}
                        </td>
                        <td className="py-2 px-2 align-top whitespace-nowrap">
                          {new Date(s.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2 pl-2 align-top text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              if (!token) return;
                              try {
                                await api.post(
                                  `/api/admin/sessions/${s._id}/logout`,
                                  {},
                                  {
                                    headers: {
                                      Authorization: `Bearer ${token}`,
                                    },
                                  }
                                );

                                toast.success('Session logged out');
                                setSessions((prev) => prev.filter((x) => x._id !== s._id));
                              } catch (error) {
                                const eAny = error as any;
                                console.error('Logout session error:', eAny);
                                const status = eAny?.response?.status;
                                const logout = Boolean(eAny?.response?.data?.logout);
                                if (status === 401 && logout) {
                                  localStorage.removeItem('auth_token');
                                  localStorage.removeItem('auth_user');
                                  toast.error('Session expired. Please login again.');
                                  navigate('/auth');
                                  return;
                                }
                                const message =
                                  eAny?.response?.data?.message || eAny?.message || 'Failed to logout session';
                                toast.error(message);
                              }
                            }}
                          >
                            Logout
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              if (!token) return;
                              try {
                                await api.post(
                                  `/api/admin/sessions/${s._id}/block-ip`,
                                  { reason: 'Blocked from admin panel' },
                                  {
                                    headers: {
                                      Authorization: `Bearer ${token}`,
                                    },
                                  }
                                );

                                toast.success('IP blocked and sessions removed');
                                setSessions((prev) => prev.filter((x) => x.ip !== s.ip));
                              } catch (error) {
                                const eAny = error as any;
                                console.error('Block IP error:', eAny);
                                const status = eAny?.response?.status;
                                const logout = Boolean(eAny?.response?.data?.logout);
                                if (status === 401 && logout) {
                                  localStorage.removeItem('auth_token');
                                  localStorage.removeItem('auth_user');
                                  toast.error('Session expired. Please login again.');
                                  navigate('/auth');
                                  return;
                                }
                                const message = eAny?.response?.data?.message || eAny?.message || 'Failed to block IP';
                                toast.error(message);
                              }
                            }}
                          >
                            Block IP
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedAdminTarget && (
              <div className="mt-6 border-t border-border pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-foreground">IP overview for selected user</h4>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleLoadIpOverview}
                      disabled={isLoadingIpOverview}
                    >
                      {isLoadingIpOverview ? 'Loading IPs...' : 'Load IP overview'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleBlockOtherIps}>
                      Block all other IPs
                    </Button>
                  </div>
                </div>

                {ipOverview.length > 0 && (
                  <div className="max-h-64 overflow-y-auto border border-border/60 rounded-md">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40 border-b border-border/60">
                        <tr>
                          <th className="text-left py-1 px-2">IP</th>
                          <th className="text-left py-1 px-2">Total sessions</th>
                          <th className="text-left py-1 px-2">Last seen</th>
                          <th className="text-left py-1 px-2">Status</th>
                          <th className="text-left py-1 px-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ipOverview.map((row) => (
                          <tr key={row.ip} className="border-b border-border/40 last:border-0">
                            <td className="py-1 px-2 font-mono text-[11px] sm:text-xs">{row.ip}</td>
                            <td className="py-1 px-2">{row.sessionCount}</td>
                            <td className="py-1 px-2">
                              {row.lastSeen ? new Date(row.lastSeen).toLocaleString() : '-'}
                            </td>
                            <td className="py-1 px-2">
                              {row.isBlocked ? (
                                <span className="text-xs text-red-500">Blocked</span>
                              ) : (
                                <span className="text-xs text-green-500">Allowed</span>
                              )}
                            </td>
                            <td className="py-1 px-2">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant={row.isBlocked ? 'outline' : 'destructive'}
                                  onClick={async () => {
                                    if (!token) return;
                                    try {
                                      if (row.isBlocked) {
                                        await api.post(
                                          '/api/admin/unblock-ip',
                                          { ip: row.ip },
                                          {
                                            headers: {
                                              Authorization: `Bearer ${token}`,
                                            },
                                          }
                                        );
                                      } else {
                                        await api.post(
                                          '/api/admin/block-ip',
                                          { ip: row.ip },
                                          {
                                            headers: {
                                              Authorization: `Bearer ${token}`,
                                            },
                                          }
                                        );
                                      }
                                      toast.success(row.isBlocked ? 'IP unblocked' : 'IP blocked');
                                      await handleLoadIpOverview();
                                    } catch (error) {
                                      const eAny = error as any;
                                      console.error('Toggle IP block error', eAny);
                                      const message =
                                        eAny?.response?.data?.message || eAny?.message || 'Failed to update IP status';
                                      toast.error(message);
                                    }
                                  }}
                                >
                                  {row.isBlocked ? 'Unblock' : 'Block'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {ipOverview.length === 0 && !isLoadingIpOverview && (
                  <p className="text-[11px] text-muted-foreground">
                    IPs for this user will appear here after you load them.
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 border-t border-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-foreground">Blocked IPs (global)</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLoadBlockedIps}
                  disabled={isLoadingBlockedIps}
                >
                  {isLoadingBlockedIps ? 'Loading...' : 'Refresh'}
                </Button>
              </div>

              {blockedIps.length > 0 && (
                <div className="max-h-64 overflow-y-auto border border-border/60 rounded-md">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 border-b border-border/60">
                      <tr>
                        <th className="text-left py-1 px-2">IP</th>
                        <th className="text-left py-1 px-2">Reason</th>
                        <th className="text-left py-1 px-2">Blocked by</th>
                        <th className="text-left py-1 px-2">Expires at</th>
                        <th className="text-left py-1 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blockedIps.map((b) => (
                        <tr key={b.ip} className="border-b border-border/40 last:border-0">
                          <td className="py-1 px-2 font-mono text-[11px] sm:text-xs">{b.ip}</td>
                          <td className="py-1 px-2 max-w-xs truncate">{b.reason || '-'}</td>
                          <td className="py-1 px-2">Admin</td>
                          <td className="py-1 px-2">
                            {b.expiresAt ? new Date(b.expiresAt).toLocaleString() : '-'}
                          </td>
                          <td className="py-1 px-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                if (!token) return;
                                try {
                                  await api.post(
                                    '/api/admin/unblock-ip',
                                    { ip: b.ip },
                                    {
                                      headers: {
                                        Authorization: `Bearer ${token}`,
                                      },
                                    }
                                  );
                                  toast.success('IP unblocked');
                                  await handleLoadBlockedIps();
                                } catch (error) {
                                  const eAny = error as any;
                                  console.error('Unblock IP error', eAny);
                                  const message =
                                    eAny?.response?.data?.message || eAny?.message || 'Failed to unblock IP';
                                  toast.error(message);
                                }
                              }}
                            >
                              Unblock
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {blockedIps.length === 0 && !isLoadingBlockedIps && (
                <p className="text-[11px] text-muted-foreground">
                  No blocked IPs found. Use the Block IP buttons above to add some.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;