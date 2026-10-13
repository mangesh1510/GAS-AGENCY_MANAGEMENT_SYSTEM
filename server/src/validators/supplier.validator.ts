
export interface CreateSupplierData {
  name: string;
  mobile?: string | null;
  address?: string | null;
}

export interface SupplierValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSupplierData(
  data: CreateSupplierData
): SupplierValidationResult {
  const errors: string[] = [];

  // Validate supplier name
  if (typeof data.name !== "string" || !data.name.trim()) {
    errors.push("Supplier name is required.");
  } else if (data.name.trim().length > 100) {
    errors.push("Supplier name cannot exceed 100 characters.");
  }

  // Validate Indian mobile number
  if (data.mobile !== undefined && data.mobile !== null) {
    if (typeof data.mobile !== "string") {
      errors.push("Mobile number must be a string.");
    } else {
      const mobile = data.mobile.trim();

      if (mobile !== "") {
        // Accept 9876543210, 919876543210, or +919876543210
        const normalizedMobile = mobile.replace(/[\s()-]/g, "");

        const indianMobileRegex =
          /^(?:\+91|91)?[6-9]\d{9}$/;

        if (!indianMobileRegex.test(normalizedMobile)) {
          errors.push(
            "Enter a valid Indian mobile number with 10 digits, starting with 6, 7, 8, or 9."
          );
        }
      }
    }
  }

  // Validate address
  if (data.address !== undefined && data.address !== null) {
    if (typeof data.address !== "string") {
      errors.push("Address must be a string.");
    } else if (data.address.trim().length > 250) {
      errors.push("Address cannot exceed 250 characters.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
