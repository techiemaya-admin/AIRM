import React from 'react';
import { useParams } from 'react-router-dom';
import { EmployeeOnboarding } from '../components/EmployeeOnboarding';

export const OnboardingPage: React.FC = () => {
  const { employeeId } = useParams<{ employeeId?: string }>();

  return <EmployeeOnboarding employeeId={employeeId} />;
};
