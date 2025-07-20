import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, Search } from 'lucide-react';
import { adminAPIService } from '@/services/admin-api.service';
import { toast } from 'sonner';

interface User {
  id: string;
  handle: string;
  agent_profiles?: Array<{ agent_name: string }>;
  status: string;
}

interface UserSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (userIdA: string, userIdB: string, userAHandle: string, userBHandle: string) => void;
  loading?: boolean;
}

export const UserSelectionDialog: React.FC<UserSelectionDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  loading = false
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserA, setSelectedUserA] = useState<string>('');
  const [selectedUserB, setSelectedUserB] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch users when dialog opens
  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const result = await adminAPIService.searchUsers({
        limit: 200, // Get a reasonable number of users
        offset: 0,
        status: 'APPROVED', // Only show approved users
        sortBy: 'handle',
        sortOrder: 'asc'
      });
      setUsers(result.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(user => 
      user.handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.agent_profiles?.some(profile => 
        profile.agent_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [users, searchTerm]);

  // Get user display text
  const getUserDisplayText = (user: User) => {
    const agentName = user.agent_profiles?.[0]?.agent_name;
    return agentName ? `${user.handle} (${agentName})` : user.handle;
  };

  // Get selected users for validation
  const selectedUserAData = users.find(u => u.id === selectedUserA);
  const selectedUserBData = users.find(u => u.id === selectedUserB);

  const canConfirm = selectedUserA && selectedUserB && selectedUserA !== selectedUserB;

  const handleConfirm = () => {
    if (canConfirm && selectedUserAData && selectedUserBData) {
      onConfirm(
        selectedUserA, 
        selectedUserB, 
        selectedUserAData.handle, 
        selectedUserBData.handle
      );
    }
  };

  const handleClose = () => {
    setSelectedUserA('');
    setSelectedUserB('');
    setSearchTerm('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            Run Match on Users
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div>
            <Label className="text-sm font-medium text-gray-300 mb-2 block">
              Search Users
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by handle or agent name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading users...</span>
              </div>
            </div>
          ) : (
            <>
              {/* User A Selection */}
              <div>
                <Label className="text-sm font-medium text-gray-300 mb-2 block">
                  Select User A
                </Label>
                <Select value={selectedUserA} onValueChange={setSelectedUserA}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Choose first user..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600 max-h-60">
                    {filteredUsers.map((user) => (
                      <SelectItem 
                        key={user.id} 
                        value={user.id}
                        className="text-white hover:bg-gray-600"
                        disabled={user.id === selectedUserB}
                      >
                        {getUserDisplayText(user)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User B Selection */}
              <div>
                <Label className="text-sm font-medium text-gray-300 mb-2 block">
                  Select User B
                </Label>
                <Select value={selectedUserB} onValueChange={setSelectedUserB}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Choose second user..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600 max-h-60">
                    {filteredUsers.map((user) => (
                      <SelectItem 
                        key={user.id} 
                        value={user.id}
                        className="text-white hover:bg-gray-600"
                        disabled={user.id === selectedUserA}
                      >
                        {getUserDisplayText(user)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Validation Message */}
              {selectedUserA && selectedUserB && selectedUserA === selectedUserB && (
                <div className="text-red-400 text-sm">
                  Please select two different users.
                </div>
              )}

              {/* Selected Users Summary */}
              {selectedUserAData && selectedUserBData && selectedUserA !== selectedUserB && (
                <div className="p-3 bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-300 mb-1">Match Preview:</div>
                  <div className="text-sm text-white">
                    <span className="font-medium">{selectedUserAData.handle}</span>
                    {' × '}
                    <span className="font-medium">{selectedUserBData.handle}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="border-gray-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Creating Match...
              </>
            ) : (
              'Create Match'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};