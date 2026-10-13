
import type { Request, Response } from "express";
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,

} from "../services/supplier.service.js";
import { validateSupplierData } from "../validators/supplier.validator.js";

export const listSuppliers = async (
  _req: Request,
  res: Response
) => {
  try {
    const suppliers = await getSuppliers();

    res.json({
      success: true,
      data: suppliers,
    });
  } catch (error) {
    console.error("Error fetching suppliers:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch suppliers",
    });
  }
};

export const getSupplier = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid supplier ID",
      });
      return;
    }

    const supplier = await getSupplierById(id);

    if (!supplier) {
      res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
      return;
    }

    res.json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    console.error("Error fetching supplier:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch supplier",
    });
  }
};

export const addSupplier = async (
  req: Request,
  res: Response
) => {
  try {
    const validation = validateSupplierData(req.body);

    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: "Supplier validation failed",
        errors: validation.errors,
      });
      return;
    }

    const { name, mobile, address } = req.body;

    const supplier = await createSupplier({
      name: name.trim(),
      mobile:
        typeof mobile === "string"
          ? mobile.trim() || null
          : mobile,
      address:
        typeof address === "string"
          ? address.trim() || null
          : address,
    });

    res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: supplier,
    });
  } catch (error) {
    console.error("Error creating supplier:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create supplier",
    });
  }
};

export const editSupplier = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid supplier ID",
      });
      return;
    }

    const { name, mobile, address, isActive } = req.body;

    // Validate only the fields supplied for this update.
    if (Object.keys(req.body).length === 0) {
      res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
      return;
    }

    const validation = validateSupplierData({
      name: name === undefined ? "Valid supplier name" : name,
      mobile,
      address,
    });

    if (
      name !== undefined ||
      mobile !== undefined ||
      address !== undefined
    ) {
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          message: "Supplier validation failed",
          errors: validation.errors,
        });
        return;
      }
    }

    if (
      isActive !== undefined &&
      typeof isActive !== "boolean"
    ) {
      res.status(400).json({
        success: false,
        message: "isActive must be true or false",
      });
      return;
    }

    const supplier = await updateSupplier(id, {
      name:
        typeof name === "string" ? name.trim() : name,
      mobile:
        typeof mobile === "string"
          ? mobile.trim() || null
          : mobile,
      address:
        typeof address === "string"
          ? address.trim() || null
          : address,
      isActive,
    });

    if (!supplier) {
      res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Supplier updated successfully",
      data: supplier,
    });
  } catch (error) {
    console.error("Error updating supplier:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update supplier",
    });
  }
};
