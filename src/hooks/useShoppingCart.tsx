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

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === "SIGNED_IN" && session?.user) {
        setCurrentUserId(session.user.id);
        await migrateLocalStorageToSupabase(session.user.id);
        await loadCartItems();
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

  // Add visibility change listener for refetching when tab becomes active
  useEffect(() => {
    let hasFetched = false;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && !isLoading && !hasFetched) {
        console.log(
          "[useShoppingCart] Tab became visible, checking for cart updates",
        );
        hasFetched = true;

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
            setCurrentUserId(session.user.id);
            await loadCartItems();
          } else if (!session?.user && cartItems.length === 0) {
            console.log(
              "[useShoppingCart] No user session, loading guest cart",
            );
            await loadCartItems();
          }

          // Reset flag after a delay to allow future visibility changes
          setTimeout(() => {
            hasFetched = false;
          }, 2000);
        }, 100);
      }
    };

    // Listen for session restored events
    const handleSessionRestored = (event: CustomEvent) => {
      console.log(
        "[useShoppingCart] Session restored event received:",
        event.detail,
      );
      const userData = event.detail;
      if (userData.id && userData.id !== currentUserId) {
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
    // Check if auth context is ready before loading cart
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // For authenticated users, wait for userId and userEmail to be available
    if (
      session?.user &&
      (!currentUserId || !localStorage.getItem("userEmail"))
    ) {
      console.log(
        "[useShoppingCart] Auth context not ready, delaying cart load",
      );
      return;
    }

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
        // Load from Supabase for logged-in users
        console.log(
          "[useShoppingCart] Loading from Supabase for user:",
          session.user.id,
        );
        const { data, error } = await supabase
          .from("shopping_cart")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error(
            "[useShoppingCart] Error loading cart from Supabase:",
            error,
          );
          setCartItems([]);
          return;
        }

        console.log("[useShoppingCart] Loaded cart items:", data?.length || 0);
        setCartItems(data || []);
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
      setCartItems([]); // Reset cart items on error
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

      // Insert items to Supabase
      const itemsToInsert = parsedCart.map((item) => ({
        user_id: userId,
        item_type: item.item_type,
        item_id: item.item_id,
        service_name: item.service_name,
        price: item.price,
        details: item.details, // Include details field
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("shopping_cart")
        .insert(itemsToInsert);

      if (error) {
        console.error("Error migrating cart to Supabase:", error);
        return;
      }

      // Clear localStorage after successful migration
      localStorage.removeItem(CART_STORAGE_KEY);
      console.log("Cart migrated successfully from localStorage to Supabase");
    } catch (error) {
      console.error("Error during cart migration:", error);
    }
  };

  const addToCart = async (item: Omit<CartItem, "id" | "created_at">) => {
    console.log("[useShoppingCart] Starting addToCart operation");

    // Enhanced session validation with retry
    let sessionValidated = false;
    let validationAttempts = 0;
    const maxValidationAttempts = 3;
    let validSession = null;

    while (validationAttempts < maxValidationAttempts && !sessionValidated) {
      validationAttempts++;
      console.log(
        `[useShoppingCart] Session validation attempt ${validationAttempts}`,
      );

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.warn(
            `[useShoppingCart] Session error on attempt ${validationAttempts}:`,
            error,
          );
        } else if (session?.user) {
          validSession = session;
          sessionValidated = true;
          console.log(
            `[useShoppingCart] Valid session found on attempt ${validationAttempts}`,
          );
          break;
        } else {
          console.log(
            `[useShoppingCart] No session on attempt ${validationAttempts}, checking localStorage`,
          );
          // Check if we have localStorage auth for guest operations
          const storedUser = localStorage.getItem("auth_user");
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              if (userData && userData.id && userData.email) {
                console.log(
                  `[useShoppingCart] Found valid localStorage auth on attempt ${validationAttempts}`,
                );
                sessionValidated = true;
                break;
              }
            } catch (parseError) {
              console.warn(
                `[useShoppingCart] Error parsing localStorage on attempt ${validationAttempts}:`,
                parseError,
              );
            }
          }
        }

        // Wait before retry
        if (validationAttempts < maxValidationAttempts && !sessionValidated) {
          console.log(`[useShoppingCart] Waiting 800ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      } catch (sessionError) {
        console.error(
          `[useShoppingCart] Session check attempt ${validationAttempts} failed:`,
          sessionError,
        );
        if (validationAttempts < maxValidationAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    }

    if (!sessionValidated) {
      console.error(
        "[useShoppingCart] Session validation failed after all attempts",
      );
      throw new Error(
        "Unable to validate session. Please refresh the page and try again.",
      );
    }

    console.log(
      `[useShoppingCart] Session validated after ${validationAttempts} attempts`,
    );
    setIsLoading(true);
    try {
      const newItem: CartItem = {
        ...item,
        id: uuidv4(),
        created_at: new Date().toISOString(),
      };

      if (validSession?.user) {
        console.log(
          "[useShoppingCart] Adding to Supabase for authenticated user:",
          validSession.user.id,
        );

        // Generate a UUID for item_id if it's not already a valid UUID
        let validItemId = null;
        if (item.item_id) {
          // Check if item_id is already a valid UUID format
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(item.item_id)) {
            validItemId = item.item_id;
          } else {
            // Generate a new UUID if item_id is not a valid UUID
            validItemId = uuidv4();
          }
        }

        const insertData = {
          user_id: validSession.user.id,
          item_type: item.item_type,
          item_id: validItemId,
          service_name: item.service_name,
          price: item.price,
          details: item.details,
        };

        console.log("[useShoppingCart] Inserting cart data:", insertData);

        // Enhanced database operation with retry
        let dbSuccess = false;
        let dbAttempts = 0;
        const maxDbAttempts = 2;
        let insertedData = null;

        while (dbAttempts < maxDbAttempts && !dbSuccess) {
          dbAttempts++;
          console.log(
            `[useShoppingCart] Database insert attempt ${dbAttempts}`,
          );

          try {
            const { data, error } = await supabase
              .from("shopping_cart")
              .insert(insertData)
              .select()
              .single();

            if (error) {
              console.error(
                `[useShoppingCart] Database error on attempt ${dbAttempts}:`,
                error,
              );
              if (dbAttempts < maxDbAttempts) {
                console.log(
                  "[useShoppingCart] Retrying database operation in 1 second...",
                );
                await new Promise((resolve) => setTimeout(resolve, 1000));
                continue;
              }
              throw error;
            }

            insertedData = data;
            dbSuccess = true;
            console.log(
              `[useShoppingCart] Database insert successful on attempt ${dbAttempts}`,
            );
          } catch (dbError) {
            console.error(
              `[useShoppingCart] Database attempt ${dbAttempts} failed:`,
              dbError,
            );
            if (dbAttempts >= maxDbAttempts) {
              throw dbError;
            }
          }
        }

        setCartItems((prev) => [insertedData, ...prev]);
      } else {
        // Add to localStorage for guests
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
      console.error("Error adding item to cart:", error);
      toast({
        title: "Gagal menambahkan item",
        description: "Terjadi kesalahan saat menambahkan item ke keranjang.",
        variant: "destructive",
      });
      // Don't throw error to prevent UI crashes
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
        // Remove from Supabase for logged-in users
        const { error } = await supabase
          .from("shopping_cart")
          .delete()
          .eq("id", id)
          .eq("user_id", session.user.id);

        if (error) {
          console.error("Error removing from cart:", error);
          throw error;
        }
      } else {
        // Remove from localStorage for guests
        const updatedCart = cartItems.filter((item) => item.id !== id);
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
      }

      setCartItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error removing item from cart:", error);
      throw error;
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
        // Clear from Supabase for logged-in users
        const { error } = await supabase
          .from("shopping_cart")
          .delete()
          .eq("user_id", session.user.id);

        if (error) {
          console.error("Error clearing cart:", error);
          throw error;
        }
      } else {
        // Clear localStorage for guests
        localStorage.removeItem(CART_STORAGE_KEY);
      }

      setCartItems([]);
    } catch (error) {
      console.error("Error clearing cart:", error);
      throw error;
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
            const carBookingData = {
              customer_id: session?.user?.id || null,
              vehicle_id: item.item_id || null,
              total_amount: item.price,
              start_date:
                item.details?.start_date ||
                new Date().toISOString().split("T")[0],
              end_date:
                item.details?.end_date ||
                new Date(Date.now() + 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0],
              pickup_time: item.details?.pickup_time || "09:00",
              driver_option: item.details?.driver_option || "self",
              status: "pending",
              payment_status: "pending",
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
