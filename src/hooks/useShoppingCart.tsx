import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

// Types for shopping cart items
export type CartItem = {
  id: string;
  item_type: "baggage" | "airport_transfer" | "car";
  item_id?: string;
  service_name: string;
  price: number;
  details?: any;
  created_at?: string;
};

type ShoppingCartContextType = {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, "id" | "created_at">) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  totalAmount: number;
  checkout: () => Promise<void>;
  isLoading: boolean;
  cartCount: number;
  refetchCartData: () => Promise<void>;
};

const ShoppingCartContext = createContext<ShoppingCartContextType | undefined>(
  undefined,
);

const CART_STORAGE_KEY = "shopping_cart";

export const ShoppingCartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  // Load cart items on mount
  useEffect(() => {
    let isMounted = true;

    const initializeCart = async () => {
      if (!isMounted) return;

      // Check current session first
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user && isMounted) {
        setCurrentUserId(session.user.id);
        await migrateLocalStorageToSupabase(session.user.id);
      }

      if (isMounted) {
        await loadCartItems();
      }
    };

    initializeCart();

    // Listen for auth changes - only on initial session to reduce duplication
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      // Only handle INITIAL_SESSION to reduce duplication
      if (event === "INITIAL_SESSION" && session?.user) {
        // Check if user data has actually changed before updating state
        if (session.user.id !== currentUserId) {
          setCurrentUserId(session.user.id);
          await migrateLocalStorageToSupabase(session.user.id);
          await loadCartItems();
        }
      } else if (event === "SIGNED_IN" && session?.user) {
        // Check if user data has actually changed before updating state
        if (session.user.id !== currentUserId) {
          setCurrentUserId(session.user.id);
          await migrateLocalStorageToSupabase(session.user.id);
          await loadCartItems();
        }
      } else if (event === "SIGNED_OUT") {
        setCurrentUserId(null);
        setCartItems([]); // Clear cart items in state immediately
        setIsLoading(false); // Ensure loading is set to false on sign out
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Listen for force logout events
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "forceLogout") {
        setCartItems([]);
        setCurrentUserId(null);
        setIsLoading(false); // Ensure loading is set to false
        // Clear cart from localStorage as well
        try {
          localStorage.removeItem(CART_STORAGE_KEY);
        } catch (e) {
          console.warn("Error clearing cart from localStorage:", e);
        }
      }
    };

    const handleSignOut = () => {
      console.log("[ShoppingCart] User signed out, clearing cart");
      setCartItems([]);
      setCurrentUserId(null);
      setIsLoading(false); // Ensure loading is set to false
      try {
        localStorage.removeItem(CART_STORAGE_KEY);
      } catch (e) {
        console.warn("Error clearing cart from localStorage:", e);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("userSignedOut", handleSignOut);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("userSignedOut", handleSignOut);
    };
  }, []);

  // Expose loadCartItems function for external use
  const refetchCartData = React.useCallback(async () => {
    console.log("[useShoppingCart] Refetching cart data...");
    await loadCartItems(true); // Force reload
  }, []);

  // Add throttled visibility change listener for refetching when tab becomes active
  useEffect(() => {
    let lastSyncTime = 0;
    const SYNC_THROTTLE = 2000; // Maximum 1 sync per 2 seconds

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && !isLoading) {
        const now = Date.now();

        // Throttle to prevent excessive syncing
        if (now - lastSyncTime < SYNC_THROTTLE) {
          console.log(
            "[useShoppingCart] Sync throttled, skipping visibility change sync",
          );
          return;
        }

        lastSyncTime = now;
        console.log(
          "[useShoppingCart] Tab became visible, checking for cart updates",
        );

        // Check auth state first
        const storedUser = localStorage.getItem("auth_user");
        if (storedUser && !currentUserId) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData && userData.id && userData.email) {
              console.log(
                "[useShoppingCart] Auth state needs restoration, triggering recovery",
              );
              setCurrentUserId(userData.id);
              window.dispatchEvent(
                new CustomEvent("forceSessionRestore", { detail: userData }),
              );
            }
          } catch (error) {
            console.warn("[useShoppingCart] Error parsing stored user:", error);
          }
        }

        // Small delay to ensure auth context is stable
        setTimeout(async () => {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user?.id) {
            console.log(
              "[useShoppingCart] User authenticated with valid ID, loading cart items",
            );
            // Only update if user ID has changed
            if (session.user.id !== currentUserId) {
              setCurrentUserId(session.user.id);
            }
            await loadCartItems();
          } else if (!session?.user && cartItems.length === 0) {
            console.log(
              "[useShoppingCart] No user session, loading guest cart",
            );
            await loadCartItems();
          }
        }, 100);
      }
    };

    // Listen for session restored events with throttling
    const handleSessionRestored = (event: CustomEvent) => {
      console.log(
        "[useShoppingCart] Session restored event received:",
        event.detail,
      );
      const userData = event.detail;
      // Only update if user ID has actually changed and email is present
      if (userData.id && userData.email && userData.id !== currentUserId) {
        console.log(
          "[useShoppingCart] Updating current user ID from restored session",
        );
        setCurrentUserId(userData.id);
        // Reload cart items for the restored user
        setTimeout(() => {
          loadCartItems(true);
        }, 100);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(
      "sessionRestored",
      handleSessionRestored as EventListener,
    );

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(
        "sessionRestored",
        handleSessionRestored as EventListener,
      );
    };
  }, [isLoading, cartItems.length, currentUserId]);

  const loadCartItems = async (forceReload = false) => {
    // Prevent multiple simultaneous loads unless forced
    if (isLoading && !forceReload) {
      console.log(
        "[useShoppingCart] Already loading, skipping duplicate request",
      );
      return;
    }

    console.log("[useShoppingCart] Loading cart items...", { forceReload });
    setIsLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log("[useShoppingCart] Session check:", {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
      });

      if (session?.user) {
        // Load from Supabase for authenticated users
        console.log(
          "[useShoppingCart] Loading from Supabase for user:",
          session.user.id,
        );

        const { data, error } = await supabase
          .from("shopping_cart")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (error) {
          console.error(
            "[useShoppingCart] Error loading cart from Supabase:",
            error,
          );
          // Fallback to localStorage on error
          const localCart = localStorage.getItem(CART_STORAGE_KEY);
          if (localCart) {
            try {
              const parsedCart = JSON.parse(localCart);
              setCartItems(Array.isArray(parsedCart) ? parsedCart : []);
            } catch (parseError) {
              console.error(
                "[useShoppingCart] Error parsing localStorage:",
                parseError,
              );
              setCartItems([]);
            }
          } else {
            setCartItems([]);
          }
          return;
        }

        console.log(
          "[useShoppingCart] Loaded cart items from Supabase:",
          data?.length || 0,
        );

        // Transform data to match CartItem interface
        const transformedItems = (data || []).map((item) => ({
          id: item.id,
          item_type: item.item_type,
          item_id: item.item_id,
          service_name: item.service_name,
          price: item.price,
          details: item.details
            ? typeof item.details === "string"
              ? JSON.parse(item.details)
              : item.details
            : null,
          created_at: item.created_at,
        }));

        setCartItems(transformedItems);
      } else {
        // Load from localStorage for guests
        console.log("[useShoppingCart] Loading from localStorage for guest");
        const localCart = localStorage.getItem(CART_STORAGE_KEY);
        if (localCart) {
          try {
            const parsedCart = JSON.parse(localCart);
            const items = Array.isArray(parsedCart) ? parsedCart : [];
            console.log(
              "[useShoppingCart] Loaded local cart items:",
              items.length,
            );
            setCartItems(items);
          } catch (error) {
            console.error(
              "[useShoppingCart] Error parsing localStorage cart:",
              error,
            );
            localStorage.removeItem(CART_STORAGE_KEY);
            setCartItems([]);
          }
        } else {
          console.log("[useShoppingCart] No local cart found");
          setCartItems([]);
        }
      }
    } catch (error) {
      console.error("[useShoppingCart] Error loading cart items:", error);
      setCartItems([]);
    } finally {
      console.log("[useShoppingCart] Finished loading cart items");
      setIsLoading(false);
    }
  };

  const migrateLocalStorageToSupabase = async (userId: string) => {
    try {
      const localCart = localStorage.getItem(CART_STORAGE_KEY);
      if (!localCart) return;

      const parsedCart = JSON.parse(localCart);
      if (!Array.isArray(parsedCart) || parsedCart.length === 0) return;

      console.log(
        `[useShoppingCart] Migrating ${parsedCart.length} items to Supabase for user:`,
        userId,
      );

      // Insert items to Supabase
      const itemsToInsert = parsedCart.map((item) => ({
        user_id: userId,
        item_type: item.item_type,
        item_id: item.item_id || null,
        service_name: item.service_name,
        price: item.price,
        details:
          typeof item.details === "string"
            ? item.details
            : JSON.stringify(item.details),
        status: "active",
        created_at: item.created_at || new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("shopping_cart")
        .insert(itemsToInsert);

      if (error) {
        console.error(
          "[useShoppingCart] Error migrating cart to Supabase:",
          error,
        );
        return;
      }

      // Clear localStorage after successful migration
      localStorage.removeItem(CART_STORAGE_KEY);
      console.log(
        "[useShoppingCart] Cart migrated successfully from localStorage to Supabase",
      );
    } catch (error) {
      console.error("[useShoppingCart] Error during cart migration:", error);
    }
  };

  const addToCart = async (item: Omit<CartItem, "id" | "created_at">) => {
    console.log("[useShoppingCart] Starting addToCart operation");
    setIsLoading(true);

    try {
      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const newItem: CartItem = {
        ...item,
        id: uuidv4(),
        created_at: new Date().toISOString(),
      };

      if (session?.user) {
        // User is authenticated - save to Supabase
        console.log(
          "[useShoppingCart] Adding to Supabase for authenticated user:",
          session.user.id,
        );

        const insertData = {
          user_id: session.user.id,
          item_type: item.item_type,
          item_id: item.item_id || null,
          service_name: item.service_name,
          price: item.price,
          details:
            typeof item.details === "string"
              ? item.details
              : JSON.stringify(item.details),
          status: "active",
          created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("shopping_cart")
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error("[useShoppingCart] Database error:", error);
          throw error;
        }

        console.log("[useShoppingCart] Successfully added to Supabase");
        setCartItems((prev) => [data, ...prev]);
      } else {
        // Guest user - save to localStorage
        console.log("[useShoppingCart] Adding to localStorage for guest user");
        const updatedCart = [newItem, ...cartItems];
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
        setCartItems(updatedCart);
      }

      // Show success toast
      toast({
        title: "Item ditambahkan ke keranjang",
        description: `${item.service_name} berhasil ditambahkan ke keranjang belanja.`,
      });
    } catch (error) {
      console.error("[useShoppingCart] Error adding item to cart:", error);

      // Fallback to localStorage if Supabase fails
      try {
        console.log("[useShoppingCart] Falling back to localStorage");
        const newItem: CartItem = {
          ...item,
          id: uuidv4(),
          created_at: new Date().toISOString(),
        };
        const updatedCart = [newItem, ...cartItems];
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
        setCartItems(updatedCart);

        toast({
          title: "Item ditambahkan ke keranjang",
          description: `${item.service_name} berhasil ditambahkan ke keranjang belanja (mode offline).`,
        });
      } catch (fallbackError) {
        console.error("[useShoppingCart] Fallback also failed:", fallbackError);
        toast({
          title: "Gagal menambahkan item",
          description: "Terjadi kesalahan saat menambahkan item ke keranjang.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (id: string) => {
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // Remove from Supabase for authenticated users
        const { error } = await supabase
          .from("shopping_cart")
          .delete()
          .eq("id", id)
          .eq("user_id", session.user.id);

        if (error) {
          console.error(
            "[useShoppingCart] Error removing from Supabase:",
            error,
          );
          // Continue with local removal even if Supabase fails
        }
      } else {
        // Remove from localStorage for guests
        const updatedCart = cartItems.filter((item) => item.id !== id);
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
      }

      // Always update local state
      setCartItems((prev) => prev.filter((item) => item.id !== id));

      toast({
        title: "Item dihapus",
        description: "Item berhasil dihapus dari keranjang.",
      });
    } catch (error) {
      console.error("[useShoppingCart] Error removing item from cart:", error);
      toast({
        title: "Gagal menghapus item",
        description: "Terjadi kesalahan saat menghapus item dari keranjang.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // Clear from Supabase for authenticated users
        const { error } = await supabase
          .from("shopping_cart")
          .delete()
          .eq("user_id", session.user.id);

        if (error) {
          console.error(
            "[useShoppingCart] Error clearing cart from Supabase:",
            error,
          );
          // Continue with local clearing even if Supabase fails
        }
      } else {
        // Clear localStorage for guests
        localStorage.removeItem(CART_STORAGE_KEY);
      }

      // Always clear local state
      setCartItems([]);

      // Dispatch event to notify other components that cart has been cleared
      window.dispatchEvent(new CustomEvent("cartCleared"));
      console.log("✅ Cart cleared successfully");
    } catch (error) {
      console.error("[useShoppingCart] Error clearing cart:", error);
      // Still clear local state even if there's an error
      setCartItems([]);
      localStorage.removeItem(CART_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to link payment with booking
  const linkPaymentBooking = async (
    paymentId: string,
    bookingId: string,
    bookingType: string,
  ) => {
    console.log("📦 Linking to payment_bookings:", {
      payment_id: paymentId,
      booking_id: bookingId,
      booking_type: bookingType,
    });

    const { error } = await supabase.from("payment_bookings").insert({
      payment_id: paymentId,
      booking_id: bookingId,
      booking_type: bookingType,
    });

    if (error) {
      console.error("❌ Error linking payment booking:", error);
      throw error;
    }

    console.log("✅ Successfully linked payment booking");
    return true;
  };

  const checkout = async (customerData?: {
    name: string;
    email: string;
    phone: string;
    paymentMethod: string;
    bankDetails?: any;
  }) => {
    if (cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // For guest users, we need customer data
      if (!session?.user && !customerData) {
        throw new Error("Customer information is required for checkout");
      }

      // Validate prices from backend
      const validatedItems = [];
      for (const item of cartItems) {
        // Here you would validate the price against your backend
        // For now, we'll assume the prices are valid
        validatedItems.push(item);
      }

      const totalAmount = validatedItems.reduce(
        (sum, item) => sum + item.price,
        0,
      );

      console.log("💰 Creating payment for total amount:", totalAmount);
      console.log("🛒 Processing", validatedItems.length, "cart items");

      // Create payment record
      const paymentData = {
        user_id: session?.user?.id || null,
        amount: totalAmount,
        payment_method: customerData?.paymentMethod || "pending",
        status: "pending",
        is_partial_payment: "false",
        is_damage_payment: false,
        created_at: new Date().toISOString(),
        // Add customer data for guest users
        ...(customerData &&
          !session?.user && {
            customer_name: customerData.name,
            customer_email: customerData.email,
            customer_phone: customerData.phone,
          }),
      };

      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert(paymentData)
        .select()
        .single();

      if (paymentError) {
        console.error("❌ Error creating payment:", paymentError);
        throw paymentError;
      }

      console.log("✅ Payment created successfully:", payment.id);

      // Process each cart item and create bookings
      const bookingPromises = [];

      for (const item of validatedItems) {
        console.log("🔄 Processing cart item:", {
          type: item.item_type,
          service: item.service_name,
          price: item.price,
        });

        if (item.item_type === "baggage") {
          // Create baggage booking
          const baggageBookingData = {
            booking_id:
              item.item_id ||
              `baggage-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
            customer_name:
              customerData?.name || session?.user?.email || "Guest",
            customer_email: customerData?.email || session?.user?.email || "",
            customer_phone: customerData?.phone || "",
            item_name: item.service_name,
            price: item.price,
            status: "pending",
            // Add other required fields with defaults
            airport: item.details?.airport || "Unknown",
            terminal: item.details?.terminal || "Unknown",
            baggage_size: item.details?.baggage_size || "medium",
            duration: item.details?.duration || 1,
            duration_type: item.details?.duration_type || "days",
            start_date:
              item.details?.start_date ||
              new Date().toISOString().split("T")[0],
            end_date:
              item.details?.end_date ||
              new Date(Date.now() + 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
            customer_id: session?.user?.id || null,
            created_at: new Date().toISOString(),
          };

          const baggagePromise = supabase
            .from("baggage_booking")
            .insert(baggageBookingData)
            .select()
            .single()
            .then(async ({ data: booking, error }) => {
              if (error) {
                console.error("❌ Error creating baggage booking:", error);
                throw error;
              }
              console.log("✅ Baggage booking created:", booking.id);

              // Link to payment_bookings table
              await linkPaymentBooking(
                payment.id,
                booking.id.toString(),
                "baggage",
              );
              return booking;
            });

          bookingPromises.push(baggagePromise);
        } else if (item.item_type === "airport_transfer") {
          // Parse details for airport transfer
          let parsedDetails = item.details;
          if (typeof item.details === "string") {
            try {
              parsedDetails = JSON.parse(item.details);
            } catch (error) {
              console.error("Error parsing airport transfer details:", error);
              parsedDetails = item.details;
            }
          }

          // Create airport transfer booking
          const transferBookingData = {
            customer_name:
              customerData?.name || session?.user?.email || "Guest",
            phone: customerData?.phone || "",
            pickup_location:
              parsedDetails?.fromAddress ||
              parsedDetails?.pickup_location ||
              "Unknown",
            dropoff_location:
              parsedDetails?.toAddress ||
              parsedDetails?.dropoff_location ||
              "Unknown",
            pickup_date:
              parsedDetails?.pickupDate ||
              parsedDetails?.pickup_date ||
              new Date().toISOString().split("T")[0],
            pickup_time:
              parsedDetails?.pickupTime ||
              parsedDetails?.pickup_time ||
              "09:00",
            price: item.price,
            status: "pending",
            customer_id: session?.user?.id || null,
            // Add additional fields from details
            vehicle_name:
              parsedDetails?.vehicleType || parsedDetails?.vehicle_name || null,
            driver_name: parsedDetails?.driver_name || null,
            license_plate: parsedDetails?.license_plate || null,
            distance: parsedDetails?.distance || null,
            duration: parsedDetails?.duration || null,
            type: parsedDetails?.type || "airport_transfer",
            created_at: new Date().toISOString(),
          };

          const transferPromise = supabase
            .from("airport_transfer")
            .insert(transferBookingData)
            .select()
            .single()
            .then(async ({ data: booking, error }) => {
              if (error) {
                console.error(
                  "❌ Error creating airport transfer booking:",
                  error,
                );
                throw error;
              }
              console.log("✅ Airport transfer booking created:", booking.id);

              // Link to payment_bookings table
              await linkPaymentBooking(
                payment.id,
                booking.id.toString(),
                "airport_transfer",
              );
              return booking;
            });

          bookingPromises.push(transferPromise);
        } else if (item.item_type === "car") {
          // Check if this is an existing booking or new booking
          if (item.item_id && !isNaN(Number(item.item_id))) {
            // This is an existing booking, just update payment status
            const carPromise = supabase
              .from("bookings")
              .update({
                payment_status: "paid",
                status: "confirmed",
                payment_id: payment.id,
              })
              .eq("id", item.item_id)
              .select()
              .single()
              .then(async ({ data: booking, error }) => {
                if (error) {
                  console.error("❌ Error updating car booking:", error);
                  throw error;
                }
                console.log("✅ Car booking updated:", booking.id);

                // Link to payment_bookings table
                await linkPaymentBooking(
                  payment.id,
                  booking.id.toString(),
                  "car",
                );
                return booking;
              });

            bookingPromises.push(carPromise);
          } else {
            // Create new car rental booking
            let parsedDetails = item.details;
            if (typeof item.details === "string") {
              try {
                parsedDetails = JSON.parse(item.details);
              } catch (error) {
                console.error("Error parsing car rental details:", error);
                parsedDetails = item.details;
              }
            }

            const carBookingData = {
              customer_id: session?.user?.id || null,
              vehicle_id: parsedDetails?.vehicle_id || item.item_id || null,
              total_amount: item.price,
              start_date:
                parsedDetails?.start_date ||
                new Date().toISOString().split("T")[0],
              end_date:
                parsedDetails?.end_date ||
                new Date(Date.now() + 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0],
              pickup_time: parsedDetails?.pickup_time || "09:00",
              driver_option: parsedDetails?.driver_option || "self",
              status: "confirmed",
              payment_status: "paid",
              payment_id: payment.id,
              vehicle_name: parsedDetails?.vehicle_name || item.service_name,
              vehicle_type: parsedDetails?.vehicle_type || null,
              make: parsedDetails?.make || null,
              model: parsedDetails?.model || null,
              license_plate: parsedDetails?.license_plate || null,
              with_driver: parsedDetails?.with_driver || false,
              created_at: new Date().toISOString(),
            };

            const carPromise = supabase
              .from("bookings")
              .insert(carBookingData)
              .select()
              .single()
              .then(async ({ data: booking, error }) => {
                if (error) {
                  console.error("❌ Error creating car booking:", error);
                  throw error;
                }
                console.log("✅ Car booking created:", booking.id);

                // Link to payment_bookings table
                await linkPaymentBooking(
                  payment.id,
                  booking.id.toString(),
                  "car",
                );
                return booking;
              });

            bookingPromises.push(carPromise);
          }
        }
      }

      // Wait for all bookings to be created
      console.log("⏳ Waiting for all bookings to be processed...");
      const createdBookings = await Promise.all(bookingPromises);
      console.log(
        "✅ All bookings processed successfully:",
        createdBookings.length,
        "bookings",
      );

      // Clear cart after successful payment and booking creation
      console.log("🧹 Clearing cart...");
      await clearCart();
      console.log("✅ Cart cleared successfully");

      // Reset any form states that might be cached
      try {
        // Dispatch event to reset forms
        window.dispatchEvent(new CustomEvent("resetBookingForms"));
        console.log("✅ Booking forms reset event dispatched");
      } catch (error) {
        console.warn("⚠️ Error dispatching form reset event:", error);
      }

      console.log(
        "🎉 Checkout completed successfully! Payment ID:",
        payment.id,
      );
      return payment;
    } catch (error) {
      console.error("Error during checkout:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const totalAmount = cartItems.reduce((sum, item) => sum + item.price, 0);
  const cartCount = cartItems.length;

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    totalAmount,
    checkout,
    isLoading,
    cartCount,
    refetchCartData,
  };

  return (
    <ShoppingCartContext.Provider value={value}>
      {children}
    </ShoppingCartContext.Provider>
  );
};

export const useShoppingCart = () => {
  const context = useContext(ShoppingCartContext);
  if (context === undefined) {
    throw new Error(
      "useShoppingCart must be used within a ShoppingCartProvider",
    );
  }
  return context;
};
