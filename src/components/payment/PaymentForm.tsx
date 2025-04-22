import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { processPayment } from "@/lib/paymentService";
import { supabase } from "@/lib/supabase";
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
import { Switch } from "@/components/ui/switch";
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
  Clipboard,
} from "lucide-react";
import PaymentDetails from "./PaymentDetails";
import { Checkbox } from "@/components/ui/checkbox";

interface PaymentFormProps {
  bookingId: number;
  totalAmount: number;
  damageAmount?: number;
  onPaymentComplete?: (data: any) => void;
}

interface DamageItem {
  id: number;
  description: string;
  amount: number;
  status: string;
  booking_id: number;
  payment_status: string;
  payment_id?: string | null;
  created_at?: string;
}

const paymentSchema = z.object({
  paymentMethod: z.enum(["cash", "bank", "card"], {
    required_error: "Please select a payment method",
  }),
  amount: z.coerce
    .number()
    .min(1, { message: "Amount must be greater than 0" }),
  transactionId: z.string().optional(),
  bankName: z.string().optional(),
  isPartialPayment: z.boolean().default(false),
  isDamagePayment: z.boolean().default(false),
  selectedDamages: z.array(z.number()).optional(),
});

const PaymentForm: React.FC<PaymentFormProps> = ({
  bookingId,
  totalAmount,
  damageAmount = 0,
  onPaymentComplete,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [damageDetails, setDamageDetails] = useState<DamageItem[]>([]);
  const [isLoadingDamages, setIsLoadingDamages] = useState(false);
  const [selectedDamages, setSelectedDamages] = useState<number[]>([]);
  const [isDamagePaymentMode, setIsDamagePaymentMode] = useState(false);

  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: "cash",
      amount: totalAmount,
      transactionId: "",
      bankName: "",
      isPartialPayment: false,
      isDamagePayment: false,
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

    const fetchDamageDetails = async () => {
      if (!bookingId) return;

      try {
        setIsLoadingDamages(true);
        const { data, error } = await supabase
          .from("damages")
          .select("*")
          .eq("booking_id", bookingId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setDamageDetails(data || []);
      } catch (err) {
        console.error("Error fetching damage details:", err);
      } finally {
        setIsLoadingDamages(false);
      }
    };

    getUserId();
    fetchDamageDetails();
  }, [bookingId]);

  const onSubmit = async (values: z.infer<typeof paymentSchema>) => {
    // Prevent duplicate submissions
    if (isSubmitting) return;
    if (!userId) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to make a payment",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setIsSubmitting(true);

    try {
      const paymentData: any = {
        userId,
        bookingId,
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        transactionId: values.transactionId || undefined,
        bankName: values.bankName || undefined,
        isPartialPayment: values.isPartialPayment,
      };

      // If this is a damage payment, add the damage IDs
      if (isDamagePaymentMode && selectedDamages.length > 0) {
        paymentData.isDamagePayment = true;
        paymentData.damageIds = selectedDamages;
      }

      const result = await processPayment(paymentData);

      if (result.success) {
        setPaymentSuccess(true);
        toast({
          title: "Payment Successful",
          description: `Your payment of Rp ${values.amount.toLocaleString()} has been processed successfully.`,
          variant: "default",
        });

        // Refresh payment details and damage list
        setRefreshKey((prev) => prev + 1);
        fetchDamageDetails();

        // Call the callback if provided
        if (onPaymentComplete) {
          onPaymentComplete(result.data);
        }

        // Reset form and selection
        form.reset();
        setSelectedDamages([]);
        setIsDamagePaymentMode(false);
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
      // Add a small delay before allowing resubmission to prevent accidental double-clicks
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1000);
    }
  };

  // Function to fetch damage details
  const fetchDamageDetails = async () => {
    if (!bookingId) return;

    try {
      setIsLoadingDamages(true);
      // Ensure bookingId is a valid number before querying
      const bookingIdNum = Number(bookingId);
      if (isNaN(bookingIdNum)) {
        console.error("Invalid booking ID for damage details:", bookingId);
        return;
      }

      const { data, error } = await supabase
        .from("damages")
        .select("*")
        .eq("booking_id", bookingIdNum)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDamageDetails(data || []);
    } catch (err) {
      console.error("Error fetching damage details:", err);
    } finally {
      setIsLoadingDamages(false);
    }
  };

  // Handle damage selection
  const handleDamageSelection = (damageId: number, checked: boolean) => {
    if (checked) {
      setSelectedDamages((prev) => [...prev, damageId]);
    } else {
      setSelectedDamages((prev) => prev.filter((id) => id !== damageId));
    }
  };

  // Calculate total amount for selected damages
  const calculateSelectedDamagesTotal = () => {
    return damageDetails
      .filter((damage) => selectedDamages.includes(damage.id))
      .reduce((sum, damage) => sum + (damage.amount || 0), 0);
  };

  // Toggle between regular payment and damage payment modes
  const toggleDamagePaymentMode = () => {
    const newMode = !isDamagePaymentMode;
    setIsDamagePaymentMode(newMode);

    if (newMode) {
      // If switching to damage payment mode, update the amount to the total of selected damages
      const damageTotal = calculateSelectedDamagesTotal();
      form.setValue("amount", damageTotal > 0 ? damageTotal : 0);
      form.setValue("isDamagePayment", true);
    } else {
      // If switching back to regular payment mode, reset to booking amount
      form.setValue("amount", totalAmount);
      form.setValue("isDamagePayment", false);
      setSelectedDamages([]);
    }
  };

  return (
    <div className="space-y-8">
      <PaymentDetails bookingId={bookingId} key={refreshKey} />

      {damageDetails.length > 0 && (
        <Card className="w-full max-w-3xl mx-auto bg-background border shadow-md mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Damage Fees</CardTitle>
              <CardDescription>
                Damage fees associated with this booking
              </CardDescription>
            </div>
            <Button
              variant={isDamagePaymentMode ? "default" : "outline"}
              onClick={toggleDamagePaymentMode}
              className="flex items-center gap-2"
            >
              <DollarSign className="h-4 w-4" />
              {isDamagePaymentMode
                ? "Cancel Damage Payment"
                : "Pay Damage Fees"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-muted">
                  <tr>
                    {isDamagePaymentMode && (
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Select
                      </th>
                    )}
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-gray-200">
                  {isLoadingDamages ? (
                    <tr>
                      <td
                        colSpan={isDamagePaymentMode ? 4 : 3}
                        className="px-4 py-4 text-center"
                      >
                        Loading damage details...
                      </td>
                    </tr>
                  ) : damageDetails.length > 0 ? (
                    damageDetails.map((damage, index) => (
                      <tr
                        key={damage.id || index}
                        className={
                          damage.payment_status === "paid" ? "bg-green-50" : ""
                        }
                      >
                        {isDamagePaymentMode && (
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            <Checkbox
                              id={`damage-${damage.id}`}
                              disabled={damage.payment_status === "paid"}
                              checked={selectedDamages.includes(damage.id)}
                              onCheckedChange={(checked) =>
                                handleDamageSelection(
                                  damage.id,
                                  checked === true,
                                )
                              }
                            />
                          </td>
                        )}
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {damage.description || "Damage fee"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                          Rp {damage.amount?.toLocaleString() || "0"}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              damage.payment_status === "paid"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {damage.payment_status?.toUpperCase() || "PENDING"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={isDamagePaymentMode ? 4 : 3}
                        className="px-4 py-4 text-center text-muted-foreground"
                      >
                        No damage fees found for this booking.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {isDamagePaymentMode && selectedDamages.length > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-md">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Selected Damages Total:</span>
                  <span className="font-bold">
                    Rp {calculateSelectedDamagesTotal().toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="w-full max-w-3xl mx-auto bg-background border shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            {isDamagePaymentMode ? "Pay Damage Fees" : "Make a Payment"}
          </CardTitle>
          <CardDescription>
            {isDamagePaymentMode
              ? "Complete payment for selected damage fees"
              : "Complete your booking by making a payment"}
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

              <div className="space-y-4">
                {!isDamagePaymentMode && (
                  <FormField
                    control={form.control}
                    name="isPartialPayment"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Partial Payment</FormLabel>
                          <FormDescription>
                            Pay a down payment now and the rest later
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

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
                        />
                      </FormControl>
                      <FormDescription>
                        <div>
                          {!isDamagePaymentMode ? (
                            <div className="space-y-1">
                              <div>
                                Booking amount: Rp{" "}
                                {totalAmount.toLocaleString()}
                              </div>
                              {damageAmount > 0 && (
                                <div>
                                  Damage fees: Rp{" "}
                                  {damageAmount.toLocaleString()}
                                </div>
                              )}
                              <div className="font-semibold">
                                Total amount: Rp{" "}
                                {(totalAmount + damageAmount).toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="font-semibold">
                                Selected damage fees: Rp{" "}
                                {calculateSelectedDamagesTotal().toLocaleString()}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {selectedDamages.length} item(s) selected
                              </div>
                            </div>
                          )}
                        </div>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                  (isDamagePaymentMode && selectedDamages.length === 0)
                }
              >
                {loading
                  ? "Processing..."
                  : isDamagePaymentMode
                    ? "Pay Selected Damage Fees"
                    : "Complete Payment"}
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

export default PaymentForm;
