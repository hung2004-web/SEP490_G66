import { USER_ROLES } from "../messages";

const MOCK_USERS_KEY = "mock_users";
const MOCK_CURRENT_USER_KEY = "mock_current_user_id";

// One account per role. All of them sign in with password "password123".
const DEFAULT_USERS = [
  {
    id: "mock-patient",
    fullname: "Nguyễn Văn A",
    phone: "0912345678",
    password: "password123",
    gender: "male",
    birthdate: "1990-01-01",
    email: "test@example.com",
    address: "12 Nguyễn Trãi, Thanh Xuân, Hà Nội",
    role: USER_ROLES.PATIENT,
    code: "BN000123",
    createdAt: "2024-05-12",
    lastVisitAt: "2026-10-08",
    emergencyContact: null,
    health: {
      medicalHistory: "Viêm nướu (2024). Không có bệnh tim mạch, tiểu đường.",
      allergies: ["Penicillin"],
      medications: "Không",
      specialConditions: "Không mang thai, không hút thuốc.",
    },
    pendingIdentityRequest: {
      field: "birthdate",
      oldValue: "1990-01-01",
      newValue: "1990-01-10",
      reason: "Sai ngày sinh so với CCCD.",
      createdAt: "2026-10-19",
    },
  },
  {
    id: "mock-doctor",
    fullname: "Trần Thị B",
    phone: "0987654321",
    password: "password123",
    gender: "female",
    birthdate: "1995-05-05",
    email: "test2@example.com",
    address: "45 Láng Hạ, Đống Đa, Hà Nội",
    role: USER_ROLES.DOCTOR,
    code: "BS000004",
    createdAt: "2023-09-01",
    certificates: [
      {
        id: "cert-1",
        name: "Chứng chỉ hành nghề khám bệnh, chữa bệnh",
        issuer: "Sở Y tế Hà Nội",
        number: "012345/HNO-CCHN",
        issuedAt: "2020-06-15",
        expiresAt: "",
      },
      {
        id: "cert-2",
        name: "Chứng nhận đào tạo cấy ghép Implant",
        issuer: "Bệnh viện Răng Hàm Mặt Trung ương",
        number: "IMP-2021-0457",
        issuedAt: "2021-11-20",
        expiresAt: "2026-12-01",
      },
    ],
  },
  {
    id: "mock-imaging-technician",
    fullname: "Lê Văn C",
    phone: "0911111111",
    password: "password123",
    gender: "male",
    birthdate: "1992-03-10",
    email: "test3@example.com",
    address: "",
    role: USER_ROLES.DENTAL_IMAGING_TECHNICIAN
  },
  {
    id: "mock-receptionist",
    fullname: "Phạm Thị D",
    phone: "0922222222",
    password: "password123",
    gender: "female",
    birthdate: "1998-07-20",
    email: "test4@example.com",
    address: "",
    role: USER_ROLES.RECEPTIONIST
  },
  {
    id: "mock-clinic-manager",
    fullname: "Hoàng Văn E",
    phone: "0933333333",
    password: "password123",
    gender: "male",
    birthdate: "1985-11-15",
    email: "test5@example.com",
    address: "",
    role: USER_ROLES.CLINIC_MANAGER
  }
];

const isDefaultUser = (user) => DEFAULT_USERS.some(d => d.id === user.id);

// localStorage keeps new users and edited copies of default users (matched by id).
// Entries without an id come from an older format and are ignored.
const getSavedUsers = () => {
  const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) ?? "[]");
  return users.filter(u => u.id);
};

const writeSavedUsers = (users) => localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));

export const getMockUsers = () => {
  const saved = getSavedUsers();
  const defaults = DEFAULT_USERS.map(d => ({ ...d, ...saved.find(s => s.id === d.id) }));
  return [...defaults, ...saved.filter(s => !isDefaultUser(s))]
    .map(u => ({ ...u, role: u.role ?? USER_ROLES.PATIENT }));
};

export const saveMockUser = (user) => {
  const users = getSavedUsers();
  users.push({ ...user, id: user.id ?? `mock-${Date.now()}` });
  writeSavedUsers(users);
};

// Merges the changes into the user and returns the updated user, or undefined when the id is unknown.
export const updateMockUser = (id, changes) => {
  const user = getMockUsers().find(u => u.id === id);
  if (!user) return undefined;

  const updated = { ...user, ...changes };
  writeSavedUsers([...getSavedUsers().filter(u => u.id !== id), updated]);
  return updated;
};

export const findMockUserByPhone = (phone) => {
  const users = getMockUsers();
  return users.find(u => u.phone === phone);
};

// Stands in for the user id the backend reads from the access token.
export const setMockCurrentUserId = (id) => {
  if (id) localStorage.setItem(MOCK_CURRENT_USER_KEY, id);
  else localStorage.removeItem(MOCK_CURRENT_USER_KEY);
};

export const getMockCurrentUser = () => {
  const id = localStorage.getItem(MOCK_CURRENT_USER_KEY);
  return id ? getMockUsers().find(u => u.id === id) : undefined;
};
