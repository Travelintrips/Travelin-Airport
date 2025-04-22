import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart as CartIcon, Trash2 } from "lucide-react";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import { formatCurrency } from "@/lib/utils";

const ShoppingCart = () => {
  const { cartItems, removeFromCart, clearCart, totalAmount, checkout } =
    useShoppingCart();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CartIcon className="h-5 w-5" />
          <span>Keranjang Belanja</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {cartItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Keranjang belanja kosong</p>
            <p className="text-sm mt-2">Tambahkan item dari form transaksi</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {cartItems.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">
                      {item.type === "flight"
                        ? "Tiket Pesawat"
                        : item.type === "hotel"
                          ? "Hotel"
                          : item.type === "passenger"
                            ? "Passenger Handling"
                            : "Rental Mobil"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {item.type === "flight" &&
                        `${item.details.airline} - ${item.details.route}`}
                      {item.type === "hotel" &&
                        `${item.details.hotelName} - ${item.details.location}`}
                      {item.type === "passenger" &&
                        `${item.details.serviceName} - ${item.details.location}`}
                      {item.type === "car" &&
                        `${item.details.carType} - ${item.details.licensePlate}`}
                    </p>
                    <div className="mt-2">
                      <p className="text-sm">
                        Harga: {formatCurrency(item.sellingPrice)}
                      </p>
                      {item.type === "flight" && (
                        <p className="text-xs">
                          Penumpang: {item.details.passengerCount}
                        </p>
                      )}
                      {item.type === "hotel" && (
                        <>
                          <p className="text-xs">
                            Kamar: {item.details.roomCount}
                          </p>
                          <p className="text-xs">
                            Malam: {item.details.nightCount}
                          </p>
                        </>
                      )}
                      {item.type === "passenger" && (
                        <p className="text-xs">
                          Penumpang: {item.details.passengerCount}
                        </p>
                      )}
                      {item.type === "car" && (
                        <p className="text-xs">Hari: {item.details.dayCount}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4 border-t pt-4">
        <div className="w-full flex justify-between font-medium">
          <span>Total</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button
            variant="outline"
            onClick={clearCart}
            disabled={cartItems.length === 0}
          >
            Kosongkan
          </Button>
          <Button onClick={checkout} disabled={cartItems.length === 0}>
            Checkout
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ShoppingCart;
