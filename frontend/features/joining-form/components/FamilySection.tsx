import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Users, Phone, MapPin, Heart } from "lucide-react";
import type { FamilyMember } from "../types";

interface FamilySectionProps {
    familyMembers: FamilyMember[];
    addFamilyMember: () => void;
    updateFamilyMember: (index: number, field: keyof FamilyMember, value: string) => void;
    removeFamilyMember: (index: number) => void;
}

export const FamilySection = ({
    familyMembers,
    addFamilyMember,
    updateFamilyMember,
    removeFamilyMember
}: FamilySectionProps) => {
    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-50 rounded-lg text-pink-600">
                        <Users className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 tracking-tight">Immediate Family</h3>
                        <p className="text-sm text-gray-500">Details for emergency contact and benefits</p>
                    </div>
                </div>
                <Button
                    onClick={addFamilyMember}
                    variant="outline"
                    size="sm"
                    className="border-pink-200 text-pink-700 hover:bg-pink-50 hover:border-pink-300 font-bold transition-all px-6 py-5 rounded-xl shadow-sm"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Family Member
                </Button>
            </div>

            {familyMembers.length === 0 ? (
                <div className="text-center py-20 bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center gap-3 group hover:border-pink-200 transition-colors">
                    <Heart className="h-10 w-10 text-gray-300 group-hover:text-pink-300 transition-colors" />
                    <p className="text-gray-400 font-medium tracking-tight">No family members registered yet</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {familyMembers.map((member, index) => (
                        <div
                            key={index}
                            className="p-8 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-all relative group overflow-hidden border-l-4 border-l-pink-500"
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                                onClick={() => removeFamilyMember(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pr-8">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Member Type</Label>
                                    <Select
                                        value={member.member_type || ''}
                                        onValueChange={(val) => updateFamilyMember(index, 'member_type', val)}
                                    >
                                        <SelectTrigger className="h-11 border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="father">Father</SelectItem>
                                            <SelectItem value="mother">Mother</SelectItem>
                                            <SelectItem value="spouse">Spouse</SelectItem>
                                            <SelectItem value="child">Child</SelectItem>
                                            <SelectItem value="sibling">Sibling</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2 lg:col-span-1">
                                    <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Full Name</Label>
                                    <Input
                                        placeholder="Enter name"
                                        value={member.member_name || ''}
                                        onChange={(e) => updateFamilyMember(index, 'member_name', e.target.value)}
                                        className="h-11 border-gray-200 text-gray-700 font-medium"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Relation</Label>
                                    <Input
                                        placeholder="e.g. Guardian"
                                        value={member.relation || ''}
                                        onChange={(e) => updateFamilyMember(index, 'relation', e.target.value)}
                                        className="h-11 border-gray-200 text-gray-600"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Contact No.</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="Mobile number"
                                            value={member.contact || ''}
                                            onChange={(e) => updateFamilyMember(index, 'contact', e.target.value)}
                                            className="h-11 pl-10 border-gray-200"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Location</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="City/State"
                                            value={member.location || ''}
                                            onChange={(e) => updateFamilyMember(index, 'location', e.target.value)}
                                            className="h-11 pl-10 border-gray-200"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
