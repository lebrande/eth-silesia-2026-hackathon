const BASE_URL = "https://api.baselinker.com/connector.php";

async function callBaseLinker<T>(
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const token = process.env.BASELINKER_API_TOKEN;
  if (!token) throw new Error("BASELINKER_API_TOKEN not configured");

  const start = Date.now();
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "X-BLToken": token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      method,
      parameters: JSON.stringify(params),
    }),
  });

  const data = await response.json();
  const duration = Date.now() - start;

  if (data.status === "ERROR") {
    console.error(
      `[baselinker] ${method} FAILED (${duration}ms): ${data.error_code} - ${data.error_message}`,
    );
    const isRateLimit =
      data.error_code === "ERROR_TOO_MANY_REQUESTS" ||
      data.error_message?.includes("too many");
    throw new Error(
      isRateLimit
        ? "Too many requests to the order system. Please try again in a moment."
        : `BaseLinker ${method}: ${data.error_code} - ${data.error_message}`,
    );
  }

  console.log(`[baselinker] ${method} OK (${duration}ms)`);
  return data as T;
}

// --- Types (only fields we actually use) ---

export interface BLOrderSummary {
  order_id: number;
  order_status_id: number;
  delivery_fullname: string;
  delivery_company: string;
  date_in_status: number;
  date_add: number;
}

export interface BLOrderDetail {
  order_id: number;
  order_status_id: number;
  date_add: number;
  date_confirmed: number;
  delivery_fullname: string;
  delivery_company: string;
  delivery_method: string;
  delivery_package_nr: string;
  currency: string;
  payment_method: string;
  payment_done: number;
  order_page: string;
  admin_comments: string;
  user_comments: string;
  products: BLProduct[];
}

export interface BLProduct {
  name: string;
  sku: string;
  quantity: number;
  price_brutto: number;
}

// --- API methods ---

export async function getOrdersByPhone(
  phone: string,
): Promise<BLOrderSummary[]> {
  if (isMock()) {
    console.log(`[baselinker] MOCK getOrdersByPhone(${phone})`);
    return [MOCK_ORDER, MOCK_ORDER_2].map((o) => ({
      order_id: o.order_id,
      order_status_id: o.order_status_id,
      delivery_fullname: o.delivery_fullname,
      delivery_company: o.delivery_company,
      date_in_status: o.date_add,
      date_add: o.date_add,
    }));
  }

  const data = await callBaseLinker<{ orders: BLOrderSummary[] }>(
    "getOrdersByPhone",
    { phone },
  );
  return data.orders;
}

export async function getOrder(orderId: number): Promise<BLOrderDetail | null> {
  if (isMock()) {
    console.log(`[baselinker] MOCK getOrder(${orderId})`);
    return (
      [MOCK_ORDER, MOCK_ORDER_2].find((o) => o.order_id === orderId) ??
      MOCK_ORDER
    );
  }

  const data = await callBaseLinker<{ orders: BLOrderDetail[] }>("getOrders", {
    order_id: orderId,
  });
  return data.orders[0] ?? null;
}

// --- Mock data (BASELINKER_MOCK=true) ---

const MOCK_ORDER: BLOrderDetail = {
  order_id: 900000001,
  order_status_id: 127488, // shipped
  date_add: Math.floor(Date.now() / 1000) - 86400 * 3, // 3 days ago
  date_confirmed: Math.floor(Date.now() / 1000) - 86400 * 3,
  delivery_fullname: "Test Customer",
  delivery_company: "",
  delivery_method: "Kurier InPost",
  delivery_package_nr: "000000000000000000000001",
  currency: "PLN",
  payment_method: "przelew",
  payment_done: 150,
  order_page: "https://orders-d.baselinker.com/900000001/mock/",
  admin_comments: "",
  user_comments: "",
  products: [
    {
      name: "Arkada Krem do stóp 75ml",
      sku: "ARK01",
      quantity: 2,
      price_brutto: 45.0,
    },
    {
      name: "ProCareXpert Serum 10ml",
      sku: "MED03",
      quantity: 1,
      price_brutto: 55.01,
    },
  ],
};

const MOCK_ORDER_2: BLOrderDetail = {
  ...MOCK_ORDER,
  order_id: 900000002,
  order_status_id: 283692, // processing (paid)
  date_add: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
  date_confirmed: Math.floor(Date.now() / 1000) - 86400,
  payment_method: "BLIK",
  payment_done: 55.01,
  delivery_package_nr: "",
  order_page: "https://orders-d.baselinker.com/900000002/mock/",
  products: [
    {
      name: "Gehwol Balsam do stóp 125ml",
      sku: "GEH01",
      quantity: 1,
      price_brutto: 55.01,
    },
  ],
};

function isMock(): boolean {
  return process.env.BASELINKER_MOCK === "true";
}
