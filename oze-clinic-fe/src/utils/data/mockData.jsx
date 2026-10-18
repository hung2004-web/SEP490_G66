import { USER_ROLES } from "../messages";

const MOCK_USERS_KEY = "mock_users";

// One account per role. All of them sign in with password "password123".
const DEFAULT_USERS = [
  {
    fullname: "Nguyễn Văn A",
    phone: "0912345678",
    password: "password123",
    gender: "male",
    birthdate: "1990-01-01",
    email: "test@example.com",
    role: USER_ROLES.PATIENT
  },
  {
    fullname: "Trần Thị B",
    phone: "0987654321",
    password: "password123",
    gender: "female",
    birthdate: "1995-05-05",
    email: "test2@example.com",
    role: USER_ROLES.DOCTOR
  },
  {
    fullname: "Lê Văn C",
    phone: "0911111111",
    password: "password123",
    gender: "male",
    birthdate: "1992-03-10",
    email: "test3@example.com",
    role: USER_ROLES.DENTAL_IMAGING_TECHNICIAN
  },
  {
    fullname: "Phạm Thị D",
    phone: "0922222222",
    password: "password123",
    gender: "female",
    birthdate: "1998-07-20",
    email: "test4@example.com",
    role: USER_ROLES.RECEPTIONIST
  },
  {
    fullname: "Hoàng Văn E",
    phone: "0933333333",
    password: "password123",
    gender: "male",
    birthdate: "1985-11-15",
    email: "test5@example.com",
    role: USER_ROLES.CLINIC_MANAGER
  }
];

// localStorage only keeps users added with saveMockUser, so changes to DEFAULT_USERS always apply.
const getSavedUsers = () => {
  const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) ?? "[]");
  return users.filter(u => !DEFAULT_USERS.some(d => d.phone === u.phone));
};

export const getMockUsers = () =>
  [...DEFAULT_USERS, ...getSavedUsers()].map(u => ({ ...u, role: u.role ?? USER_ROLES.PATIENT }));

export const saveMockUser = (user) => {
  const users = getSavedUsers();
  users.push(user);
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
};

export const findMockUserByPhone = (phone) => {
  const users = getMockUsers();
  return users.find(u => u.phone === phone);
};
