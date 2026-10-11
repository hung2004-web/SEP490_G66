export const getMockUsers = () => {
  const users = localStorage.getItem("mock_users");
  if (users) {
    return JSON.parse(users);
  }
  const defaultUsers = [
    {
      fullname: "Nguyễn Văn A",
      phone: "0912345678",
      password: "password123",
      gender: "male",
      birthdate: "1990-01-01",
      email: "test@example.com"
    },
    {
      fullname: "Trần Thị B",
      phone: "0987654321",
      password: "password123",
      gender: "female",
      birthdate: "1995-05-05",
      email: "test2@example.com"
    }
  ];
  localStorage.setItem("mock_users", JSON.stringify(defaultUsers));
  return defaultUsers;
};

export const saveMockUser = (user) => {
  const users = getMockUsers();
  users.push(user);
  localStorage.setItem("mock_users", JSON.stringify(users));
};

export const findMockUserByPhone = (phone) => {
  const users = getMockUsers();
  return users.find(u => u.phone === phone);
};
