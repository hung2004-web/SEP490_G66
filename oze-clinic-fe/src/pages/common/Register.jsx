import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { register } from '../../services/authService';
import { validatePhone, validatePassword, requiredMessage, isRequiredEmpty, validateEmail } from '../../utils/validation';

const Register = () => {
  const navigate = useNavigate();

  const [values, setValues] = useState({
    fullname: '',
    birthdate: '',
    gender: 'male',
    phone: '',
    email: '',
    password: '',
    confirm_password: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (isRequiredEmpty(values.fullname)) newErrors.fullname = requiredMessage("họ và tên");
    if (isRequiredEmpty(values.birthdate)) newErrors.birthdate = requiredMessage("ngày sinh");
    
    const phoneErr = validatePhone(values.phone);
    if (phoneErr) newErrors.phone = phoneErr;
    
    const emailErr = validateEmail(values.email);
    if (emailErr) newErrors.email = emailErr;
    
    const passErr = validatePassword(values.password);
    if (passErr) newErrors.password = passErr;
    
    if (isRequiredEmpty(values.confirm_password)) {
      newErrors.confirm_password = requiredMessage("xác nhận mật khẩu");
    } else if (values.password !== values.confirm_password) {
      newErrors.confirm_password = "Mật khẩu không khớp.";
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    const formErrors = validate();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await register({
        fullname: values.fullname,
        birthdate: values.birthdate,
        gender: values.gender,
        phone: values.phone.replace(/\s/g, ""), // Normalize phone
        email: values.email,
        password: values.password
      });

      if (result.success) {
        toast.success("Đăng ký thành công!");
        navigate('/login');
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error("Có lỗi xảy ra, vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-var(--spacing-topbar))] bg-surface-tint py-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl w-full p-10 bg-canvas rounded-2xl shadow-lg">
        <div className="text-center mb-10">
          <h2 className="text-[32px] font-bold text-ink font-heading tracking-tight">Đăng ký tài khoản</h2>
          <p className="mt-3 text-body-md text-body max-w-md mx-auto leading-relaxed">
            Tham gia OZE Dental để dễ dàng đặt lịch hẹn, xem hồ sơ bệnh án và quản lý quá trình chăm sóc sức khỏe của bạn.
          </p>
        </div>

        <form className="space-y-8" onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-y-6 gap-x-8 sm:grid-cols-2">

            <div className="sm:col-span-2">
              <Input
                id="fullname"
                name="fullname"
                type="text"
                placeholder="VD: Nguyễn Văn A"
                label={<>Họ và tên <span className="text-danger-solid">*</span></>}
                value={values.fullname}
                onChange={handleChange}
                error={errors.fullname}
                required
              />
            </div>

            <div>
              <Input
                id="birthdate"
                name="birthdate"
                type="date"
                label={<>Ngày sinh <span className="text-danger-solid">*</span></>}
                value={values.birthdate}
                onChange={handleChange}
                error={errors.birthdate}
                required
              />
            </div>

            <div>
              <label className="block text-label text-ink mb-1.5">
                Giới tính <span className="text-danger-solid">*</span>
              </label>
              <div className="flex items-center gap-6 h-11">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={values.gender === 'male'}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary bg-canvas border-border-strong focus:ring-primary focus:ring-offset-1 transition-all"
                  />
                  <span className="text-body-sm text-ink group-hover:text-primary transition-colors">Nam</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={values.gender === 'female'}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary bg-canvas border-border-strong focus:ring-primary focus:ring-offset-1 transition-all"
                  />
                  <span className="text-body-sm text-ink group-hover:text-primary transition-colors">Nữ</span>
                </label>
              </div>
            </div>

            <div>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="09xx xxx xxx"
                label={<>Số điện thoại <span className="text-danger-solid">*</span></>}
                value={values.phone}
                onChange={handleChange}
                error={errors.phone}
                required
              />
            </div>

            <div>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                label="Địa chỉ email (không bắt buộc)"
                value={values.email}
                onChange={handleChange}
                error={errors.email}
              />
            </div>

            <div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Ít nhất 8 ký tự"
                label={<>Mật khẩu <span className="text-danger-solid">*</span></>}
                value={values.password}
                onChange={handleChange}
                error={errors.password}
                required
              />
            </div>

            <div>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                placeholder="Nhập lại mật khẩu"
                label={<>Xác nhận mật khẩu <span className="text-danger-solid">*</span></>}
                value={values.confirm_password}
                onChange={handleChange}
                error={errors.confirm_password}
                required
              />
            </div>

          </div>

          <div className="pt-4">
            <Button
              type="submit"
              variant="cta-public"
              className="w-full text-base"
              disabled={loading}
            >
              {loading ? "Đang đăng ký..." : "Đăng ký tài khoản"}
            </Button>
          </div>

          <div className="text-center mt-6">
            <p className="text-body-sm text-body">
              Đã có tài khoản?{' '}
              <Link to="/login" className="font-semibold text-primary hover:text-primary-hover active:text-primary-active hover:underline underline-offset-4 transition-colors">
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
