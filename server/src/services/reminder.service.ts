import prisma from "../config/prisma.js";

export const getPaymentReminders = async () => {
  const customers = await prisma.orm.public.Customers.all();
  const reminders = [];

  for (const customer of customers) {
    if (!customer.isActive) {
      continue;
    }

    const deliveries = await prisma.orm.public.Deliveries
      .where({ customerId: customer.id })
      .all();

    const payments = await prisma.orm.public.Payments
      .where({ customerId: customer.id })
      .all();

    const totalDelivered = deliveries.reduce(
      (sum, delivery) => sum + Number(delivery.totalAmount),
      0
    );

    const totalPaid = payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );

    const outstandingBalance =
      Number(customer.openingBalance) +
      totalDelivered -
      totalPaid;

    if (outstandingBalance <= 0) {
      continue;
    }

    const message =
      `Hello ${customer.name}, this is a reminder from your gas agency. ` +
      `Your outstanding balance is ₹${outstandingBalance.toFixed(2)}. ` +
      `Please make the payment at your convenience. Thank you.`;

    reminders.push({
      customerId: customer.id,
      customerName: customer.name,
      mobile: customer.mobile,
      outstandingBalance: Number(outstandingBalance.toFixed(2)),
      status: "PAYMENT_PENDING",
      message,
    });
  }

  return reminders.sort(
    (a, b) => b.outstandingBalance - a.outstandingBalance
  );
};
