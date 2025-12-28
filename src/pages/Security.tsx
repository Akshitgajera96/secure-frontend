import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "@/lib/api";

const Security = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any | null>(null);
  const [newIp, setNewIp] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const authHeaders = () => {
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/security/settings", {
        headers: authHeaders(),
      });
      const data = res.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to load security settings");
      }
      setSettings(data.data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load security settings");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (pageNum: number) => {
    try {
      const res = await api.get(
        `/api/security/login-history?page=${pageNum}&limit=20`,
        { headers: authHeaders() }
      );
      const data = res.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to load login history");
      }
      setHistory(data.data || []);
      setPage(data.pagination.page);
      setPages(data.pagination.pages);
    } catch (err: any) {
      toast.error(err.message || "Failed to load login history");
    }
  };

  useEffect(() => {
    loadSettings();
    loadHistory(1);
  }, []);

  const handleAddIp = async () => {
    if (!newIp.trim()) return;
    try {
      const res = await api.post(
        "/api/security/ip-whitelist",
        { ip: newIp.trim(), action: "add" },
        { headers: authHeaders() }
      );
      const data = res.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to add IP");
      }
      toast.success("IP added to whitelist");
      setNewIp("");
      await loadSettings();
    } catch (err: any) {
      toast.error(err.message || "Failed to add IP");
    }
  };

  const handleRemoveIp = async (ip: string) => {
    try {
      const res = await api.post(
        "/api/security/ip-whitelist",
        { ip, action: "remove" },
        { headers: authHeaders() }
      );
      const data = res.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to remove IP");
      }
      toast.success("IP removed from whitelist");
      await loadSettings();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove IP");
    }
  };

  const handleToggleWhitelist = async () => {
    if (!settings) return;
    const nextValue = !settings.security?.requireIPWhitelist;
    try {
      const res = await api.post(
        "/api/security/toggle-ip-whitelist",
        { enabled: nextValue },
        { headers: authHeaders() }
      );
      const data = res.data;
      if (!data.success) {
        throw new Error(data.message || "Failed to toggle IP whitelist");
      }
      toast.success(
        nextValue ? "IP whitelist enabled" : "IP whitelist disabled"
      );
      await loadSettings();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle IP whitelist");
    }
  };

  if (loading && !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading security settings...
      </div>
    );
  }

  const security = settings?.security || {};
  const allowedIPs = settings?.allowedIPs || [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Security Settings</h1>

        <div className="bg-card border border-border rounded-lg p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">IP Whitelist</h2>
              <p className="text-xs text-muted-foreground">
                Allow access only from specific IP addresses.
              </p>
            </div>
            <Button
              variant={security.requireIPWhitelist ? "default" : "outline"}
              size="sm"
              onClick={handleToggleWhitelist}
            >
              {security.requireIPWhitelist ? "Enabled" : "Disabled"}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Last login IP: <strong>{settings?.lastLoginIP || "-"}</strong>
          </div>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Enter IP (e.g. 123.45.67.89)"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
            />
            <Button size="sm" onClick={handleAddIp}>
              Add IP
            </Button>
          </div>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">IP</th>
                  <th className="text-left py-1">Last used</th>
                  <th className="text-left py-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allowedIPs.map((item: any) => (
                  <tr key={item.ip} className="border-b">
                    <td className="py-1">{item.ip}</td>
                    <td className="py-1">
                      {item.lastUsed
                        ? new Date(item.lastUsed).toLocaleString()
                        : "-"}
                    </td>
                    <td className="py-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveIp(item.ip)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
                {allowedIPs.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-2 text-center text-muted-foreground"
                    >
                      No IPs in whitelist
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Login History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Time</th>
                  <th className="text-left py-1">IP</th>
                  <th className="text-left py-1">User Agent</th>
                  <th className="text-left py-1">Status</th>
                  <th className="text-left py-1">Reason</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    <td className="py-1">
                      {h.timestamp
                        ? new Date(h.timestamp).toLocaleString()
                        : "-"}
                    </td>
                    <td className="py-1">{h.ip}</td>
                    <td className="py-1 max-w-xs truncate">{h.userAgent}</td>
                    <td className="py-1">
                      <span
                        className={`text-xs ${
                          h.status === "success" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                    <td className="py-1 text-xs">{h.reason || "-"}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-2 text-center text-muted-foreground"
                    >
                      No login history
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2 mt-2 text-xs">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => loadHistory(page - 1)}
            >
              Prev
            </Button>
            <span className="self-center">
              Page {page} / {pages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pages}
              onClick={() => loadHistory(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Security;
