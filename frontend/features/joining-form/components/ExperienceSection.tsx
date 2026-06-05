import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Briefcase, Calendar } from "lucide-react";
import type { PreviousEmployment } from "../types";

interface ExperienceSectionProps {
    previousEmployment: PreviousEmployment[];
    addPreviousEmployment: () => void;
    updatePreviousEmployment: (index: number, field: keyof PreviousEmployment, value: string) => void;
    removePreviousEmployment: (index: number) => void;
}

export const ExperienceSection = ({
    previousEmployment,
    addPreviousEmployment,
    updatePreviousEmployment,
    removePreviousEmployment
}: ExperienceSectionProps) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-amber-600" />
                    <h3 className="text-lg font-semibold">Professional Experience</h3>
                </div>
                <Button onClick={addPreviousEmployment} variant="outline" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-50">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Experience
                </Button>
            </div>

            {previousEmployment.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-gray-50/50 rounded-2xl border-2 border-dashed">
                    No experience records. Freshers can leave this blank.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {previousEmployment.map((exp, idx) => (
                        <div key={idx} className="p-8 bg-white border rounded-3xl shadow-sm hover:shadow-md transition-all relative group border-l-4 border-l-amber-500">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-6 right-6 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removePreviousEmployment(idx)}
                            >
                                <Trash2 className="h-5 w-5" />
                            </Button>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pr-12">
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-600">Company Name</Label>
                                    <Input
                                        value={exp.employer_name}
                                        onChange={e => updatePreviousEmployment(idx, "employer_name", e.target.value)}
                                        placeholder="Enter previous employer"
                                        className="h-12 text-lg font-semibold bg-gray-50/50 border-gray-100 focus:bg-white transition-all shadow-inner"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-600">Designation</Label>
                                    <Input
                                        value={exp.designation}
                                        onChange={e => updatePreviousEmployment(idx, "designation", e.target.value)}
                                        placeholder="e.g. Senior Developer"
                                        className="h-12 border-gray-100"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-600">Monthly Salary</Label>
                                    <Input
                                        value={exp.salary}
                                        onChange={e => updatePreviousEmployment(idx, "salary", e.target.value)}
                                        placeholder="Gross monthly"
                                        className="h-12 border-gray-100"
                                    />
                                </div>

                                <div className="space-y-4 lg:col-span-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Calendar className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm font-bold text-gray-600">Employment Period</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase text-gray-400 tracking-wider">From</Label>
                                            <Input
                                                type="date"
                                                value={exp.duration_from}
                                                onChange={e => updatePreviousEmployment(idx, "duration_from", e.target.value)}
                                                className="border-gray-100"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase text-gray-400 tracking-wider">To</Label>
                                            <Input
                                                type="date"
                                                value={exp.duration_to}
                                                onChange={e => updatePreviousEmployment(idx, "duration_to", e.target.value)}
                                                className="border-gray-100"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 lg:col-span-1">
                                    <Label className="text-sm font-bold text-gray-600">Reason for Leaving</Label>
                                    <Input
                                        value={exp.reason_for_leaving}
                                        onChange={e => updatePreviousEmployment(idx, "reason_for_leaving", e.target.value)}
                                        placeholder="Brief reason"
                                        className="h-12 border-gray-100"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
