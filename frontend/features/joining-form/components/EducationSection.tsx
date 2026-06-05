import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GraduationCap } from "lucide-react";
import type { AcademicInfo } from "../types";

interface EducationSectionProps {
    academicInfo: AcademicInfo[];
    addAcademicInfo: () => void;
    updateAcademicInfo: (index: number, field: keyof AcademicInfo, value: string | number) => void;
    removeAcademicInfo: (index: number) => void;
}

export const EducationSection = ({
    academicInfo,
    addAcademicInfo,
    updateAcademicInfo,
    removeAcademicInfo
}: EducationSectionProps) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-purple-600" />
                    <h3 className="text-lg font-semibold">Educational Qualifications</h3>
                </div>
                <Button onClick={addAcademicInfo} variant="outline" size="sm" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Qualification
                </Button>
            </div>

            {academicInfo.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-gray-50/50 rounded-2xl border-2 border-dashed">
                    No records added. Add your highest degree first.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {academicInfo.map((edu, idx) => (
                        <div key={idx} className="p-6 bg-white border rounded-2xl shadow-sm hover:shadow-md transition-shadow relative group">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeAcademicInfo(idx)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pr-8">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-gray-500">Qualification</Label>
                                    <Input
                                        value={edu.qualification}
                                        onChange={e => updateAcademicInfo(idx, "qualification", e.target.value)}
                                        placeholder="e.g. B.Tech, MBA"
                                        className="border-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-gray-500">Specialization</Label>
                                    <Input
                                        value={edu.specialization}
                                        onChange={e => updateAcademicInfo(idx, "specialization", e.target.value)}
                                        placeholder="e.g. Computer Science"
                                        className="border-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-gray-500">Institution</Label>
                                    <Input
                                        value={edu.institution_name}
                                        onChange={e => updateAcademicInfo(idx, "institution_name", e.target.value)}
                                        placeholder="Enter college/school name"
                                        className="border-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-gray-500">Board / University</Label>
                                    <Input
                                        value={edu.board_university}
                                        onChange={e => updateAcademicInfo(idx, "board_university", e.target.value)}
                                        placeholder="e.g. CBSE, VTU"
                                        className="border-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-gray-500">Passout Year</Label>
                                    <Input
                                        type="number"
                                        value={edu.passout_year}
                                        onChange={e => updateAcademicInfo(idx, "passout_year", parseInt(e.target.value))}
                                        className="border-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-gray-500">Percentage / CGPA</Label>
                                    <Input
                                        value={edu.grade_percentage}
                                        onChange={e => updateAcademicInfo(idx, "grade_percentage", e.target.value)}
                                        placeholder="e.g. 85% or 8.5"
                                        className="border-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all"
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
