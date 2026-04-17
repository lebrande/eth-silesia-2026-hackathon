import { tool } from "@langchain/core/tools";
import { getCurrentTaskInput } from "@langchain/langgraph";
import { z } from "zod";
import { getOrdersByPhone, getOrder } from "@/lib/server/baselinker.server";
import {
  mapOrderStatus,
  STATUS_LABELS,
} from "@/lib/server/baselinker-statuses.server";
import type { ChatStateType } from "../chat.state";

const MAX_ORDERS = 5;

export const getMyOrdersTool = tool(
  async ({ limit }: { limit?: number }) => {
    const state = getCurrentTaskInput<ChatStateType>();
    const orders = await getOrdersByPhone(state.verifiedPhone!);

    if (orders.length === 0) {
      return "No orders found for this customer.";
    }

    const count = Math.min(limit ?? MAX_ORDERS, MAX_ORDERS);
    const recentOrders = orders.slice(0, count);

    const details = await Promise.all(
      recentOrders.map(async (order) => {
        const detail = await getOrder(order.order_id);
        if (!detail) return null;

        const category = mapOrderStatus(detail.order_status_id);

        return {
          orderId: detail.order_id,
          date: new Date(detail.date_add * 1000).toISOString().split("T")[0],
          status: STATUS_LABELS[category],
          customer: detail.delivery_fullname,
          deliveryMethod: detail.delivery_method,
          paymentMethod: detail.payment_method,
          paid: detail.payment_done > 0,
          currency: detail.currency,
          orderPageUrl: detail.order_page,
          products: detail.products
            .filter((p) => p.price_brutto >= 0)
            .map((p) => ({
              name: p.name,
              quantity: p.quantity,
              price: p.price_brutto,
            })),
        };
      }),
    );

    return JSON.stringify(details.filter(Boolean));
  },
  {
    name: "getMyOrders",
    description:
      "Get the customer's recent orders with statuses, products, and a link to the order details page. The order page contains tracking, invoice download, and package photo. The customer's identity is already verified.",
    schema: z.object({
      limit: z
        .number()
        .min(1)
        .max(MAX_ORDERS)
        .optional()
        .describe(
          `Number of recent orders to fetch (1-${MAX_ORDERS}). Use 1 for 'my last order', omit for general order questions.`,
        ),
    }),
  },
);
