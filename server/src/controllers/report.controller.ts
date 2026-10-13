
import prisma from "../config/prisma.js";

/* GET REPORT SUMMARY */
export const getReportSummary = async (
  startDate?: string,
  endDate?: string
) => {
  const customers = await prisma.orm.public.Customers.all();
  const deliveries = await prisma.orm.public.Deliveries.all();
  const payments = await prisma.orm.public.Payments.all();

  // Apply the selected date range to deliveries and payments.
  const filteredDeliveries = deliveries.filter((delivery) => {
    const date = new Date(delivery.deliveryDate);

    if (startDate && date < new Date(startDate)) {
      return false;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      if (date > end) {
        return false;
      }
    }

    return true;
  });

  const filteredPayments = payments.filter((payment) => {
    const date = new Date(payment.paymentDate);

    if (startDate && date < new Date(startDate)) {
      return false;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      if (date > end) {
        return false;
      }
    }

    return true;
  });

  const totalSales = filteredDeliveries.reduce(
    (sum, delivery) =>
      sum + Number(delivery.totalAmount),
    0
  );

  const totalPayments = filteredPayments.reduce(
    (sum, payment) =>
      sum + Number(payment.amount),
    0
  );

  const totalCylindersSold = filteredDeliveries.reduce(
    (sum, delivery) =>
      sum + Number(delivery.quantity),
    0
  );

  // Outstanding balances are calculated from all transactions,
  // not just the selected date range.
  const totalOutstanding = customers.reduce(
    (sum, customer) => {
      const customerDeliveries = deliveries.filter(
        (delivery) => delivery.customerId === customer.id
      );

      const customerPayments = payments.filter(
        (payment) => payment.customerId === customer.id
      );

      const delivered = customerDeliveries.reduce(
        (total, delivery) =>
          total + Number(delivery.totalAmount),
        0
      );

      const paid = customerPayments.reduce(
        (total, payment) =>
          total + Number(payment.amount),
        0
      );

      return (
        sum +
        Number(customer.openingBalance) +
        delivered -
        paid
      );
    },
    0
  );

  return {
    startDate: startDate ?? null,
    endDate: endDate ?? null,
    totalCustomers: customers.length,
    totalSales: Number(totalSales.toFixed(2)),
    totalPayments: Number(totalPayments.toFixed(2)),
    totalCylindersSold,
    totalDeliveries: filteredDeliveries.length,
    totalOutstanding: Number(totalOutstanding.toFixed(2)),
  };
};

/* GET SALES REPORT */
export const getReportSales = async (
  startDate?: string,
  endDate?: string
) => {
  const [customers, deliveries] = await Promise.all([
    prisma.orm.public.Customers.all(),
    prisma.orm.public.Deliveries.all(),
  ]);

  const customerNames = new Map(
    customers.map((customer) => [
      customer.id,
      customer.name,
    ])
  );

  return deliveries
    .filter((delivery) => {
      const date = new Date(delivery.deliveryDate);

      if (startDate && date < new Date(startDate)) {
        return false;
      }

      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999`);

        if (date > end) {
          return false;
        }
      }

      return true;
    })
    .map((delivery) => ({
      deliveryId: delivery.id,
      deliveryDate: delivery.deliveryDate,
      customerId: delivery.customerId,
      customerName:
        customerNames.get(delivery.customerId) ?? "Unknown",
      cylinderTypeId: delivery.cylinderTypeId,
      quantity: Number(delivery.quantity),
      unitPrice: Number(delivery.unitPrice),
      totalAmount: Number(delivery.totalAmount),
      note: delivery.note ?? "",
    }));
};

/* GET PAYMENT REPORT */
export const getReportPayments = async (
  startDate?: string,
  endDate?: string
) => {
  const [customers, payments] = await Promise.all([
    prisma.orm.public.Customers.all(),
    prisma.orm.public.Payments.all(),
  ]);

  const customerNames = new Map(
    customers.map((customer) => [
      customer.id,
      customer.name,
    ])
  );

  return payments
    .filter((payment) => {
      const date = new Date(payment.paymentDate);

      if (startDate && date < new Date(startDate)) {
        return false;
      }

      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999`);

        if (date > end) {
          return false;
        }
      }

      return true;
    })
    .map((payment) => ({
      paymentId: payment.id,
      paymentDate: payment.paymentDate,
      customerId: payment.customerId,
      customerName:
        customerNames.get(payment.customerId) ?? "Unknown",
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      note: payment.note ?? "",
    }));
};


/* DAILY BUSINESS CLOSING */
export const getDailyBusinessClosing = async (date: string) => {
  // Interpret the selected calendar date in India Standard Time.
  const start = new Date(`${date}T00:00:00+05:30`);
  const end = new Date(
    new Date(`${date}T00:00:00+05:30`).getTime() +
      24 * 60 * 60 * 1000
  );

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    throw new Error("INVALID_CLOSING_DATE");
  }

  const [customers, deliveries, payments, inventory] =
    await Promise.all([
      prisma.orm.public.Customers.all(),
      prisma.orm.public.Deliveries.all(),
      prisma.orm.public.Payments.all(),
      prisma.orm.public.Inventory.all(),
    ]);

  const inSelectedDay = (value: string | Date) => {
    const timestamp = new Date(value).getTime();
    return timestamp >= start.getTime() &&
      timestamp < end.getTime();
  };

  const dailyDeliveries = deliveries.filter((delivery) =>
    inSelectedDay(delivery.deliveryDate)
  );

  const dailyPayments = payments.filter((payment) =>
    inSelectedDay(payment.paymentDate)
  );

  const dailyInventory = inventory.filter((movement) =>
    inSelectedDay(movement.createdAt)
  );

  const totalSales = dailyDeliveries.reduce(
    (sum, delivery) => sum + Number(delivery.totalAmount),
    0
  );

  const totalCollected = dailyPayments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0
  );

  const cylindersSold = dailyDeliveries.reduce(
    (sum, delivery) => sum + delivery.quantity,
    0
  );

  const paymentsByMethod = {
    CASH: 0,
    UPI: 0,
    BANK_TRANSFER: 0,
    CHEQUE: 0,
  };

  for (const payment of dailyPayments) {
    paymentsByMethod[payment.paymentMethod] +=
      Number(payment.amount);
  }

  const totalOutstanding = customers.reduce(
    (sum, customer) => {
      const customerDeliveries = deliveries.filter(
        (delivery) => delivery.customerId === customer.id
      );

      const customerPayments = payments.filter(
        (payment) => payment.customerId === customer.id
      );

      const delivered = customerDeliveries.reduce(
        (total, delivery) =>
          total + Number(delivery.totalAmount),
        0
      );

      const paid = customerPayments.reduce(
        (total, payment) => total + Number(payment.amount),
        0
      );

      return (
        sum +
        Number(customer.openingBalance) +
        delivered -
        paid
      );
    },
    0
  );

  const inventoryMovements = dailyInventory.reduce(
    (summary, movement) => {
      const key = `${movement.type}_${movement.status}`;
      summary[key] =
        (summary[key] ?? 0) + movement.quantity;
      return summary;
    },
    {} as Record<string, number>
  );

  const money = (value: number) =>
    Number(value.toFixed(2));

  return {
    date,
    timezone: "Asia/Kolkata",
    sales: {
      totalAmount: money(totalSales),
      deliveryCount: dailyDeliveries.length,
      cylindersSold,
    },
    collections: {
      totalAmount: money(totalCollected),
      paymentCount: dailyPayments.length,
      byMethod: Object.fromEntries(
        Object.entries(paymentsByMethod).map(
          ([method, amount]) => [method, money(amount)]
        )
      ),
    },
    outstanding: {
      totalAmount: money(totalOutstanding),
      customerCount: customers.length,
    },
    inventoryMovements,
    notes: [
      "Outstanding balances reflect all recorded transactions, not only the selected day.",
      "Inventory movements are daily activity totals, not a historical closing-stock snapshot.",
      "Expenses and profit are not included in this version.",
    ],
  };
};


/* PROFIT ANALYSIS */
export const getReportProfit = async (
  startDate?: string,
  endDate?: string
) => {
  const [deliveries, cylinderTypes] = await Promise.all([
    prisma.orm.public.Deliveries.all(),
    prisma.orm.public.CylinderTypes.all(),
  ]);

  const cylinderTypeMap = new Map(
    cylinderTypes.map((cylinder) => [
      cylinder.id,
      {
        name: cylinder.name,
        purchasePrice: Number(cylinder.purchasePrice ?? 0),
      },
    ])
  );

  const filteredDeliveries = deliveries.filter((delivery) => {
    const date = new Date(delivery.deliveryDate);

    if (
      startDate &&
      date < new Date(`${startDate}T00:00:00`)
    ) {
      return false;
    }

    if (
      endDate &&
      date > new Date(`${endDate}T23:59:59.999`)
    ) {
      return false;
    }

    return true;
  });

  let totalSales = 0;
  let estimatedCost = 0;
  let totalCylindersSold = 0;

  const cylinderBreakdown = new Map<
    number,
    {
      cylinderTypeId: number;
      cylinderTypeName: string;
      quantitySold: number;
      salesRevenue: number;
      estimatedCost: number;
      estimatedGrossProfit: number;
    }
  >();

  for (const delivery of filteredDeliveries) {
    const quantity = Number(delivery.quantity);
    const revenue = Number(delivery.totalAmount);

    const cylinder = cylinderTypeMap.get(
      delivery.cylinderTypeId
    );

    const cost = cylinder
      ? quantity * cylinder.purchasePrice
      : 0;

    totalSales += revenue;
    estimatedCost += cost;
    totalCylindersSold += quantity;

    const key = delivery.cylinderTypeId;
    const existing = cylinderBreakdown.get(key);

    if (existing) {
      existing.quantitySold += quantity;
      existing.salesRevenue += revenue;
      existing.estimatedCost += cost;
      existing.estimatedGrossProfit += revenue - cost;
    } else {
      cylinderBreakdown.set(key, {
        cylinderTypeId: key,
        cylinderTypeName:
          cylinder?.name ?? "Unknown cylinder",
        quantitySold: quantity,
        salesRevenue: revenue,
        estimatedCost: cost,
        estimatedGrossProfit: revenue - cost,
      });
    }
  }

  const estimatedGrossProfit =
    totalSales - estimatedCost;

  const money = (value: number) =>
    Number(value.toFixed(2));

  return {
    startDate: startDate ?? null,
    endDate: endDate ?? null,

    totalDeliveries: filteredDeliveries.length,
    totalCylindersSold,

    totalSales: money(totalSales),
    estimatedCost: money(estimatedCost),
    estimatedGrossProfit: money(estimatedGrossProfit),

    estimatedProfitMargin:
      totalSales > 0
        ? money(
            (estimatedGrossProfit / totalSales) * 100
          )
        : 0,

    cylinderBreakdown: Array.from(
      cylinderBreakdown.values()
    ).map((item) => ({
      ...item,
      salesRevenue: money(item.salesRevenue),
      estimatedCost: money(item.estimatedCost),
      estimatedGrossProfit: money(
        item.estimatedGrossProfit
      ),
    })),

    notes: [
      "Profit is estimated using each cylinder type's current purchase price.",
      "Historical purchase prices are not stored against individual deliveries.",
      "Expenses and overheads are not included.",
      "Deliveries with a missing cylinder type have zero estimated cost; review these records.",
    ],
  };
};