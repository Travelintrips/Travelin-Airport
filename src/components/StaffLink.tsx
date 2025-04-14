import React from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StaffLinkProps {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  className?: string;
}

const StaffLink = ({
  variant = "default",
  size = "default",
  showIcon = true,
  className = "",
}: StaffLinkProps) => {
  return (
    <Button variant={variant} size={size} asChild className={className}>
      <Link to="/admin/staff" className="flex items-center">
        {showIcon && <Users className="mr-2 h-4 w-4" />}
        Manage Staff
      </Link>
    </Button>
  );
};

export default StaffLink;
