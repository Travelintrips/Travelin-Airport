import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plane, RefreshCw, Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface AirportTransfer {
  id: string;
  created_at: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_date: string;
  pickup_time: string;
  passenger_count: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: string;
  payment_status: string;
  price: number;
  customer_id: string | null;
  airport_transfer_payments?: {
    payment_method: string;
    status: string;
    amount: number;
  } | null;
}

const AirportTransferManagement = () => {
  const [transfers, setTransfers] = useState<AirportTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("airport_transfer")
        .select(
          `
      *,
      airport_transfer_payments (
        payment_method,
        status_payment,
        amount
      )
    `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching airport transfers:", error);
        return;
      }

      // ✅ Pindahkan log di sini
      console.log("Transfer data:", data);
      setTransfers(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "";
    const [hour, minute] = timeString.split(":");
    return `${hour}:${minute}`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const filteredTransfers = transfers.filter(
    (transfer) =>
      transfer.customer_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transfer.pickup_location
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transfer.dropoff_location
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transfer.customer_email
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transfer.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold">
            Airport Transfer Management
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transfers..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTransfers}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p>Loading airport transfers...</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Pickup Location</TableHead>
                    <TableHead>Dropoff Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Passengers</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-24 text-center">
                        No airport transfers found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell className="font-medium">
                          {typeof transfer.id === "string"
                            ? transfer.id.substring(0, 8) + "..."
                            : transfer.id}
                        </TableCell>
                        <TableCell>{transfer.customer_name}</TableCell>
                        <TableCell>{transfer.pickup_location}</TableCell>
                        <TableCell>{transfer.dropoff_location}</TableCell>
                        <TableCell>
                          {formatDate(transfer.pickup_date)}
                        </TableCell>
                        <TableCell>
                          {formatTime(transfer.pickup_time)}
                        </TableCell>
                        <TableCell className="text-center">
                          {transfer.passenger}
                        </TableCell>

                        <TableCell>{formatPrice(transfer.price)}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              transfer.status === "confirmed"
                                ? "bg-green-100 text-green-800"
                                : transfer.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : transfer.status === "cancelled"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {transfer.status || "pending"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {transfer.airport_transfer_payments?.[0]
                            ?.payment_method || (
                            <span className="text-xs text-gray-400">
                              No method
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          {transfer.airport_transfer_payments?.[0]
                            ?.status_payment ? (
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                transfer.airport_transfer_payments[0]
                                  .status_payment === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {
                                transfer.airport_transfer_payments[0]
                                  .status_payment
                              }
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              No payment
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AirportTransferManagement;
