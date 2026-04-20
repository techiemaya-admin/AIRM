import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { User, Mail, Phone, MapPin, Building2, CreditCard, Activity, Globe } from "lucide-react";
import type { EmployeeInfo } from "../types";

interface BasicInfoSectionProps {
    employeeInfo: EmployeeInfo;
    updateEmployeeInfo: (field: keyof EmployeeInfo, value: any) => void;
}

export const BasicInfoSection = ({ employeeInfo, updateEmployeeInfo }: BasicInfoSectionProps) => {
    return (
        <div className="space-y-12 max-w-5xl mx-auto">
            {/* Personal Details Section */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-100">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <User className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 tracking-tight">Personal Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Full Name</Label>
                        <Input
                            placeholder="As per official documents"
                            value={employeeInfo.full_name || ''}
                            onChange={(e) => updateEmployeeInfo('full_name', e.target.value)}
                            className="h-11 border-gray-200 focus:ring-blue-500 text-gray-700"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Date of Birth</Label>
                        <Input
                            type="date"
                            value={employeeInfo.date_of_birth?.split('T')[0] || ''}
                            onChange={(e) => updateEmployeeInfo('date_of_birth', e.target.value)}
                            className="h-11 border-gray-200 focus:ring-blue-500 text-gray-700"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Gender</Label>
                        <Select
                            value={employeeInfo.gender || ''}
                            onValueChange={(val) => updateEmployeeInfo('gender', val)}
                        >
                            <SelectTrigger className="h-11 border-gray-200 text-gray-700">
                                <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Marital Status</Label>
                        <Select
                            value={employeeInfo.marital_status || ''}
                            onValueChange={(val) => updateEmployeeInfo('marital_status', val)}
                        >
                            <SelectTrigger className="h-11 border-gray-200 text-gray-700">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="single">Single</SelectItem>
                                <SelectItem value="married">Married</SelectItem>
                                <SelectItem value="divorced">Divorced</SelectItem>
                                <SelectItem value="widowed">Widowed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Blood Group</Label>
                        <Input
                            placeholder="e.g. O+"
                            value={employeeInfo.blood_group || ''}
                            onChange={(e) => updateEmployeeInfo('blood_group', e.target.value)}
                            className="h-11 border-gray-200 focus:ring-blue-500 text-gray-700 uppercase"
                        />
                    </div>
                </div>
            </section>

            {/* Employment & Contact Section */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-100">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <Building2 className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 tracking-tight">Work & Contact Info</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Official Email</Label>
                        <div className="relative flex items-center">
                            <Mail className="absolute left-3 h-4 w-4 text-gray-400" />
                            <Input
                                value={employeeInfo.email || ''}
                                onChange={(e) => updateEmployeeInfo('email', e.target.value)}
                                className="h-11 pl-10 border-gray-200 focus:ring-blue-500 text-gray-700"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Personal Email</Label>
                        <Input
                            placeholder="Alternative email"
                            value={employeeInfo.personal_email || ''}
                            onChange={(e) => updateEmployeeInfo('personal_email', e.target.value)}
                            className="h-11 border-gray-200 focus:ring-blue-500 text-gray-700"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Phone Number</Label>
                        <div className="relative flex items-center">
                            <Phone className="absolute left-3 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Mobile number"
                                value={employeeInfo.phone || ''}
                                onChange={(e) => updateEmployeeInfo('phone', e.target.value)}
                                className="h-11 pl-10 border-gray-200 focus:ring-blue-500 text-gray-700"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Designation</Label>
                        <Input
                            value={employeeInfo.designation || ''}
                            onChange={(e) => updateEmployeeInfo('designation', e.target.value)}
                            className="h-11 border-gray-200 focus:ring-blue-500 text-gray-700"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Department</Label>
                        <Input
                            value={employeeInfo.department || ''}
                            onChange={(e) => updateEmployeeInfo('department', e.target.value)}
                            className="h-11 border-gray-200 focus:ring-blue-500 text-gray-700"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Employee ID</Label>
                        <Input
                            placeholder="ERP ID"
                            value={employeeInfo.employee_id || ''}
                            onChange={(e) => updateEmployeeInfo('employee_id', e.target.value)}
                            className="h-11 border-gray-200 bg-gray-50/50"
                        />
                    </div>
                </div>
            </section>

            {/* Address Section */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-900">
                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-100">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                        <MapPin className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 tracking-tight">Address Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2 p-6 bg-gray-50/30 rounded-2xl border border-gray-100">
                        <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Current Address</Label>
                        <Textarea
                            placeholder="Enter complete current address"
                            value={employeeInfo.current_address || ''}
                            onChange={(e) => updateEmployeeInfo('current_address', e.target.value)}
                            className="min-h-[100px] border-gray-200 focus:bg-white transition-all bg-transparent"
                        />
                    </div>
                    <div className="space-y-2 p-6 bg-gray-50/30 rounded-2xl border border-gray-100">
                        <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Permanent Address</Label>
                        <Textarea
                            placeholder="Enter complete permanent address"
                            value={employeeInfo.permanent_address || ''}
                            onChange={(e) => updateEmployeeInfo('permanent_address', e.target.value)}
                            className="min-h-[100px] border-gray-200 focus:bg-white transition-all bg-transparent"
                        />
                    </div>
                </div>
            </section>

            {/* Financial Info Section */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-100">
                    <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                        <CreditCard className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 tracking-tight">Bank & Statutory Details</h3>
                </div>

                <div className="p-8 bg-white border border-gray-100 rounded-3xl shadow-sm space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Bank Name</Label>
                            <Input
                                placeholder="Central Bank"
                                value={employeeInfo.bank_name || ''}
                                onChange={(e) => updateEmployeeInfo('bank_name', e.target.value)}
                                className="h-11 border-gray-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">IFSC Code</Label>
                            <Input
                                placeholder="IFSC123456"
                                value={employeeInfo.bank_ifsc || ''}
                                onChange={(e) => updateEmployeeInfo('bank_ifsc', e.target.value)}
                                className="h-11 border-gray-200 uppercase"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Branch</Label>
                            <Input
                                placeholder="Branch name"
                                value={employeeInfo.bank_branch || ''}
                                onChange={(e) => updateEmployeeInfo('bank_branch', e.target.value)}
                                className="h-11 border-gray-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Account Number</Label>
                            <Input
                                placeholder="0000 0000 0000"
                                value={employeeInfo.bank_account_number || ''}
                                onChange={(e) => updateEmployeeInfo('bank_account_number', e.target.value)}
                                className="h-11 border-gray-200 font-mono tracking-widest"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-50">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">GOVT ID</span>
                                <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">UAN Number</Label>
                            </div>
                            <Input
                                placeholder="Universal Account Number"
                                value={employeeInfo.uan_number || ''}
                                onChange={(e) => updateEmployeeInfo('uan_number', e.target.value)}
                                className="h-11 border-gray-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">GOVT ID</span>
                                <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">PF Number</Label>
                            </div>
                            <Input
                                placeholder="EPF ID"
                                value={employeeInfo.pf_number || ''}
                                onChange={(e) => updateEmployeeInfo('pf_number', e.target.value)}
                                className="h-11 border-gray-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                                <Globe className="h-3.5 w-3.5 text-gray-400" />
                                <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Languages Known</Label>
                            </div>
                            <Input
                                placeholder="English, French..."
                                value={Array.isArray(employeeInfo.languages_known) ? employeeInfo.languages_known.join(', ') : employeeInfo.languages_known || ''}
                                onChange={(e) => updateEmployeeInfo('languages_known', e.target.value.split(',').map(s => s.trim()))}
                                className="h-11 border-gray-200"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Additional Info */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-1200 pb-12">
                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-100">
                    <div className="p-2 bg-red-50 rounded-lg text-red-600">
                        <Activity className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 tracking-tight">Additional Medical Info</h3>
                </div>
                <div className="p-6 bg-red-50/20 rounded-2xl border border-red-100">
                    <Textarea
                        placeholder="Please mention any specific medical requirements or allergies for office safety..."
                        value={employeeInfo.medical_history || ''}
                        onChange={(e) => updateEmployeeInfo('medical_history', e.target.value)}
                        className="min-h-[120px] bg-white/50 border-red-100 focus:bg-white focus:ring-red-500 leading-relaxed"
                    />
                </div>
            </section>
        </div>
    );
};
