import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Download,
  Search,
  RefreshCw,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { adminAPIService, EmailInterestFilters, EmailInterest, EmailInterestStats } from "@/services/admin-api.service";
import { formatDate } from "@/utils/admin.utils";

const EmailInterestsPanel = () => {
  const [interests, setInterests] = useState<EmailInterest[]>([]);
  const [stats, setStats] = useState<EmailInterestStats>({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    consent: { updates: 0, relatedInitiatives: 0, both: 0 },
    recentActivity: {}
  });
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0
  });

  // Filters
  const [filters, setFilters] = useState<EmailInterestFilters>({
    search: "",
    dateRange: "all",
    updatesConsent: undefined,
    relatedInitiativesConsent: undefined,
    sortBy: "created_at",
    sortOrder: "desc",
    limit: 25,
    offset: 0
  });

  const loadStats = useCallback(async () => {
    try {
      const statsData = await adminAPIService.getEmailInterestStats();
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load email interest stats:", error);
      toast.error("Failed to load statistics");
    }
  }, []);

  const loadInterests = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminAPIService.getEmailInterests(filters);
      setInterests(result.interests);
      setPagination({
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages
      });
    } catch (error) {
      console.error("Failed to load email interests:", error);
      toast.error("Failed to load email interests");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadStats();
    loadInterests();
  }, [loadStats, loadInterests]);

  const handleFilterChange = (key: keyof EmailInterestFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: key === 'search' ? 0 : prev.offset // Reset to first page when searching
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({
      ...prev,
      offset: (newPage - 1) * (prev.limit || 25)
    }));
  };

  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    try {
      toast.info("Preparing export...");
      const result = await adminAPIService.exportEmailInterests(filters, format);
      
      const blob = new Blob([result.data], { type: result.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Export completed");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed");
    }
  };

  const handleDelete = async (interestId: string) => {
    if (!confirm("Are you sure you want to delete this email interest record?")) {
      return;
    }

    try {
      await adminAPIService.deleteEmailInterest(interestId);
      toast.success("Email interest deleted");
      loadInterests();
      loadStats();
    } catch (error) {
      console.error("Failed to delete email interest:", error);
      toast.error("Failed to delete record");
    }
  };

  const getConsentBadge = (hasConsent: boolean, type: string) => (
    <Badge variant={hasConsent ? "default" : "secondary"} className="text-xs">
      {hasConsent ? (
        <CheckCircle className="w-3 h-3 mr-1" />
      ) : (
        <XCircle className="w-3 h-3 mr-1" />
      )}
      {type}
    </Badge>
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-terminal-green/30 bg-terminal-bg/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-terminal-text-muted flex items-center">
              <Mail className="w-4 h-4 mr-2" />
              Total Interests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-terminal-green">{stats.total}</div>
            <p className="text-xs text-terminal-text-muted">
              {stats.today} today, {stats.thisWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card className="border-terminal-green/30 bg-terminal-bg/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-terminal-text-muted flex items-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Updates Consent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-terminal-green">{stats.consent.updates}</div>
            <p className="text-xs text-terminal-text-muted">
              {stats.total > 0 ? Math.round((stats.consent.updates / stats.total) * 100) : 0}% consent rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-terminal-green/30 bg-terminal-bg/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-terminal-text-muted flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Related Initiatives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-terminal-green">{stats.consent.relatedInitiatives}</div>
            <p className="text-xs text-terminal-text-muted">
              {stats.total > 0 ? Math.round((stats.consent.relatedInitiatives / stats.total) * 100) : 0}% consent rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-terminal-green/30 bg-terminal-bg/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-terminal-text-muted flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-terminal-green">{stats.thisMonth}</div>
            <p className="text-xs text-terminal-text-muted">
              {stats.consent.both} with both consents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-terminal-green/30 bg-terminal-bg/50">
        <CardHeader>
          <CardTitle className="text-terminal-green font-mono">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-terminal-text-muted" />
                <Input
                  id="search"
                  placeholder="Name or email..."
                  value={filters.search || ""}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="dateRange">Date Range</Label>
              <Select
                value={filters.dateRange || "all"}
                onValueChange={(value) => handleFilterChange("dateRange", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="updatesConsent">Updates Consent</Label>
              <Select
                value={filters.updatesConsent?.toString() || "all"}
                onValueChange={(value) => 
                  handleFilterChange("updatesConsent", value === "all" ? undefined : value === "true")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="relatedConsent">Related Consent</Label>
              <Select
                value={filters.relatedInitiativesConsent?.toString() || "all"}
                onValueChange={(value) => 
                  handleFilterChange("relatedInitiativesConsent", value === "all" ? undefined : value === "true")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={loadInterests} disabled={loading} variant="outline" size="sm">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button onClick={() => handleExport("csv")} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Interests Table */}
      <Card className="border-terminal-green/30 bg-terminal-bg/50">
        <CardHeader>
          <CardTitle className="text-terminal-green font-mono flex items-center justify-between">
            <span>Email Interests ({pagination.total})</span>
            <div className="text-sm text-terminal-text-muted">
              Page {pagination.page} of {pagination.totalPages}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Updates Consent</TableHead>
                <TableHead>Related Consent</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading email interests...
                  </TableCell>
                </TableRow>
              ) : interests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-terminal-text-muted">
                    No email interests found
                  </TableCell>
                </TableRow>
              ) : (
                interests.map((interest) => (
                  <TableRow key={interest.id}>
                    <TableCell className="font-medium">{interest.name}</TableCell>
                    <TableCell>{interest.email}</TableCell>
                    <TableCell>
                      {getConsentBadge(interest.updates_consent, "Updates")}
                    </TableCell>
                    <TableCell>
                      {getConsentBadge(interest.related_initiatives_consent, "Related")}
                    </TableCell>
                    <TableCell>{formatDate(interest.created_at)}</TableCell>
                    <TableCell>
                      <Button
                        onClick={() => handleDelete(interest.id)}
                        size="sm"
                        variant="outline"
                        className="text-red-400 hover:text-red-300 hover:border-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-terminal-text-muted">
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
                {pagination.total} entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                <span className="text-sm">
                  {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailInterestsPanel;