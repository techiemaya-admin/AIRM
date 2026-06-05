import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Activity, Ruler, Weight } from "lucide-react";
import type { EmployeeInfo } from "../types";

interface HealthSectionProps {
    employeeInfo: EmployeeInfo;
    updateEmployeeInfo: (field: keyof EmployeeInfo, value: string) => void;
}

export const HealthSection = ({ employeeInfo, updateEmployeeInfo }: HealthSectionProps) => {
    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3 mb-2">
                <Heart className="h-6 w-6 text-red-500 animate-pulse" />
                <h3 className="text-xl font-bold text-gray-800">Health Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4 hover:border-red-100 transition-all">
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-red-400" />
                        <Label htmlFor="blood_group" className="font-bold text-gray-700">Blood Group</Label>
                    </div>
                    <Input
                        id="blood_group"
                        value={employeeInfo.blood_group || ''}
                        onChange={e => updateEmployeeInfo("blood_group", e.target.value)}
                        placeholder="e.g. O+, AB-"
                        className="h-12 text-center text-lg font-bold border-none bg-red-50/30 focus:bg-white focus:ring-2 focus:ring-red-500 transition-all"
                    />
                </div>

                <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4 hover:border-blue-100 transition-all">
                    <div className="flex items-center gap-2">
                        <Ruler className="h-4 w-4 text-blue-400" />
                        <Label htmlFor="height" className="font-bold text-gray-700">Height (cm)</Label>
                    </div>
                    <Input
                        id="height"
                        value={employeeInfo.height || ''}
                        onChange={e => updateEmployeeInfo("height", e.target.value)}
                        placeholder="Height in CM"
                        className="h-12 text-center text-lg font-bold border-none bg-blue-50/30 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                </div>

                <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-4 hover:border-emerald-100 transition-all">
                    <div className="flex items-center gap-2">
                        <Weight className="h-4 w-4 text-emerald-400" />
                        <Label htmlFor="weight" className="font-bold text-gray-700">Weight (kg)</Label>
                    </div>
                    <Input
                        id="weight"
                        value={employeeInfo.weight || ''}
                        onChange={e => updateEmployeeInfo("weight", e.target.value)}
                        placeholder="Weight in KG"
                        className="h-12 text-center text-lg font-bold border-none bg-emerald-50/30 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                </div>

                <div className="md:col-span-2 lg:col-span-3 p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-gray-400" />
                        <Label htmlFor="medical_history" className="font-bold text-gray-700 tracking-tight">Medical History / Allergies</Label>
                    </div>
                    <Textarea
                        id="medical_history"
                        value={employeeInfo.medical_history || ''}
                        onChange={e => updateEmployeeInfo("medical_history", e.target.value)}
                        placeholder="Please mention any long-term medical conditions, surgeries, or allergies..."
                        rows={4}
                        className="bg-white border-gray-200 focus:ring-red-500 transition-all text-gray-600 leading-relaxed rounded-2xl"
                    />
                    <p className="text-[10px] text-gray-400 italic px-2">
                        * This information is kept confidential and only used for medical emergencies and health insurance purposes.
                    </p>
                </div>
            </div>
        </div>
    );
};
