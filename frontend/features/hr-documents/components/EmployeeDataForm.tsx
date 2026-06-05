import { User, Briefcase, Building, Calendar, DollarSign, MapPin, Mail, Phone, CreditCard } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmployeeData } from '../types';

interface EmployeeDataFormProps {
  data: EmployeeData;
  onChange: (data: EmployeeData) => void;
}

const formFields = [
  { key: 'employee_name', label: 'Employee Name', icon: User, placeholder: 'John Doe' },
  { key: 'employee_id', label: 'Employee Code', icon: Briefcase, placeholder: 'EMP001' },
  { key: 'date_of_joining', label: 'Joining Date', icon: Calendar, placeholder: '01 Jan 2024' },
  { key: 'designation', label: 'Designation', icon: Briefcase, placeholder: 'Software Engineer' },
  { key: 'department', label: 'Department', icon: Building, placeholder: 'Engineering' },
  { key: 'effective_work_days', label: 'Effective Work Days', icon: Calendar, placeholder: '22' },
  { key: 'lop', label: 'LOP', icon: Calendar, placeholder: '0' },
  { key: 'leave_balance', label: 'Leave Balance', icon: Calendar, placeholder: '10' },
  { key: 'leave_availed', label: 'Leave Availed', icon: Calendar, placeholder: '0' },
  { key: 'bank_name', label: 'Bank Name', icon: CreditCard, placeholder: 'HDFC Bank' },
  { key: 'bank_account', label: 'Bank Account No', icon: CreditCard, placeholder: '1234567890' },
  { key: 'ifsc', label: 'IFSC Code', icon: CreditCard, placeholder: 'HDFC0001234' },
  { key: 'pan_number', label: 'PAN Number', icon: Briefcase, placeholder: 'ABCDE1234F' },
  { key: 'location', label: 'Location', icon: MapPin, placeholder: 'Bangalore' },
  { key: 'email', label: 'Email', icon: Mail, placeholder: 'john@company.com' },
  { key: 'phone', label: 'Phone', icon: Phone, placeholder: '9876543210' },
  { key: 'basic_salary', label: 'Basic Salary', icon: DollarSign, placeholder: '30000' },
  { key: 'hra', label: 'HRA', icon: DollarSign, placeholder: '10000' },
  { key: 'other_allowances', label: 'Other Allowances', icon: DollarSign, placeholder: '5000' },
  { key: 'pt', label: 'Professional Tax', icon: DollarSign, placeholder: '200' },
  { key: 'total_earnings', label: 'Gross Payable', icon: DollarSign, placeholder: '45000' },
  { key: 'total_deduction', label: 'Total Deduction', icon: DollarSign, placeholder: '200' },
  { key: 'net_pay', label: 'Net Pay', icon: DollarSign, placeholder: '44800' },
  { key: 'rupees_in_words', label: 'Rupees in Words', icon: Briefcase, placeholder: 'Forty Four Thousand Eight Hundred Only' },
];

const EmployeeDataForm = ({ data, onChange }: EmployeeDataFormProps) => {
  const handleChange = (key: string, value: string) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {formFields.map(({ key, label, icon: Icon, placeholder }) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={key} className="text-sm font-medium flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            {label}
          </Label>
          <Input
            id={key}
            type="text"
            value={data[key as keyof EmployeeData] ?? ''}
            onChange={(e) => handleChange(key, e.target.value)}
            placeholder={placeholder}
            className="h-9"
          />
        </div>
      ))}
    </div>
  );
};

export default EmployeeDataForm;
