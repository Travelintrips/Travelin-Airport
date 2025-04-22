import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  Car,
  CreditCard,
  FileText,
  Settings,
  User,
  Users,
} from "lucide-react";

interface Booking {
  id: string;
  vehicleName: string;
  startDate: Date;
  endDate: Date;
  status: "active" | "completed" | "cancelled";
  totalAmount: number;
  paymentStatus: "paid" | "partial" | "pending";
  imageUrl: string;
}

interface UserDashboardProps {
  userRole?: "Admin" | "Manager" | "Supervisor" | "Staff" | "HRD";
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  activeBookings?: Booking[];
  bookingHistory?: Booking[];
}

const UserDashboard: React.FC<UserDashboardProps> = ({
  userRole = "Staff",
  userName = "John Doe",
  userEmail = "john.doe@example.com",
  userAvatar = "",
  activeBookings = [
    {
      id: "1",
      vehicleName: "Toyota Avanza",
      startDate: new Date(),
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: "active",
      totalAmount: 450000,
      paymentStatus: "partial",
      imageUrl:
        "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80",
    },
    {
      id: "2",
      vehicleName: "Honda Brio",
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      status: "active",
      totalAmount: 350000,
      paymentStatus: "paid",
      imageUrl:
        "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&q=80",
    },
  ],
  bookingHistory = [
    {
      id: "3",
      vehicleName: "Suzuki Ertiga",
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      status: "completed",
      totalAmount: 500000,
      paymentStatus: "paid",
      imageUrl:
        "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80",
    },
  ],
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [activeTab, setActiveTab] = useState("overview");

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "confirmed":
        return "bg-green-500";
      case "completed":
        return "bg-blue-500";
      case "cancelled":
        return "bg-red-500";
      case "paid":
        return "bg-green-500";
      case "partial":
        return "bg-yellow-500";
      case "pending":
      case "booked":
        return "bg-pink-500";
      case "onride":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="bg-background min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary">
              <AvatarImage src={userAvatar} alt={userName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{userName}</h1>
              <p className="text-muted-foreground">{userEmail}</p>
              <Badge variant="outline" className="mt-1">
                {userRole}
              </Badge>
            </div>
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Settings size={16} />
            Account Settings
          </Button>
        </div>

        <Tabs
          defaultValue="overview"
          className="w-full"
          onValueChange={setActiveTab}
        >
          <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            {(userRole === "Admin" || userRole === "Manager") && (
              <>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Active Bookings</CardTitle>
                  <CardDescription>Currently active rentals</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {activeBookings.length}
                  </div>
                  <Progress
                    value={activeBookings.length > 0 ? 100 : 0}
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Spent</CardTitle>
                  <CardDescription>All time rental expenses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatCurrency(
                      [...activeBookings, ...bookingHistory].reduce(
                        (sum, booking) => sum + booking.totalAmount,
                        0,
                      ),
                    )}
                  </div>
                  <Progress
                    value={
                      [...activeBookings, ...bookingHistory].length > 0 ? 75 : 0
                    }
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Upcoming Returns</CardTitle>
                  <CardDescription>Vehicles due for return</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {
                      activeBookings.filter(
                        (b) =>
                          new Date(b.endDate).getTime() - new Date().getTime() <
                          3 * 24 * 60 * 60 * 1000,
                      ).length
                    }
                  </div>
                  <Progress
                    value={
                      activeBookings.filter(
                        (b) =>
                          new Date(b.endDate).getTime() - new Date().getTime() <
                          3 * 24 * 60 * 60 * 1000,
                      ).length > 0
                        ? 100
                        : 0
                    }
                    className="mt-2"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Active Rentals</CardTitle>
                  <CardDescription>
                    Your currently active vehicle rentals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activeBookings.length > 0 ? (
                    <div className="space-y-4">
                      {activeBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg"
                        >
                          <div className="w-full md:w-1/4 h-40 rounded-md overflow-hidden">
                            <img
                              src={booking.imageUrl}
                              alt={booking.vehicleName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h3 className="text-lg font-semibold">
                                {booking.vehicleName}
                              </h3>
                              <Badge
                                variant={
                                  booking.paymentStatus === "paid"
                                    ? "default"
                                    : "outline"
                                }
                              >
                                {booking.paymentStatus === "paid"
                                  ? "Paid"
                                  : booking.paymentStatus === "partial"
                                    ? "Partially Paid"
                                    : "Payment Pending"}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Rental Period
                                </p>
                                <p className="font-medium">
                                  {formatDate(booking.startDate)} -{" "}
                                  {formatDate(booking.endDate)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Total Amount
                                </p>
                                <p className="font-medium">
                                  {formatCurrency(booking.totalAmount)}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1"
                              >
                                <FileText size={14} />
                                View Details
                              </Button>
                              <Button
                                size="sm"
                                className="flex items-center gap-1"
                                onClick={() => {
                                  if (
                                    booking.status === "approved" &&
                                    booking.pickupStatus === "picked_up"
                                  ) {
                                    window.location.href = `/inspection?vehicleId=${booking.vehicleId}&bookingId=${booking.id}`;
                                  } else {
                                    alert(
                                      "Vehicle must be approved and picked up before inspection",
                                    );
                                  }
                                }}
                              >
                                <Car size={14} />
                                {booking.status === "approved" &&
                                booking.pickupStatus === "picked_up"
                                  ? "Pre-Rental Inspection"
                                  : "Return Vehicle"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Car className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-2 text-lg font-medium">
                        No active rentals
                      </h3>
                      <p className="text-muted-foreground">
                        Book a vehicle to get started
                      </p>
                      <Button className="mt-4">Book a Vehicle</Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Calendar</CardTitle>
                  <CardDescription>Your rental schedule</CardDescription>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                  />
                  <div className="mt-4">
                    <h4 className="font-medium">Upcoming Events</h4>
                    <div className="mt-2 space-y-2">
                      {activeBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted"
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${getStatusColor(booking.status)}`}
                          ></div>
                          <span className="flex-1">
                            {booking.vehicleName} Return
                          </span>
                          <span className="text-muted-foreground">
                            {formatDate(booking.endDate)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Bookings</CardTitle>
                <CardDescription>
                  View and manage all your vehicle rentals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Active Bookings</h3>
                    <select
                      className="p-2 border rounded-md mr-2"
                      onChange={(e) => {
                        const status = e.target.value;
                        // This is a placeholder for actual filtering logic
                        // In a real implementation, you would filter the bookings based on status
                        console.log(`Filter by status: ${status}`);
                      }}
                    >
                      <option value="all">All Status</option>
                      <option value="booked">Booked</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="onride">Onride</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <Button variant="outline" size="sm">
                      Apply Filter
                    </Button>
                  </div>

                  {activeBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg"
                    >
                      <div className="w-full md:w-1/5 h-32 rounded-md overflow-hidden">
                        <img
                          src={booking.imageUrl}
                          alt={booking.vehicleName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-semibold">
                            {booking.vehicleName}
                          </h3>
                          <Badge
                            className={`${booking.status.toLowerCase() === "pending" || booking.status.toLowerCase() === "booked" ? "bg-pink-500" : ""}`}
                          >
                            {booking.status.toLowerCase() === "pending"
                              ? "Booked"
                              : booking.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Rental Period
                            </p>
                            <p className="font-medium">
                              {formatDate(booking.startDate)} -{" "}
                              {formatDate(booking.endDate)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Total Amount
                            </p>
                            <p className="font-medium">
                              {formatCurrency(booking.totalAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Payment Status
                            </p>
                            <p className="font-medium capitalize">
                              {booking.paymentStatus}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                          <Button size="sm">Manage Booking</Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Separator className="my-6" />

                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Booking History</h3>
                  </div>

                  {bookingHistory.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg"
                    >
                      <div className="w-full md:w-1/5 h-32 rounded-md overflow-hidden">
                        <img
                          src={booking.imageUrl}
                          alt={booking.vehicleName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-semibold">
                            {booking.vehicleName}
                          </h3>
                          <Badge variant="outline">{booking.status}</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Rental Period
                            </p>
                            <p className="font-medium">
                              {formatDate(booking.startDate)} -{" "}
                              {formatDate(booking.endDate)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Total Amount
                            </p>
                            <p className="font-medium">
                              {formatCurrency(booking.totalAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Payment Status
                            </p>
                            <p className="font-medium capitalize">
                              {booking.paymentStatus}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline">
                            View Receipt
                          </Button>
                          <Button size="sm" variant="outline">
                            Book Again
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  View all your payment transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...activeBookings, ...bookingHistory].map((booking) => (
                    <div
                      key={booking.id}
                      className="flex justify-between items-center p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-full bg-muted">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {booking.vehicleName} Rental
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(booking.startDate)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(booking.totalAmount)}
                        </p>
                        <Badge
                          variant={
                            booking.paymentStatus === "paid"
                              ? "default"
                              : "outline"
                          }
                          className="mt-1"
                        >
                          {booking.paymentStatus === "paid"
                            ? "Paid"
                            : booking.paymentStatus === "partial"
                              ? "Partially Paid"
                              : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Manage your personal information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="md:w-1/3 flex flex-col items-center">
                    <Avatar className="h-32 w-32 border-2 border-primary">
                      <AvatarImage src={userAvatar} alt={userName} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                        {getInitials(userName)}
                      </AvatarFallback>
                    </Avatar>
                    <Button variant="outline" className="mt-4">
                      Change Photo
                    </Button>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Full Name</label>
                        <input
                          type="text"
                          className="w-full p-2 mt-1 border rounded-md"
                          value={userName}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <input
                          type="email"
                          className="w-full p-2 mt-1 border rounded-md"
                          value={userEmail}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Role</label>
                        <input
                          type="text"
                          className="w-full p-2 mt-1 border rounded-md"
                          value={userRole}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          className="w-full p-2 mt-1 border rounded-md"
                          placeholder="+62 XXX XXXX XXXX"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Address</label>
                      <textarea
                        className="w-full p-2 mt-1 border rounded-md h-24"
                        placeholder="Enter your address"
                      ></textarea>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline">Cancel</Button>
                      <Button>Save Changes</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {(userRole === "Admin" || userRole === "Manager") && (
            <>
              <TabsContent value="users" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>User Management</CardTitle>
                      <CardDescription>
                        Manage system users and their roles
                      </CardDescription>
                    </div>
                    <Button className="flex items-center gap-1">
                      <User size={16} />
                      Add User
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Search users..."
                            className="p-2 border rounded-md w-64"
                          />
                          <Button variant="outline">Search</Button>
                        </div>
                        <div className="flex gap-2">
                          <select className="p-2 border rounded-md">
                            <option>All Roles</option>
                            <option>Admin</option>
                            <option>Manager</option>
                            <option>Supervisor</option>
                            <option>Staff</option>
                            <option>HRD</option>
                          </select>
                          <Button variant="outline">Filter</Button>
                        </div>
                      </div>

                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-3 text-left">Name</th>
                              <th className="p-3 text-left">Email</th>
                              <th className="p-3 text-left">Role</th>
                              <th className="p-3 text-left">Status</th>
                              <th className="p-3 text-left">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-t">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>JD</AvatarFallback>
                                  </Avatar>
                                  <span>John Doe</span>
                                </div>
                              </td>
                              <td className="p-3">john.doe@example.com</td>
                              <td className="p-3">Admin</td>
                              <td className="p-3">
                                <Badge variant="default">Active</Badge>
                              </td>
                              <td className="p-3">
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline">
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-500"
                                  >
                                    Disable
                                  </Button>
                                </div>
                              </td>
                            </tr>
                            <tr className="border-t">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>JS</AvatarFallback>
                                  </Avatar>
                                  <span>Jane Smith</span>
                                </div>
                              </td>
                              <td className="p-3">jane.smith@example.com</td>
                              <td className="p-3">Manager</td>
                              <td className="p-3">
                                <Badge variant="default">Active</Badge>
                              </td>
                              <td className="p-3">
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline">
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-500"
                                  >
                                    Disable
                                  </Button>
                                </div>
                              </td>
                            </tr>
                            <tr className="border-t">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>RJ</AvatarFallback>
                                  </Avatar>
                                  <span>Robert Johnson</span>
                                </div>
                              </td>
                              <td className="p-3">robert.j@example.com</td>
                              <td className="p-3">Staff</td>
                              <td className="p-3">
                                <Badge variant="outline">Inactive</Badge>
                              </td>
                              <td className="p-3">
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline">
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-500"
                                  >
                                    Enable
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                          Showing 3 of 24 users
                        </p>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" disabled>
                            Previous
                          </Button>
                          <Button size="sm" variant="outline">
                            1
                          </Button>
                          <Button size="sm" variant="outline">
                            2
                          </Button>
                          <Button size="sm" variant="outline">
                            3
                          </Button>
                          <Button size="sm" variant="outline">
                            Next
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="vehicles" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Vehicle Inventory</CardTitle>
                      <CardDescription>
                        Manage your vehicle fleet
                      </CardDescription>
                    </div>
                    <Button className="flex items-center gap-1">
                      <Car size={16} />
                      Add Vehicle
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Search vehicles..."
                            className="p-2 border rounded-md w-64"
                          />
                          <Button variant="outline">Search</Button>
                        </div>
                        <div className="flex gap-2">
                          <select className="p-2 border rounded-md">
                            <option>All Types</option>
                            <option>Sedan</option>
                            <option>SUV</option>
                            <option>MPV</option>
                            <option>Hatchback</option>
                          </select>
                          <select className="p-2 border rounded-md">
                            <option>All Status</option>
                            <option>Available</option>
                            <option>Rented</option>
                            <option>Maintenance</option>
                          </select>
                          <Button variant="outline">Filter</Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="border rounded-lg overflow-hidden">
                          <div className="h-48 overflow-hidden">
                            <img
                              src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80"
                              alt="Toyota Avanza"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-4">
                            <div className="flex justify-between items-start">
                              <h3 className="font-semibold">Toyota Avanza</h3>
                              <Badge>Available</Badge>
                            </div>
                            <div className="mt-2">
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  Type:
                                </span>{" "}
                                MPV
                              </p>
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  Rate:
                                </span>{" "}
                                {formatCurrency(150000)}/day
                              </p>
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  License:
                                </span>{" "}
                                B 1234 XYZ
                              </p>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button size="sm" variant="outline">
                                Edit
                              </Button>
                              <Button size="sm">View Details</Button>
                            </div>
                          </div>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                          <div className="h-48 overflow-hidden">
                            <img
                              src="https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&q=80"
                              alt="Honda Brio"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-4">
                            <div className="flex justify-between items-start">
                              <h3 className="font-semibold">Honda Brio</h3>
                              <Badge variant="outline">Rented</Badge>
                            </div>
                            <div className="mt-2">
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  Type:
                                </span>{" "}
                                Hatchback
                              </p>
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  Rate:
                                </span>{" "}
                                {formatCurrency(120000)}/day
                              </p>
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  License:
                                </span>{" "}
                                B 5678 ABC
                              </p>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button size="sm" variant="outline">
                                Edit
                              </Button>
                              <Button size="sm">View Details</Button>
                            </div>
                          </div>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                          <div className="h-48 overflow-hidden">
                            <img
                              src="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80"
                              alt="Suzuki Ertiga"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-4">
                            <div className="flex justify-between items-start">
                              <h3 className="font-semibold">Suzuki Ertiga</h3>
                              <Badge variant="destructive">Maintenance</Badge>
                            </div>
                            <div className="mt-2">
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  Type:
                                </span>{" "}
                                MPV
                              </p>
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  Rate:
                                </span>{" "}
                                {formatCurrency(140000)}/day
                              </p>
                              <p className="text-sm">
                                <span className="text-muted-foreground">
                                  License:
                                </span>{" "}
                                B 9012 DEF
                              </p>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button size="sm" variant="outline">
                                Edit
                              </Button>
                              <Button size="sm">View Details</Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                          Showing 3 of 15 vehicles
                        </p>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" disabled>
                            Previous
                          </Button>
                          <Button size="sm" variant="outline">
                            1
                          </Button>
                          <Button size="sm" variant="outline">
                            2
                          </Button>
                          <Button size="sm" variant="outline">
                            3
                          </Button>
                          <Button size="sm" variant="outline">
                            Next
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default UserDashboard;
