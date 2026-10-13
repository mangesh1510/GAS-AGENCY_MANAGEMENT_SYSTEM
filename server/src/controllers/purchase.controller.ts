
import type { Request, Response } from "express";
import {
  getPurchases,
  getPurchaseById,
  createPurchase,
  cancelPurchase 
} from "../services/purchase.service.js";

export const listPurchases = async (
  _req: Request,
  res: Response
) => {
  try {
    const purchases = await getPurchases();

    res.json({
      success: true,
      data: purchases,
    });
  } catch (error) {
    console.error("Error fetching purchases:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch purchases",
    });
  }
};

export const getPurchase = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid purchase ID",
      });
      return;
    }

    const purchase = await getPurchaseById(id);

    if (!purchase) {
      res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
      return;
    }

    res.json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    console.error("Error fetching purchase:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch purchase",
    });
  }
};

export const addPurchase = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      supplierId,
      invoiceNumber,
      purchaseDate,
      note,
      items,
    } = req.body;

    if (
      !Number.isInteger(supplierId) ||
      supplierId <= 0 ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      res.status(400).json({
        success: false,
        message: "A valid supplier ID and at least one item are required",
      });
      return;
    }

    if (
      invoiceNumber !== undefined &&
      invoiceNumber !== null &&
      typeof invoiceNumber !== "string"
    ) {
      res.status(400).json({
        success: false,
        message: "Invoice number must be a string",
      });
      return;
    }

    if (
      purchaseDate !== undefined &&
      (typeof purchaseDate !== "string" ||
        Number.isNaN(Date.parse(purchaseDate)))
    ) {
      res.status(400).json({
        success: false,
        message: "Purchase date must be a valid date string",
      });
      return;
    }

    if (
      note !== undefined &&
      note !== null &&
      typeof note !== "string"
    ) {
      res.status(400).json({
        success: false,
        message: "Note must be a string",
      });
      return;
    }

    const purchase = await createPurchase({
      supplierId,
      invoiceNumber,
      purchaseDate,
      note,
      items,
    });

    res.status(201).json({
      success: true,
      message: "Purchase created successfully as DRAFT",
      data: purchase,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    if (
      message === "INVALID_PURCHASE_DATA" ||
      message === "INVALID_PURCHASE_ITEM"
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid purchase data or purchase items",
      });
      return;
    }

    if (message === "SUPPLIER_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Supplier not found or inactive",
      });
      return;
    }

    if (message === "CYLINDER_TYPE_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Cylinder type not found",
      });
      return;
    }

    console.error("Error creating purchase:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create purchase",
    });
  }
};

export const receivePurchaseHandler = async (
  req: import("express").Request,
  res: import("express").Response
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid purchase ID",
      });
      return;
    }

    const { receivePurchase } = await import(
      "../services/purchase.service.js"
    );

    const purchase = await receivePurchase(id);

    res.status(200).json({
      success: true,
      message: "Purchase received and inventory updated successfully",
      data: purchase,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";

    const errorResponses: Record<
      string,
      { status: number; message: string }
    > = {
      PURCHASE_NOT_FOUND: {
        status: 404,
        message: "Purchase not found",
      },
      PURCHASE_ALREADY_RECEIVED: {
        status: 409,
        message: "This purchase has already been received",
      },
      PURCHASE_CANCELLED: {
        status: 409,
        message: "A cancelled purchase cannot be received",
      },
      PURCHASE_HAS_NO_ITEMS: {
        status: 400,
        message: "Cannot receive a purchase without items",
      },
      PURCHASE_UPDATE_FAILED: {
        status: 500,
        message: "Failed to update purchase status",
      },
      INVALID_PURCHASE_ID: {
        status: 400,
        message: "Invalid purchase ID",
      },
    };

    const response = errorResponses[code] ?? {
      status: 500,
      message: "Failed to receive purchase",
    };

    res.status(response.status).json({
      success: false,
      message: response.message,
    });
  }
};

export const cancelPurchaseHandler = async (
  req: import("express").Request,
  res: import("express").Response
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid purchase ID",
      });
      return;
    }

    const purchase = await cancelPurchase(id);

    res.status(200).json({
      success: true,
      message: "Purchase cancelled successfully",
      data: purchase,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";

    const errorResponses: Record<
      string,
      { status: number; message: string }
    > = {
      INVALID_PURCHASE_ID: {
        status: 400,
        message: "Invalid purchase ID",
      },
      PURCHASE_NOT_FOUND: {
        status: 404,
        message: "Purchase not found",
      },
      PURCHASE_ALREADY_RECEIVED: {
        status: 409,
        message: "A received purchase cannot be cancelled",
      },
      PURCHASE_ALREADY_CANCELLED: {
        status: 409,
        message: "Purchase is already cancelled",
      },
      PURCHASE_UPDATE_FAILED: {
        status: 500,
        message: "Failed to update purchase status",
      },
    };

    const response = errorResponses[code] ?? {
      status: 500,
      message: "Failed to cancel purchase",
    };

    res.status(response.status).json({
      success: false,
      message: response.message,
    });
  }
};
