import * as React from "react";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { OrderTrackerClient, TrackedOrderData } from "@/components/orders/OrderTrackerClient";
import { Navbar } from "@/components/layout/Navbar";

export const dynamic = "force-dynamic";

interface OrderTrackingPageProps {
  params: {
    orderNumber: string;
  };
}

export default async function OrderTrackingPage({
  params,
}: OrderTrackingPageProps) {
  const { orderNumber } = params;

  // 1. Session & Auth Check
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    redirect("/?auth_error=unauthenticated");
  }

  // 2. Fetch Order Data from PostgreSQL
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      address: true,
      customer: {
        select: { id: true, name: true, phone: true },
      },
      rider: {
        include: {
          riderProfile: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // 3. Ownership / Role Validation
  const userRole = session.user.role;
  const isOwner = session.user.id === order.customerId;
  const isStaff = ["RIDER", "PACKER", "MANAGER", "OWNER"].includes(userRole);

  if (!isOwner && !isStaff) {
    redirect("/?auth_error=unauthorized_role");
  }

  // 4. Format serializable payload for Client Component
  const initialOrder: TrackedOrderData = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    deliveryOtp: order.deliveryOtp || "1234",
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    handlingFee: order.handlingFee,
    tipAmount: order.tipAmount,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt.toISOString(),
    packedAt: order.packedAt ? order.packedAt.toISOString() : null,
    deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
    address: order.address
      ? {
          id: order.address.id,
          label: order.address.label,
          flatBuilding: order.address.flatBuilding,
          streetArea: order.address.streetArea,
          landmark: order.address.landmark,
          latitude: order.address.latitude,
          longitude: order.address.longitude,
        }
      : {
          id: "addr_default",
          label: "Delivery Address",
          flatBuilding: "Customer Address",
          streetArea: "Ambikapur",
          landmark: null,
          latitude: 23.129243,
          longitude: 83.190082,
        },
    rider: order.rider
      ? {
          id: order.rider.id,
          name: order.rider.name,
          phone: order.rider.phone,
          vehicleDetails:
            order.rider.riderProfile?.vehicleDetails || null,
        }
      : null,
    items: (order.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      title: item.product?.title || "Grocery Item",
      unitQuantity: item.product?.unitQuantity || "1 unit",
      imageUrl: item.product?.imageUrl || "/images/placeholder.png",
      price: item.price,
      quantity: item.quantity,
    })),
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 text-surface-dark font-sans selection:bg-primary selection:text-white">
      <Navbar />
      <main>
        <OrderTrackerClient initialOrder={initialOrder} />
      </main>
    </div>
  );
}
