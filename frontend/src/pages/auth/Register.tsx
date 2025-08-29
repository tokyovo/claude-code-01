import React from 'react';
import { RegisterForm } from '../../components/forms';
import { GuestRoute } from '../../components/routing';

const Register: React.FC = () => {
  return (
    <GuestRoute>
      <RegisterForm />
    </GuestRoute>
  );
};

export default Register;
