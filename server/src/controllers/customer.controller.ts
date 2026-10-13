
import type { Request, Response } from "express";
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../services/customer.service.js";

// Create customer
export async function addCustomer(req: Request, res: Response) {
  try {
    const { name, mobile, address, openingBalance } = req.body as {
      name?: string;
      mobile?: string;
      address?: string;
      openingBalance?: number;
    };

    if (
      typeof name !== "string" ||
      typeof mobile !== "string" ||
      !name.trim() ||
      !mobile.trim()
    ) {
      res.status(400).json({
        success: false,
        message: "Customer name and mobile number are required.",
      });
      return;
    }

    if (name.trim().length > 100) {
      res.status(400).json({
        success: false,
        message: "Customer name cannot exceed 100 characters.",
      });
      return;
    }

    if (!/^\d{10}$/.test(mobile.trim())) {
      res.status(400).json({
        success: false,
        message: "Mobile number must contain exactly 10 digits.",
      });
      return;
    }

    if (
      address !== undefined &&
      (typeof address !== "string" || address.trim().length > 250)
    ) {
      res.status(400).json({
        success: false,
        message: "Address must be text and cannot exceed 250 characters.",
      });
      return;
    }

    if (
      openingBalance !== undefined &&
      (typeof openingBalance !== "number" ||
        !Number.isFinite(openingBalance) ||
        openingBalance < 0)
    ) {
      res.status(400).json({
        success: false,
        message: "Opening balance must be a valid non-negative number.",
      });
      return;
    }

    const customer = await createCustomer({
      name: name.trim(),
      mobile: mobile.trim(),
      address: address?.trim() || undefined,
      openingBalance,
    });

    res.status(201).json({
      success: true,
      message: "Customer created successfully.",
      data: customer,
    });
  } catch (error) {
    console.error("Create customer error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create customer.",
    });
  }
}

// Get all customers
export async function listCustomers(_req: Request, res: Response) {
  try {
    const customers = await getCustomers();

    res.status(200).json({
      success: true,
      message: "Customers retrieved successfully.",
      data: customers,
    });
  } catch (error) {
    console.error("Get customers error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve customers.",
    });
  }
}

// Get customer by ID
export async function getCustomer(req: Request, res: Response) {
  try {
    const customerId = Number(req.params.id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      res.status(400).json({
        success: false,
        message: "A valid customer ID is required.",
      });
      return;
    }

    const customer = await getCustomerById(customerId);

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Customer retrieved successfully.",
      data: customer,
    });
  } catch (error) {
    console.error("Get customer error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve customer.",
    });
  }
}

// Update customer
export async function editCustomer(req: Request, res: Response) {
  try {
    const customerId = Number(req.params.id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      res.status(400).json({
        success: false,
        message: "A valid customer ID is required.",
      });
      return;
    }

    const { name, mobile, address, openingBalance } = req.body as {
      name?: string;
      mobile?: string;
      address?: string;
      openingBalance?: number;
    };

    if (
      typeof name !== "string" ||
      typeof mobile !== "string" ||
      !name.trim() ||
      !mobile.trim()
    ) {
      res.status(400).json({
        success: false,
        message: "Customer name and mobile number are required.",
      });
      return;
    }

    if (name.trim().length > 100) {
      res.status(400).json({
        success: false,
        message: "Customer name cannot exceed 100 characters.",
      });
      return;
    }

    if (!/^\d{10}$/.test(mobile.trim())) {
      res.status(400).json({
        success: false,
        message: "Mobile number must contain exactly 10 digits.",
      });
      return;
    }

    if (
      address !== undefined &&
      (typeof address !== "string" || address.trim().length > 250)
    ) {
      res.status(400).json({
        success: false,
        message: "Address must be text and cannot exceed 250 characters.",
      });
      return;
    }

    if (
      openingBalance !== undefined &&
      (typeof openingBalance !== "number" ||
        !Number.isFinite(openingBalance) ||
        openingBalance < 0)
    ) {
      res.status(400).json({
        success: false,
        message: "Opening balance must be a valid non-negative number.",
      });
      return;
    }

    const existingCustomer = await getCustomerById(customerId);

    if (!existingCustomer) {
      res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
      return;
    }

    const updatedCustomer = await updateCustomer(customerId, {
      name: name.trim(),
      mobile: mobile.trim(),
      address: address?.trim() || undefined,
      openingBalance,
    });

    if (!updatedCustomer) {
      res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Customer updated successfully.",
      data: updatedCustomer,
    });
  } catch (error) {
    console.error("Update customer error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update customer.",
    });
  }
}

// Delete customer
export async function removeCustomer(req: Request, res: Response) {
  try {
    const customerId = Number(req.params.id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      res.status(400).json({
        success: false,
        message: "A valid customer ID is required.",
      });
      return;
    }

    const existingCustomer = await getCustomerById(customerId);

    if (!existingCustomer) {
      res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
      return;
    }

    const deletedCustomer = await deleteCustomer(customerId);

    if (!deletedCustomer) {
      res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Customer deleted successfully.",
      data: { id: deletedCustomer.id },
    });
  } catch (error) {
    console.error("Delete customer error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete customer.",
    });
  }
}
