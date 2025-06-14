import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Toast from "../Toast";
import { useToast } from "@/components/ui/use-toast";

import { Loader2, Save, RefreshCw } from "lucide-react";

interface BaggagePrice {
  id: number;
  small_price: number;
  medium_price: number;
  large_price: number;
  extra_large_price: number;
  electronic_price: number;
  surfing_price: number;
  wheelchair_price;
  stickgolf_price;
}

const PriceBaggage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("small-price");

  // State for each price type
  const [smallPrice, setSmallPrice] = useState<number>(0);
  const [mediumPrice, setMediumPrice] = useState<number>(0);
  const [largePrice, setLargePrice] = useState<number>(0);
  const [extraLargePrice, setExtraLargePrice] = useState<number>(0);
  const [electronicPrice, setElectronicPrice] = useState<number>(0);
  const [surfingPrice, setSurfingPrice] = useState<number>(0);
  const [wheelchairPrice, setWheelchairPrice] = useState<number>(0);
  const [stickgolfPrice, setStickgolfPrice] = useState<number>(0);
  const [priceId, setPriceId] = useState<number>(0);

  // Fetch baggage price from database
  const fetchBaggagePrice = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("baggage_price")
        .select("*")
        .limit(1);

      if (error) {
        console.error("Error fetching baggage price:", error);
        toast({
          title: "Error",
          description: "Gagal mengambil data harga bagasi.",
          variant: "destructive",
        });
        return;
      }

      if (data && data.length > 0) {
        const price = data[0];
        setSmallPrice(Number(price.small_price) || 0);
        setMediumPrice(Number(price.medium_price) || 0);
        setLargePrice(Number(price.large_price) || 0);
        setExtraLargePrice(Number(price.extra_large_price) || 0);
        setElectronicPrice(Number(price.electronic_price) || 0);
        setWheelchairPrice(Number(price.wheelchair_price) || 0);
        setSurfingPrice(Number(price.surfing_price) || 0);
        setStickgolfPrice(Number(price.stickgolf_price) || 0);
        setPriceId(Number(price.id));
        console.log("Fetched baggage price:", price);
      } else {
        await createInitialPriceRecord();
      }
    } catch (error) {
      console.error("Error in fetchBaggagePrice:", error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengambil data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create initial price record if none exists
  const createInitialPriceRecord = async () => {
    try {
      const { data, error } = await supabase
        .from("baggage_price")
        .insert([
          {
            id: 2025, // pastikan ini tidak bentrok jika sudah pernah dibuat
            small_price: 70000,
            medium_price: 80000,
            large_price: 90000,
            extra_large_price: 100000,
            electronic_price: 90000,
            surfing_price: 100000,
            wheelchair_price: 110000,
            stickgolf_price: 110000,
          },
        ])
        .select()
        .single(); // akan mengembalikan satu objek

      if (error) {
        console.error("Error creating initial price record:", error);
        toast({
          title: "Error",
          description: "Gagal membuat data harga bagasi awal.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setSmallPrice(Number(data.small_price) || 0);
        setMediumPrice(Number(data.medium_price) || 0);
        setLargePrice(Number(data.large_price) || 0);
        setExtraLargePrice(Number(data.extra_large_price) || 0);
        setElectronicPrice(Number(data.electronic_price) || 0);
        setWheelchairPrice(Number(data.wheelchair_price) || 0);
        setSurfingPrice(Number(data.surfing_price) || 0);
        setStickgolfPrice(Number(data.stickgolf_price) || 0);
        setPriceId(Number(data.id));
        console.log("Created initial price record:", data);
      }
    } catch (error) {
      console.error("Error in createInitialPriceRecord:", error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat membuat data awal.",
        variant: "destructive",
      });
    }
  };

  // Save changes to database
  const saveChanges = async () => {
    setSaving(true);
    try {
      if (typeof priceId !== "number" || isNaN(priceId)) {
        setToastType("error");
        setToastMessage("ID harga bagasi tidak valid.");
        return;
      }

      const updateData = {
        small_price: smallPrice,
        medium_price: mediumPrice,
        large_price: largePrice,
        extra_large_price: extraLargePrice,
        electronic_price: electronicPrice,
        surfing_price: surfingPrice,
        wheelchair_price: wheelchairPrice,
        stickgolf_price: stickgolfPrice,
      };

      const { data, error } = await supabase
        .from("baggage_price")
        .update(updateData)
        .eq("id", priceId)
        .select()
        .single();

      if (error) {
        setToastType("error");
        setToastMessage("Gagal memperbarui harga bagasi.");
        toast({
          title: "Error",
          description: "Gagal memperbarui harga bagasi.",
          variant: "destructive",
        });
        return;
      }

      setToastType("success");
      setToastMessage("Harga bagasi berhasil diperbarui.");
      toast({
        title: "Success",
        description: "Harga bagasi berhasil diperbarui.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error in saveChanges:", error);
      setToastType("error");
      setToastMessage("Terjadi kesalahan tak terduga.");
      toast({
        title: "Error",
        description: "Terjadi kesalahan tak terduga.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle price change
  const handlePriceChange = (type: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    switch (type) {
      case "small":
        setSmallPrice(numValue);
        break;
      case "medium":
        setMediumPrice(numValue);
        break;
      case "large":
        setLargePrice(numValue);
        break;
      case "extra_large":
        setExtraLargePrice(numValue);
        break;
      case "electronic_price":
        setElectronicPrice(numValue);
        break;
      case "surfing_price":
        setSurfingPrice(numValue);
        break;
      case "wheelchair_price":
        setWheelchairPrice(numValue);
        break;
      case "stickgolf_price":
        setStickgolfPrice(numValue);
        break;
      default:
        break;
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchBaggagePrice();
  }, []);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-tosca to-primary-dark bg-clip-text text-transparent">
          Baggage Price Management
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchBaggagePrice}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button
            onClick={saveChanges}
            disabled={saving || loading}
            className="bg-gradient-to-r from-primary-tosca to-primary-dark hover:from-primary-dark hover:to-primary-tosca text-white flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>

        {/* ✅ Toast ditempatkan di luar tombol dan tetap tampil */}
        {toastMessage && (
          <Toast
            message={toastMessage}
            type={toastType}
            onClose={() => setToastMessage(null)}
          />
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="small-price">Small Price</TabsTrigger>
          <TabsTrigger value="medium-price">Medium Price</TabsTrigger>
          <TabsTrigger value="large-price">Large Price</TabsTrigger>
          <TabsTrigger value="extra-large-price">Extra Large Price</TabsTrigger>
          <TabsTrigger value="electronic-price">Electronic Price</TabsTrigger>
          <TabsTrigger value="surfing-price">Surfing/Board Price</TabsTrigger>
          <TabsTrigger value="wheelchair-price">Wheelchair Price</TabsTrigger>
          <TabsTrigger value="stickgolf-price">Stick Golf Price</TabsTrigger>
        </TabsList>

        <TabsContent value="small-price" className="mt-6">
          <BaggagePriceCard
            title="Small Baggage Price"
            description="Set price for small baggage"
            price={smallPrice}
            onChange={(value) => handlePriceChange("small", value)}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="medium-price" className="mt-6">
          <BaggagePriceCard
            title="Medium Baggage Price"
            description="Set price for medium baggage"
            price={mediumPrice}
            onChange={(value) => handlePriceChange("medium", value)}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="large-price" className="mt-6">
          <BaggagePriceCard
            title="Large Baggage Price"
            description="Set price for large baggage"
            price={largePrice}
            onChange={(value) => handlePriceChange("large", value)}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="extra-large-price" className="mt-6">
          <BaggagePriceCard
            title="Extra Large Baggage Price"
            description="Set price for extra large baggage"
            price={extraLargePrice}
            onChange={(value) => handlePriceChange("extra_large", value)}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="electronic-price" className="mt-6">
          <BaggagePriceCard
            title="Electronic Price"
            description="Set price for electronic"
            price={electronicPrice}
            onChange={(value) => handlePriceChange("electronic_price", value)}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="surfing-price" className="mt-6">
          <BaggagePriceCard
            title="Surfing Price"
            description="Set price for surfing/board price"
            price={surfingPrice}
            onChange={(value) => handlePriceChange("surfing_price", value)}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="wheelchair-price" className="mt-6">
          <BaggagePriceCard
            title="Wheelchair Price"
            description="Set price for wheel chair price"
            price={wheelchairPrice}
            onChange={(value) => handlePriceChange("wheelchair_price", value)}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="stickgolf-price" className="mt-6">
          <BaggagePriceCard
            title="Stickgolf Price"
            description="Set price for stick golf"
            price={stickgolfPrice}
            onChange={(value) => handlePriceChange("stickgolf_price", value)}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface BaggagePriceCardProps {
  title: string;
  description: string;
  price: number;
  onChange: (value: string) => void;
  loading: boolean;
}

const BaggagePriceCard = ({
  title,
  description,
  price,
  onChange,
  loading,
}: BaggagePriceCardProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-tosca" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-muted-foreground">{description}</p>

          <div className="flex flex-col space-y-2">
            <label htmlFor="price" className="text-sm font-medium">
              Price (IDR)
            </label>
            <div className="flex items-center gap-4">
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => onChange(e.target.value)}
                className="w-full"
                placeholder="Enter price in IDR"
              />
              <div className="text-lg font-semibold">
                {formatCurrency(price)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceBaggage;
