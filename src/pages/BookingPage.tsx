import React from "react";
import BookingForm from "../components/booking/BookingForm";
import { Card } from "../components/ui/card";

export default function BookingPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Book a Car</h1>
      <Card className="p-6 bg-white shadow-md">
        <BookingForm />
      </Card>
    </div>
  );
}
