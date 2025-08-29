import React from 'react';
import { LoginForm } from '../../components/forms';
import { GuestRoute } from '../../components/routing';

const Login: React.FC = () => {
  return (
    <GuestRoute>
      <LoginForm />
    </GuestRoute>
  );
};

export default Login;
