import { MESSAGES, PASSWORD_LENGTH, VALIDATION_MESSAGES } from "./messages";

// Shared form rules (BR-002). Each validator returns the message to show, or undefined when the value is valid.

// MSG07 with the field name filled in, e.g. "Vui lòng nhập số điện thoại."
export const requiredMessage = (fieldName) => MESSAGES.MSG07.replace("[tên trường]", fieldName);

export const invalidMessage = (fieldName) => MESSAGES.MSG66.replace("[Tên trường]", fieldName);

export const isRequiredEmpty = (value) => value.trim() === "";

export const validateEmail = (value) => {
    if (!value) return undefined;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(value)) return VALIDATION_MESSAGES.EMAIL_INVALID;
    return undefined;
};

// Vietnamese mobile number: 10 digits, starting with 03, 05, 07, 08 or 09. Agreed by the team on 07/10/2026.
// TODO(spec): the SRS does not define the format yet.
export const PHONE_PATTERN = /^0[35789]\d{8}$/;

// People often type the number in groups ("0912 345 678"); spaces are dropped before checking and sending.
export const normalizePhone = (value) => value.replace(/\s/g, "");

export const isPhoneEmpty = (value) => normalizePhone(value) === "";

// Spaces are valid password characters, so only a truly empty value counts as empty.
export const isPasswordEmpty = (value) => value === "";

export const validatePhone = (value) => {
    if (isPhoneEmpty(value)) return requiredMessage("số điện thoại");
    if (!PHONE_PATTERN.test(normalizePhone(value))) return VALIDATION_MESSAGES.PHONE_INVALID;
    return undefined;
};

// For Register / Reset / Change Password. Sign In only checks that the password is filled.
export const validatePassword = (value) => {
    if (isPasswordEmpty(value)) return requiredMessage("mật khẩu");
    if (value.length < PASSWORD_LENGTH.MIN || value.length > PASSWORD_LENGTH.MAX) return VALIDATION_MESSAGES.PASSWORD_LENGTH;
    return undefined;
};
