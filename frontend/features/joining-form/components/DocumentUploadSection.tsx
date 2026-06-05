import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldCheck, GraduationCap, Briefcase, FileUp, CheckCircle, Download, Upload, Trash2 } from "lucide-react";
import { EmployeeDocument, DOCUMENT_CATEGORIES } from "../../profiles/types";
import { downloadDocument } from "@sdk/documentService";
import { useRef, useState } from "react";

interface DocumentUploadSectionProps {
    handleKycUpload: (e: React.ChangeEvent<HTMLInputElement>, category: string, type: string) => void;
    handleDocumentDelete: (doc: EmployeeDocument) => Promise<void>;
    uploadedDocuments: EmployeeDocument[];
}

export const DocumentUploadSection = ({ handleKycUpload, handleDocumentDelete, uploadedDocuments }: DocumentUploadSectionProps) => {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    // Per-doc hidden file input refs for reupload
    const reuploadRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const documentGroups = [
        {
            title: "Identity & Address Proof",
            icon: <ShieldCheck className="h-5 w-5 text-blue-600" />,
            bgColor: "bg-blue-50",
            docs: [
                { id: "aadhaar", label: "Aadhaar Card", category: DOCUMENT_CATEGORIES.KYC_DOCUMENTS, type: 'Aadhaar' },
                { id: "utility_bill", label: "Electricity / Utility Bill", category: DOCUMENT_CATEGORIES.KYC_DOCUMENTS, type: 'Electricity / Utility Bill' },
                { id: "pan", label: "PAN Card", category: DOCUMENT_CATEGORIES.KYC_DOCUMENTS, type: 'PAN' },
                { id: "photo", label: "Photo", category: DOCUMENT_CATEGORIES.KYC_DOCUMENTS, type: 'Photo' },
                { id: "bank_account", label: "Bank Account Details", category: DOCUMENT_CATEGORIES.KYC_DOCUMENTS, type: 'Bank Account' },
            ]
        },
        {
            title: "Education Certificates",
            icon: <GraduationCap className="h-5 w-5 text-purple-600" />,
            bgColor: "bg-purple-50",
            docs: [
                { id: "ssc", label: "SSC (10th) Certificate", category: DOCUMENT_CATEGORIES.EDUCATION_CERTIFICATES, type: 'SSC' },
                { id: "hsc", label: "HSC (12th) Certificate", category: DOCUMENT_CATEGORIES.EDUCATION_CERTIFICATES, type: 'HSC' },
                { id: "graduation", label: "Graduation Certificate", category: DOCUMENT_CATEGORIES.EDUCATION_CERTIFICATES, type: 'Graduation' },
                { id: "post_graduation", label: "Post Graduation Certificate", category: DOCUMENT_CATEGORIES.EDUCATION_CERTIFICATES, type: 'Post Graduation' },
            ]
        },
        {
            title: "Experience & Employment Documents",
            icon: <Briefcase className="h-5 w-5 text-amber-600" />,
            bgColor: "bg-amber-50",
            docs: [
                { id: "experience_letter", label: "Previous Experience Letter", category: DOCUMENT_CATEGORIES.EXPERIENCE_DOCUMENTS, type: 'Experience Letter' },
                { id: "salary_slips", label: "Salary Slips (Last 3 Months)", category: DOCUMENT_CATEGORIES.EXPERIENCE_DOCUMENTS, type: 'Previous Company Salary Slips' },
                { id: "offer_letter", label: "Offer / Appointment Letter", category: DOCUMENT_CATEGORIES.EXPERIENCE_DOCUMENTS, type: 'Previous Company Offer / Appointment Letter' },
                { id: "resume", label: "Resume / CV", category: DOCUMENT_CATEGORIES.EXPERIENCE_DOCUMENTS, type: 'Resume' },
            ]
        }
    ];

    const getUploadedDoc = (category: string, type: string) => {
        return uploadedDocuments.find(d => d.document_category === category && d.document_type === type);
    };

    const handleDownload = async (doc: EmployeeDocument) => {
        try {
            const blob = await downloadDocument(doc.id);
            const url = window.URL.createObjectURL(blob);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = doc.file_name;
            window.document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            window.document.body.removeChild(a);
        } catch (error) {
            console.error("Download failed", error);
        }
    };

    return (
        <div className="space-y-10">
            <div className="flex items-center gap-2 mb-6 border-b pb-4">
                <FileUp className="h-6 w-6 text-gray-700" />
                <h2 className="text-xl font-bold text-gray-900">Document Uploads</h2>
            </div>

            {documentGroups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${group.bgColor}`}>
                            {group.icon}
                        </div>
                        <h3 className="font-bold text-gray-800 tracking-tight">{group.title}</h3>
                    </div>

                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 rounded-2xl border bg-white shadow-sm`}>
                        {group.docs.map((doc) => {
                            const uploadedDoc = getUploadedDoc(doc.category, doc.type);
                            return (
                                <div key={doc.id} className="space-y-2 group">
                                    <Label htmlFor={doc.id} className="text-sm font-semibold text-gray-600 group-hover:text-blue-600 transition-colors">
                                        {doc.label}
                                    </Label>
                                    <div className="relative">
                                        {uploadedDoc ? (
                                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                                <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-2">
                                                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate max-w-[150px]" title={uploadedDoc.file_name}>
                                                        {uploadedDoc.file_name}
                                                    </span>
                                                </div>
                                                {/* Hidden file input for reupload */}
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    ref={(el) => { reuploadRefs.current[doc.id] = el; }}
                                                    onChange={(e) => handleKycUpload(e, doc.category, doc.type)}
                                                />
                                                <div className="flex gap-1.5 flex-wrap">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-xs flex-1 bg-white text-green-700 border-green-200 hover:bg-green-100"
                                                        onClick={() => handleDownload(uploadedDoc)}
                                                    >
                                                        <Download className="h-3 w-3 mr-1" /> Download
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-xs flex-1 bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                                                        onClick={() => reuploadRefs.current[doc.id]?.click()}
                                                    >
                                                        <Upload className="h-3 w-3 mr-1" /> Reupload
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={deletingId === uploadedDoc.id}
                                                        className="h-7 text-xs flex-1 bg-white text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-60"
                                                        onClick={async () => {
                                                            setDeletingId(uploadedDoc.id);
                                                            try {
                                                                await handleDocumentDelete(uploadedDoc);
                                                            } finally {
                                                                setDeletingId(null);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-3 w-3 mr-1" />
                                                        {deletingId === uploadedDoc.id ? 'Deleting…' : 'Delete'}
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Input
                                                id={doc.id}
                                                type="file"
                                                onChange={(e) => handleKycUpload(e, doc.category, doc.type)}
                                                className="cursor-pointer file:cursor-pointer file:bg-gray-50 file:border-0 file:text-blue-700 file:font-semibold hover:file:bg-blue-50 transition-all border-dashed"
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-800 leading-relaxed">
                    <p className="font-bold mb-1">Upload Guidelines:</p>
                    <ul className="list-disc ml-4 space-y-1">
                        <li>Files should be in PDF, JPG, or PNG format.</li>
                        <li>Maximum file size per document is 5MB.</li>
                        <li>Ensure the copies are clear and all information is legible.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
