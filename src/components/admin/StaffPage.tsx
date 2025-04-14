import React from "react";
import UserManagement from "./UserManagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const StaffPage = () => {
  return (
    <div className="p-8">
      <Card className="bg-white shadow-md border-0 overflow-hidden rounded-xl">
        <CardHeader className="bg-gradient-to-r from-primary-tosca/10 to-primary-dark/10 pb-4">
          <CardTitle className="text-2xl font-bold text-primary-dark">
            Staff Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UserManagement />
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffPage;
