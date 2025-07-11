import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Search,
  RefreshCw,
  FileDown,
  Eye,
  Edit,
  Trash2,
  Users,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface HandlingBooking {
  id: string;
  booking_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  passenger_area: string;
  pickup_area: string;
  flight_number: string;
  travel_type: string;
  pickup_date: string;
  pickup_time: string;
  category: string;
  passengers: number;
  price: number;
  status: string;
  created_at: string;
  updated_at?: string;
}

const HandlingServiceManagement = () => {
  const [bookings, setBookings] = useState<HandlingBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<HandlingBooking[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] =
    useState<HandlingBooking | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("handling_bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBookings(data || []);
      setFilteredBookings(data || []);
    } catch (error) {
      console.error("Error fetching handling bookings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch handling bookings",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredBookings(bookings);
      return;
    }

    const lowercasedSearch = searchQuery.toLowerCase();
    const filtered = bookings.filter(
      (booking) =>
        booking.customer_name.toLowerCase().includes(lowercasedSearch) ||
        booking.customer_email.toLowerCase().includes(lowercasedSearch) ||
        booking.customer_phone.toLowerCase().includes(lowercasedSearch) ||
        booking.booking_id.toLowerCase().includes(lowercasedSearch) ||
        booking.passenger_area.toLowerCase().includes(lowercasedSearch) ||
        booking.pickup_area.toLowerCase().includes(lowercasedSearch) ||
        booking.flight_number.toLowerCase().includes(lowercasedSearch) ||
        booking.travel_type.toLowerCase().includes(lowercasedSearch) ||
        booking.category.toLowerCase().includes(lowercasedSearch) ||
        booking.status.toLowerCase().includes(lowercasedSearch),
    );

    setFilteredBookings(filtered);
  }, [searchQuery, bookings]);

  const handleViewDetails = (booking: HandlingBooking) => {
    setSelectedBooking(booking);
    setIsDetailsOpen(true);
  };

  const handleDeleteBooking = async () => {
    if (!selectedBooking) return;

    try {
      const { error } = await supabase
        .from("handling_bookings")
        .delete()
        .eq("id", selectedBooking.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Handling booking deleted successfully",
      });

      setIsDeleteOpen(false);
      setSelectedBooking(null);
      fetchBookings();
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete handling booking",
      });
    }
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("handling_bookings")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Status updated to ${newStatus}`,
      });

      fetchBookings();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update status",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case "completed":
        return <Badge className="bg-blue-500">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP");
    } catch (e) {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string, timeString?: string) => {
    try {
      const date = new Date(dateString);
      if (timeString) {
        const [hours, minutes] = timeString.split(":");
        date.setHours(parseInt(hours), parseInt(minutes));
      }
      return format(date, "PPP p");
    } catch (e) {
      return dateString;
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      [
        "Booking ID",
        "Customer Name",
        "Email",
        "Phone",
        "Passenger Area",
        "Pickup Area",
        "Flight Number",
        "Travel Type",
        "Pickup Date",
        "Pickup Time",
        "Category",
        "Status",
        "Created At",
      ],
      ...filteredBookings.map((booking) => [
        booking.booking_id,
        booking.customer_name,
        booking.customer_email,
        booking.customer_phone,
        booking.passenger_area,
        booking.pickup_area,
        booking.flight_number,
        booking.travel_type,
        booking.pickup_date,
        booking.pickup_time,
        booking.category,
        booking.status,
        booking.created_at,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "handling_bookings.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-6 bg-white">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">
                Handling Service Management
              </CardTitle>
              <CardDescription>
                Manage all passenger handling service bookings
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search bookings..."
                  className="pl-8 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchBookings}
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={exportToCSV}
                title="Export CSV"
              >
                <FileDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="py-3 px-4 text-left font-medium">
                      Booking ID
                    </th>
                    <th className="py-3 px-4 text-left font-medium">
                      Customer
                    </th>
                    <th className="py-3 px-4 text-left font-medium">
                      Passenger Area
                    </th>
                    <th className="py-3 px-4 text-left font-medium">
                      Pickup Area
                    </th>
                    <th className="py-3 px-4 text-left font-medium">
                      Flight Number
                    </th>
                    <th className="py-3 px-4 text-left font-medium">
                      Travel Type
                    </th>
                    <th className="py-3 px-4 text-left font-medium">
                      Pickup Date
                    </th>
                    <th className="py-3 px-4 text-left font-medium">
                      Pickup Time
                    </th>
                    <th className="py-3 px-4 text-left font-medium">
                      Category
                    </th>
                    <th className="py-3 px-4 text-left font-medium">Status</th>
                    <th className="py-3 px-4 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="py-6 text-center">
                        Loading bookings...
                      </td>
                    </tr>
                  ) : filteredBookings.length > 0 ? (
                    filteredBookings.map((booking) => (
                      <tr
                        key={booking.id}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-sm">
                          {booking.booking_id}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">
                              {booking.customer_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {booking.customer_email}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">{booking.passenger_area}</td>
                        <td className="py-3 px-4">{booking.pickup_area}</td>
                        <td className="py-3 px-4 font-medium">
                          {booking.flight_number}
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize">
                            {booking.travel_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {formatDate(booking.pickup_date)}
                        </td>
                        <td className="py-3 px-4">{booking.pickup_time}</td>
                        <td className="py-3 px-4">
                          <span className="capitalize">{booking.category}</span>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(booking.status)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(booking)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {booking.status === "pending" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() =>
                                    handleUpdateStatus(booking.id, "confirmed")
                                  }
                                >
                                  Confirm
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() =>
                                    handleUpdateStatus(booking.id, "cancelled")
                                  }
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                            {booking.status === "confirmed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() =>
                                  handleUpdateStatus(booking.id, "completed")
                                }
                              >
                                Complete
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => {
                                setSelectedBooking(booking);
                                setIsDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={11}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No handling bookings found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Handling Service Booking Details</DialogTitle>
            <DialogDescription>
              Complete information about the handling service booking
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Customer Information
                  </h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {selectedBooking.customer_name}
                    </p>
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span className="font-medium">Email:</span>{" "}
                      {selectedBooking.customer_email}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span className="font-medium">Phone:</span>{" "}
                      {selectedBooking.customer_phone}
                    </p>
                    <p>
                      <span className="font-medium">Flight:</span>{" "}
                      {selectedBooking.flight_number}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Service Information
                  </h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Passenger Area:</span>{" "}
                      {selectedBooking.passenger_area}
                    </p>
                    <p>
                      <span className="font-medium">Pickup Area:</span>{" "}
                      {selectedBooking.pickup_area}
                    </p>
                    <p>
                      <span className="font-medium">Travel Type:</span>{" "}
                      <span className="capitalize">
                        {selectedBooking.travel_type}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium">Category:</span>{" "}
                      <span className="capitalize">
                        {selectedBooking.category}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium">Passengers:</span>{" "}
                      {selectedBooking.passengers}
                    </p>
                    <p>
                      <span className="font-medium">Price:</span>{" "}
                      {formatCurrency(selectedBooking.price)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Schedule Information
                  </h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Pickup Date:</span>{" "}
                      {formatDate(selectedBooking.pickup_date)}
                    </p>
                    <p>
                      <span className="font-medium">Pickup Time:</span>{" "}
                      {selectedBooking.pickup_time}
                    </p>
                    <p>
                      <span className="font-medium">Status:</span>{" "}
                      {getStatusBadge(selectedBooking.status)}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Booking Information
                  </h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Booking ID:</span>{" "}
                      <span className="font-mono text-sm">
                        {selectedBooking.booking_id}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium">Created:</span>{" "}
                      {formatDate(selectedBooking.created_at)}
                    </p>
                    {selectedBooking.updated_at && (
                      <p>
                        <span className="font-medium">Updated:</span>{" "}
                        {formatDate(selectedBooking.updated_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Handling Service Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this handling service booking?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="py-4">
              <p>
                <span className="font-medium">Booking ID:</span>{" "}
                {selectedBooking.booking_id}
              </p>
              <p>
                <span className="font-medium">Customer:</span>{" "}
                {selectedBooking.customer_name}
              </p>
              <p>
                <span className="font-medium">Category:</span>{" "}
                <span className="capitalize">{selectedBooking.category}</span>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteBooking}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HandlingServiceManagement;
