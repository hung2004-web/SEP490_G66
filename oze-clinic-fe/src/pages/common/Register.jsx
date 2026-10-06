import React from 'react';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Link } from 'react-router-dom';

const Register = () => {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-var(--spacing-topbar))] bg-surface-tint py-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl w-full p-10 bg-canvas rounded-2xl shadow-lg border border-border">
        <div className="text-center mb-10">
          <h2 className="text-[32px] font-bold text-ink font-heading tracking-tight">Create your account</h2>
          <p className="mt-3 text-body-md text-body max-w-md mx-auto leading-relaxed">
            Join OZE Dental to easily book appointments, access your clinical records, and manage your health journey.
          </p>
        </div>

        <form className="space-y-8" action="#" method="POST">
          <div className="grid grid-cols-1 gap-y-6 gap-x-8 sm:grid-cols-2">

            <div className="sm:col-span-2">
              <Input
                id="fullname"
                name="fullname"
                type="text"
                placeholder="e.g. Nguyen Van A"
                label={<>Full name <span className="text-danger-solid">*</span></>}
                required
              />
            </div>

            <div>
              <Input
                id="birthdate"
                name="birthdate"
                type="date"
                label={<>Date of birth <span className="text-danger-solid">*</span></>}
                required
              />
            </div>

            <div>
              <label className="block text-label text-ink mb-1.5">
                Gender <span className="text-danger-solid">*</span>
              </label>
              <div className="flex items-center gap-6 h-11">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    className="w-4 h-4 text-primary bg-canvas border-border-strong focus:ring-primary focus:ring-offset-1 transition-all"
                    defaultChecked
                  />
                  <span className="text-body-sm text-ink group-hover:text-primary transition-colors">Male</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    className="w-4 h-4 text-primary bg-canvas border-border-strong focus:ring-primary focus:ring-offset-1 transition-all"
                  />
                  <span className="text-body-sm text-ink group-hover:text-primary transition-colors">Female</span>
                </label>
              </div>
            </div>

            <div>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="09xx xxx xxx"
                label={<>Phone number <span className="text-danger-solid">*</span></>}
                required
              />
            </div>

            <div>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                label="Email address (optional)"
              />
            </div>

            <div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="At least 8 characters"
                label={<>Password <span className="text-danger-solid">*</span></>}
                required
              />
            </div>

            <div>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                placeholder="Re-enter password"
                label={<>Confirm password <span className="text-danger-solid">*</span></>}
                required
              />
            </div>

          </div>

          <div className="pt-4">
            <Button
              type="submit"
              variant="cta-public"
              className="w-full text-base"
            >
              Register account
            </Button>
          </div>

          <div className="text-center mt-6">
            <p className="text-body-sm text-body">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary hover:text-primary-hover active:text-primary-active hover:underline underline-offset-4 transition-colors">
                Sign in now
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
