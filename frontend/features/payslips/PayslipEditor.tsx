import React, { useState } from 'react';

const initialFields = {
  employee_name: '',
  employee_code: '',
  joiningdate: '',
  designation: '',
  department: '',
  effective_work_days: '',
  lop: '',
  bank_name: '',
  bank_account: '',
  pan_number: '',
  location: '',
  leave_balance: '',
  basic_salary: '',
  hra: '',
  other_allowances: '',
  pt: '',
  total_earnings: '',
  total_deduction: '',
  net_pay: '',
  rupees_in_words: '',
};

export default function PayslipEditor() {
  const [fields, setFields] = useState(initialFields);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Editable Form */}
      <form className="w-full md:w-1/2 bg-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4">Edit Payslip Fields</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1" htmlFor="employee_name">Employee Name</label><input type="text" id="employee_name" name="employee_name" value={fields.employee_name} onChange={handleChange} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="block text-sm font-medium mb-1" htmlFor="employee_code">Employee Code</label><input type="text" id="employee_code" name="employee_code" value={fields.employee_code} onChange={handleChange} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="block text-sm font-medium mb-1" htmlFor="joiningdate">Joining Date</label><input type="date" id="joiningdate" name="joiningdate" value={fields.joiningdate} onChange={handleChange} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="block text-sm font-medium mb-1" htmlFor="designation">Designation</label><input type="text" id="designation" name="designation" value={fields.designation} onChange={handleChange} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="block text-sm font-medium mb-1" htmlFor="department">Department</label><input type="text" id="department" name="department" value={fields.department} onChange={handleChange} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="block text-sm font-medium mb-1" htmlFor="effective_work_days">Effective Work Days</label><input type="text" id="effective_work_days" name="effective_work_days" value={fields.effective_work_days} onChange={handleChange} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="block text-sm font-medium mb-1" htmlFor="lop">LOP</label><input type="text" id="lop" name="lop" value={fields.lop} onChange={handleChange} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="block text-sm font-medium mb-1" htmlFor="bank_name">Bank Name</label><input type="text" id="bank_name" name="bank_name" value={fields.bank_name} onChange={handleChange} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="block text-sm font-medium mb-1" htmlFor="bank_account">Bank Account No</label><input type="text" id="bank_account" name="bank_account" value={fields.bank_account} onChange={handleChange} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="block text-sm font-medium mb-1" htmlFor="pan_number">PAN Number</label><input type="text" id="pan_number" name="pan_number" value={fields.pan_number} onChange={handleChange} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="block text-sm font-medium mb-1" htmlFor="location">Location</label><input type="text" id="location" name="location" value={fields.location} onChange={handleChange} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="block text-sm font-medium mb-1" htmlFor="leave_balance">Leave Balance</label><input type="text" id="leave_balance" name="leave_balance" value={fields.leave_balance} onChange={handleChange} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="block text-sm font-medium mb-1" htmlFor="basic_salary">Basic Salary</label><input type="text" id="basic_salary" name="basic_salary" value={fields.basic_salary} onChange={handleChange} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="block text-sm font-medium mb-1" htmlFor="hra">HRA</label><input type="text" id="hra" name="hra" value={fields.hra} onChange={handleChange} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="block text-sm font-medium mb-1" htmlFor="other_allowances">Other Allowances</label><input type="text" id="other_allowances" name="other_allowances" value={fields.other_allowances} onChange={handleChange} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="block text-sm font-medium mb-1" htmlFor="pt">PT</label><input type="text" id="pt" name="pt" value={fields.pt} onChange={handleChange} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="block text-sm font-medium mb-1" htmlFor="total_earnings">Total Earnings</label><input type="text" id="total_earnings" name="total_earnings" value={fields.total_earnings} onChange={handleChange} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="block text-sm font-medium mb-1" htmlFor="total_deduction">Total Deduction</label><input type="text" id="total_deduction" name="total_deduction" value={fields.total_deduction} onChange={handleChange} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="block text-sm font-medium mb-1" htmlFor="net_pay">Net Pay</label><input type="text" id="net_pay" name="net_pay" value={fields.net_pay} onChange={handleChange} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="block text-sm font-medium mb-1" htmlFor="rupees_in_words">Rupees in Words</label><input type="text" id="rupees_in_words" name="rupees_in_words" value={fields.rupees_in_words} onChange={handleChange} className="w-full border rounded px-2 py-1" /></div>
        </div>
      </form>
      {/* Live Preview */}
      <div className="w-full md:w-1/2 bg-gray-50 p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4">Payslip Preview</h2>
        <div className="border p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div>Name: {fields.employee_name}</div>
              <div>Joining Date: {fields.joiningdate}</div>
              <div>Designation: {fields.designation}</div>
              <div>Department: {fields.department}</div>
              <div>Effective Work Days: {fields.effective_work_days}</div>
              <div>LOP: {fields.lop}</div>
            </div>
            <div>
              <div>Employee Code: {fields.employee_code}</div>
              <div>Bank Name: {fields.bank_name}</div>
              <div>Bank Account No: {fields.bank_account}</div>
              <div>PAN Number: {fields.pan_number}</div>
              <div>Location: {fields.location}</div>
              <div>Leave Balance: {fields.leave_balance}</div>
            </div>
          </div>
          <table className="w-full border mb-4">
            <thead>
              <tr>
                <th className="border px-2 py-1">Earnings</th>
                <th className="border px-2 py-1">Amount</th>
                <th className="border px-2 py-1">Deductions</th>
                <th className="border px-2 py-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-2 py-1">Basic Salary</td>
                <td className="border px-2 py-1">{fields.basic_salary}</td>
                <td className="border px-2 py-1">PT</td>
                <td className="border px-2 py-1">{fields.pt}</td>
              </tr>
              <tr>
                <td className="border px-2 py-1">HRA</td>
                <td className="border px-2 py-1">{fields.hra}</td>
                <td className="border px-2 py-1"></td>
                <td className="border px-2 py-1"></td>
              </tr>
              <tr>
                <td className="border px-2 py-1">Other Allowances</td>
                <td className="border px-2 py-1">{fields.other_allowances}</td>
                <td className="border px-2 py-1"></td>
                <td className="border px-2 py-1"></td>
              </tr>
            </tbody>
          </table>
          <div className="mb-2">Total Earnings: {fields.total_earnings} &nbsp; Total Deduction: {fields.total_deduction}</div>
          <div className="mb-2">Net Pay for the month: {fields.net_pay}</div>
          <div className="text-sm italic">({fields.rupees_in_words})</div>
          <div className="mt-4 text-xs text-gray-500">This payslip is a generated payslip, does not require a signature</div>
        </div>
      </div>
    </div>
  );
}
