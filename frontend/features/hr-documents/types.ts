export interface UploadedTemplate {
  name: string;
  type: 'docx' | 'pdf';
  content: ArrayBuffer;
  file: File;
}

export interface EmployeeData {
  employee_name: string;
  employee_id: string;
  designation: string;
  department: string;
  date_of_joining: string;
  date_of_leaving: string;
  salary: string;
  address: string;
  email: string;
  phone: string;
  manager_name: string;
  company_name: string;
  bank_name: string;
  bank_account: string;
  ifsc: string;
  pan_number: string;
  location: string;
  leave_balance: string;
  leave_availed: string;
  effective_work_days: string;
  lop: string;
  basic_salary: string;
  hra: string;
  other_allowances: string;
  pt: string;
  total_earnings: string;
  total_deduction: string;
  net_pay: string;
  rupees_in_words: string;
}

export const defaultEmployeeData: EmployeeData = {
  employee_name: '',
  employee_id: '',
  designation: '',
  department: '',
  date_of_joining: '',
  date_of_leaving: '',
  salary: '',
  address: '',
  email: '',
  phone: '',
  manager_name: '',
  company_name: '',
  bank_name: '',
  bank_account: '',
  ifsc: '',
  pan_number: '',
  location: '',
  leave_balance: '',
  leave_availed: '',
  effective_work_days: '',
  lop: '',
  basic_salary: '',
  hra: '',
  other_allowances: '',
  pt: '',
  total_earnings: '',
  total_deduction: '',
  net_pay: '',
  rupees_in_words: '',
};
