import { CONFIG_GROUPS, MOCK_SYSTEM_CONFIGS } from "../utils/data/mockSystemConfigs";

// TODO(api): mock only. Values live in memory, so a save lasts until the page is reloaded.
const MOCK_DELAY_MS = 300;

const WORK_START_KEY = "Clinic.WorkStartTime";
const WORK_END_KEY = "Clinic.WorkEndTime";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const WHOLE_NUMBER_PATTERN = /^\d+$/;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const success = (data, message = null) => ({ success: true, message, data, errors: null });

const failure = (errors) => ({ success: false, message: null, data: null, errors });

const stored = Object.fromEntries(MOCK_SYSTEM_CONFIGS.map((config) => [config.key, config.value]));

// What ConfigSection needs of a setting (the stored value is sent separately).
const toConfig = ({ key, label, dataType, unit, min, max }) => ({ key, label, dataType, unit, min, max });

const configsByKey = new Map(MOCK_SYSTEM_CONFIGS.map((config) => [config.key, toConfig(config)]));

// Error message of one value, or null.
const valueError = (config, value) => {
    const text = (value ?? "").trim();
    if (!text) return "Vui lòng nhập giá trị.";
    if (config.dataType === "time") return TIME_PATTERN.test(text) ? null : "Giờ không hợp lệ (HH:mm).";
    if (!WHOLE_NUMBER_PATTERN.test(text)) return "Vui lòng nhập số nguyên.";
    const number = Number(text);
    if (number < config.min || number > config.max) return `Giá trị phải từ ${config.min} đến ${config.max}.`;
    return null;
};

// Errors of all values as { [key]: message }; empty when everything is valid. Shared by the page and the save below.
export const validateSystemConfigs = (values) => {
    const errors = {};
    for (const [key, config] of configsByKey) {
        const error = valueError(config, values[key]);
        if (error) errors[key] = error;
    }
    if (!errors[WORK_START_KEY] && !errors[WORK_END_KEY] && values[WORK_END_KEY] <= values[WORK_START_KEY]) {
        errors[WORK_END_KEY] = "Giờ đóng cửa phải sau giờ mở cửa.";
    }
    return errors;
};

// Settings by group: { groups: [{ key, title, configs }], values: { [key]: string } }.
export const getSystemConfigs = async () => {
    await wait(MOCK_DELAY_MS);
    const groups = CONFIG_GROUPS.map((group) => ({
        ...group,
        configs: MOCK_SYSTEM_CONFIGS.filter((config) => config.group === group.key).map(toConfig),
    }));
    return success({ groups, values: { ...stored } });
};

// values: { [key]: string } for every setting. Returns the stored values, or errors by key.
export const saveSystemConfigs = async (values) => {
    await wait(MOCK_DELAY_MS);
    const errors = validateSystemConfigs(values);
    if (Object.keys(errors).length > 0) return failure(errors);
    for (const key of configsByKey.keys()) stored[key] = values[key].trim();
    return success({ ...stored }, "Lưu cấu hình thành công!");
};
