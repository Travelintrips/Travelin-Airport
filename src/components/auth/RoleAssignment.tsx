import React, { useState } from "react";
import { assignUserRole } from "@/lib/edgeFunctions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

interface RoleAssignmentProps {
  userId: string;
  currentRoleId?: number;
  onRoleAssigned?: (roleId: number) => void;
}

const RoleAssignment: React.FC<RoleAssignmentProps> = ({
  userId,
  currentRoleId,
  onRoleAssigned,
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState<number | undefined>(
    currentRoleId,
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = (value: string) => {
    setSelectedRoleId(parseInt(value, 10));
  };

  const handleAssignRole = async () => {
    if (!selectedRoleId) {
      toast({
        title: "Error",
        description: "Please select a role",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await assignUserRole(userId, selectedRoleId);

      if (error) {
        toast({
          title: "Error assigning role",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Role assigned successfully",
        description: "The user's role has been updated",
      });

      if (onRoleAssigned) {
        onRoleAssigned(selectedRoleId);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      console.error("Error assigning role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Assign Role</label>
        <Select
          onValueChange={handleRoleChange}
          defaultValue={currentRoleId?.toString()}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Admin</SelectItem>
            <SelectItem value="2">Manager</SelectItem>
            <SelectItem value="3">Supervisor</SelectItem>
            <SelectItem value="4">Staff</SelectItem>
            <SelectItem value="5">HRD</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={handleAssignRole}
        disabled={isLoading || !selectedRoleId}
        className="w-full"
      >
        {isLoading ? "Assigning..." : "Assign Role"}
      </Button>
    </div>
  );
};

export default RoleAssignment;
