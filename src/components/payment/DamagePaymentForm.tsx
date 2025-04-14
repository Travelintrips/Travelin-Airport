import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { processPayment } from "@/lib/paymentService";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  CreditCard,
  Landmark,
  Banknote,
  CheckCircle,
  AlertCircle,
  DollarSign,
  ArrowLeft,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface DamageItem {
  id: number;
  description: string;
  repair_cost: number;
  severity: string;
  status: string;
  booking_id: number;
  vehicle_id: number;
  payment_status?: string;
  payment_id?: string | null;
  created_at?: string;
}

const damagePaymentSchema = z.object({
  paymentMethod: z.enum(["cash", "bank", "card"], {
    required_error: "Please select a payment method",
  }),
  amount: z.coerce
    .number()
    .min(1, { message: "Amount must be greater than 0" }),
  transactionId: z.string().optional(),
  bankName: z.string().optional(),
  selectedDamages: z.array(z.number()).min(1, {
    message: "Please select at least one damage item",
  }),
});

const DamagePaymentForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { bookingId } = useParams<{ bookingId: string }>();
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [damageItems, setDamageItems] = useState<DamageItem[]>([]);
  const [isLoadingDamages, setIsLoadingDamages] = useState(false);
  const [selectedDamages, setSelectedDamages] = useState<number[]>([]);
  const [bookingDetails, setBookingDetails] = useState<any>(null);

  const form = useForm<z.infer<typeof damagePaymentSchema>>({
    resolver: zodResolver(damagePaymentSchema),
    defaultValues: {
      paymentMethod: "cash",
      amount: 0,
      transactionId: "",
      bankName: "",
      selectedDamages: [],
    },
  });

  const selectedPaymentMethod = form.watch("paymentMethod");

  useEffect(() => {
    const getUserId = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
      }
    };

    const fetchBookingDetails = async () => {
      if (!bookingId) return;

      try {
        const { data, error } = await supabase
          .from("bookings")
          .select("*, user:users(full_name, email)")
          .eq("id", bookingId)
          .single();

        if (error) throw error;
        setBookingDetails(data);
      } catch (err) {
        console.error("Error fetching booking details:", err);
        toast({
          title: "Error",
          description: "Could not fetch booking details",
          variant: "destructive",
        });
      }
    };

    const fetchDamageItems = async () => {
      if (!bookingId) return;

      try {
        setIsLoadingDamages(true);
        const { data, error } = await supabase
          .from("damages")
          .select("*")
          .eq("booking_id", bookingId)
          .eq("payment_status", "unpaid")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setDamageItems(data || []);
      } catch (err) {
        console.error("Error fetching damage items:", err);
        toast({
          title: "Error",
          description: "Could not fetch damage items",
          variant: "destructive",
        });
      } finally {
        setIsLoadingDamages(false);
      }
    };

    getUserId();
    fetchBookingDetails();
    fetchDamageItems();
  }, [bookingId, toast]);

  // Calculate total amount for selected damages
  const calculateSelectedDamagesTotal = () => {
    return damageItems
      .filter((damage) => selectedDamages.includes(damage.id))
      .reduce((sum, damage) => sum + (damage.repair_cost || 0), 0);
  };

  // Handle damage selection
  const handleDamageSelection = (damageId: number, checked: boolean) => {
    if (checked) {
      setSelectedDamages((prev) => [...prev, damageId]);
    } else {
      setSelectedDamages((prev) => prev.filter((id) => id !== damageId));
    }
  };

  // Update form amount when selection changes
  useEffect(() => {
    const total = calculateSelectedDamagesTotal();
    form.setValue("amount", total);
    form.setValue("selectedDamages", selectedDamages);
  }, [selectedDamages, form]);

  const onSubmit = async (values: z.infer<typeof damagePaymentSchema>) => {
    if (isSubmitting) return;
    if (!userId) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to make a payment",
        variant: "destructive",
      });
      return;
    }

    if (!bookingId) {
      toast({
        title: "Error",
        description: "Booking ID is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setIsSubmitting(true);

    try {
      const paymentData = {
        userId,
        bookingId: Number(bookingId),
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        transactionId: values.transactionId || undefined,
        bankName: values.bankName || undefined,
        isDamagePayment: true,
        damageIds: values.selectedDamages,
      };

      const result = await processPayment(paymentData);

      if (result.success) {
        setPaymentSuccess(true);
        toast({
          title: "Payment Successful",
          description: `Your payment of Rp ${values.amount.toLocaleString()} has been processed successfully.`,
          variant: "default",
        });

        // Reset form and selection
        form.reset();
        setSelectedDamages([]);

        // Refresh damage items
        const { data, error } = await supabase
          .from("damages")
          .select("*")
          .eq("booking_id", bookingId)
          .eq("payment_status", "unpaid")
          .order("created_at", { ascending: false });

        if (!error) {
          setDamageItems(data || []);
        }
      } else {
        toast({
          title: "Payment Failed",
          description: `Error: ${result.error?.message || "Unknown error"}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Payment submission error:", error);
      toast({
        title: "Payment Error",
        description: `An unexpected error occurred: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1000);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <h1 className="text-2xl font-bold">Damage Payment</h1>
      </div>

      {bookingDetails && (
        <Card className="w-full max-w-3xl mx-auto bg-background border shadow-md mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Booking Information</CardTitle>
            <CardDescription>
              Booking #{bookingId} - {bookingDetails.user?.full_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <p className="text-sm font-medium">Customer:</p>
              <p className="text-sm">{bookingDetails.user?.full_name}</p>
              <p className="text-sm font-medium">Email:</p>
              <p className="text-sm">{bookingDetails.user?.email}</p>
              <p className="text-sm font-medium">Vehicle ID:</p>
              <p className="text-sm">{bookingDetails.vehicle_id}</p>
              <p className="text-sm font-medium">Status:</p>
              <p className="text-sm">{bookingDetails.status}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="w-full max-w-3xl mx-auto bg-background border shadow-md mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Damage Items</CardTitle>
          <CardDescription>Select the damage items to pay for</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingDamages ? (
            <div className="py-4 text-center">Loading damage items...</div>
          ) : damageItems.length === 0 ? (
            <div className="py-4 text-center">
              No unpaid damage items found for this booking.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Select
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y divide-gray-200">
                    {damageItems.map((damage) => (
                      <tr key={damage.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          <Checkbox
                            id={`damage-${damage.id}`}
                            checked={selectedDamages.includes(damage.id)}
                            onCheckedChange={(checked) =>
                              handleDamageSelection(damage.id, checked === true)
                            }
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {damage.description}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              damage.severity === "minor"
                                ? "bg-yellow-100 text-yellow-800"
                                : damage.severity === "moderate"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {damage.severity?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                          Rp {damage.repair_cost?.toLocaleString() || "0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedDamages.length > 0 && (
                <div className="p-3 bg-muted rounded-md">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Selected Damages Total:</span>
                    <span className="font-bold">
                      Rp {calculateSelectedDamagesTotal().toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="w-full max-w-3xl mx-auto bg-background border shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Payment Details</CardTitle>
          <CardDescription>
            Complete payment for selected damage items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Payment Method</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="cash" />
                          </FormControl>
                          <FormLabel className="font-normal flex items-center">
                            <Banknote className="mr-2 h-4 w-4" />
                            Cash
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="bank" />
                          </FormControl>
                          <FormLabel className="font-normal flex items-center">
                            <Landmark className="mr-2 h-4 w-4" />
                            Bank Transfer
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="card" />
                          </FormControl>
                          <FormLabel className="font-normal flex items-center">
                            <CreditCard className="mr-2 h-4 w-4" />
                            Credit/Debit Card
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (Rp)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        {...field}
                        disabled
                      />
                    </FormControl>
                    <FormDescription>
                      Total amount for selected damage items
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(selectedPaymentMethod === "bank" ||
                selectedPaymentMethod === "card") && (
                <>
                  {selectedPaymentMethod === "bank" && (
                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select bank" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="BCA">
                                  Bank BCA (1111)
                                </SelectItem>
                                <SelectItem value="Mandiri">
                                  Bank Mandiri (2222)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            Select the bank you used for the transfer
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="transactionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {selectedPaymentMethod === "bank"
                            ? "Transfer Reference"
                            : "Card Transaction ID"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={
                              selectedPaymentMethod === "bank"
                                ? "Enter transfer reference"
                                : "Enter transaction ID"
                            }
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {selectedPaymentMethod === "bank"
                            ? "Reference number from your bank transfer"
                            : "Transaction ID from your card payment"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={
                  loading ||
                  isSubmitting ||
                  selectedDamages.length === 0 ||
                  calculateSelectedDamagesTotal() <= 0
                }
              >
                {loading ? "Processing..." : "Complete Payment"}
              </Button>
            </form>
          </Form>

          {paymentSuccess && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-700">Payment processed successfully!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DamagePaymentForm;
