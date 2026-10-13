
import prisma from "../config/prisma.js";

type CreatePaymentData = {
  customerId: number;
  amount: number;
  paymentMethod: "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE";
  paymentDate?: string;
  note?: string;
};

const validatePaymentData = (data: CreatePaymentData) => {
  if (
    !Number.isInteger(data.customerId) ||
    data.customerId <= 0 ||
    !Number.isFinite(data.amount) ||
    data.amount <= 0 ||
    !["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"].includes(
      data.paymentMethod
    )
  ) {
    throw new Error("INVALID_PAYMENT_DATA");
  }

  if (
    data.paymentDate &&
    Number.isNaN(Date.parse(data.paymentDate))
  ) {
    throw new Error("INVALID_PAYMENT_DATE");
  }
};

/* GET all payments */
export const getPayments = async () => {
  return prisma.orm.public.Payments.all();
};

/* GET payments for one customer */
export const getPaymentsByCustomer = async (
  customerId: number
) => {
  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw new Error("INVALID_CUSTOMER_ID");
  }

  const customers = await prisma.orm.public.Customers
    .where({ id: customerId })
    .all();

  if (customers.length === 0) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  return prisma.orm.public.Payments
    .where({ customerId })
    .all();
};

/* RECORD a payment */
export const createPayment = async (
  data: CreatePaymentData
) => {
  validatePaymentData(data);

  return prisma.transaction(async (tx) => {
    const customers = await tx.orm.public.Customers
      .where({ id: data.customerId })
      .all();

    if (customers.length === 0) {
      throw new Error("CUSTOMER_NOT_FOUND");
    }

    const now = new Date().toISOString();
    const amount = data.amount.toFixed(2);

    const paymentPlan = tx.sql.public.payments
      .insert([
        {
          customerId: data.customerId,
          amount,
          paymentMethod: data.paymentMethod,
          paymentDate: data.paymentDate ?? now,
          note: data.note ?? null,
          createdAt: now,
        },
      ])
      .returning(
        "id",
        "customerId",
        "amount",
        "paymentMethod",
        "paymentDate",
        "note",
        "createdAt"
      )
      .build();

    const rows = await tx.query(paymentPlan);
    const payment = rows[0];

    if (!payment) {
      throw new Error("PAYMENT_CREATION_FAILED");
    }

    return payment;
  });
};

/* CUSTOMER ACCOUNT SUMMARY */
export const getCustomerAccountSummary = async (
  customerId: number
) => {
  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw new Error("INVALID_CUSTOMER_ID");
  }

  const customers = await prisma.orm.public.Customers
    .where({ id: customerId })
    .all();

  const customer = customers[0];

  if (!customer) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  const deliveries = await prisma.orm.public.Deliveries
    .where({ customerId })
    .all();

  const payments = await prisma.orm.public.Payments
    .where({ customerId })
    .all();

  const totalDelivered = deliveries.reduce(
    (sum, delivery) =>
      sum + Number(delivery.totalAmount),
    0
  );

  const totalPaid = payments.reduce(
    (sum, payment) =>
      sum + Number(payment.amount),
    0
  );

  const openingBalance = Number(customer.openingBalance);

  return {
    customerId,
    customerName: customer.name,
    openingBalance,
    totalDelivered: Number(totalDelivered.toFixed(2)),
    totalPaid: Number(totalPaid.toFixed(2)),
    outstandingBalance: Number(
      (openingBalance + totalDelivered - totalPaid).toFixed(2)
    ),
  };
};

