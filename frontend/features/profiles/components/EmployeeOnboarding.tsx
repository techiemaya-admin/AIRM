import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { CheckCircle, Upload, FileText, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { DocumentUpload } from './DocumentUpload';
import { DOCUMENT_CATEGORIES, DOCUMENT_TYPES } from '../types';
import { getEmployeeDocuments } from '@sdk/documentService';
import { toast } from 'sonner';

interface EmployeeOnboardingProps {
  employeeId?: string;
}

interface DocumentStatus {
  category: string;
  type: string;
  uploaded: boolean;
  required: boolean;
}

export const EmployeeOnboarding: React.FC<EmployeeOnboardingProps> = ({ employeeId }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [employeeProfile, setEmployeeProfile] = useState<any>(null);
  const [documentStatuses, setDocumentStatuses] = useState<DocumentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Required documents for onboarding
  const requiredDocuments = [
    // KYC Documents
    { category: DOCUMENT_CATEGORIES.KYC_DOCUMENTS, type: 'Aadhaar', required: true },
    { category: DOCUMENT_CATEGORIES.KYC_DOCUMENTS, type: 'Electricity / Utility Bill', required: true },
    { category: DOCUMENT_CATEGORIES.KYC_DOCUMENTS, type: 'PAN', required: true },
    // Education Certificates
    { category: DOCUMENT_CATEGORIES.EDUCATION_CERTIFICATES, type: 'SSC', required: true },
    { category: DOCUMENT_CATEGORIES.EDUCATION_CERTIFICATES, type: 'HSC', required: true },
    { category: DOCUMENT_CATEGORIES.EDUCATION_CERTIFICATES, type: 'Graduation', required: true },
    { category: DOCUMENT_CATEGORIES.EDUCATION_CERTIFICATES, type: 'Post Graduation', required: false },
    // Experience Documents
    { category: DOCUMENT_CATEGORIES.EXPERIENCE_DOCUMENTS, type: 'Experience Letter', required: false },
    { category: DOCUMENT_CATEGORIES.EXPERIENCE_DOCUMENTS, type: 'Previous Company Salary Slips', required: false },
    { category: DOCUMENT_CATEGORIES.EXPERIENCE_DOCUMENTS, type: 'Previous Company Offer / Appointment Letter', required: false },
  ];

  useEffect(() => {
    const initializeOnboarding = async () => {
      try {
        // Get current user profile
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (!userData.id) {
          toast.error('User not found. Please login again.');
          navigate('/login');
          return;
        }

        const profileId = employeeId || userData.id;

        // Fetch employee profile
        const profileResponse = await import('@sdk/profilesService').then(m => m.getProfileById(profileId));
        setEmployeeProfile(profileResponse.profile);

        // Fetch existing documents
        const existingDocuments = await getEmployeeDocuments(profileId);

        // Initialize document statuses
        const statuses = requiredDocuments.map(reqDoc => {
          const uploaded = existingDocuments.some((doc: any) =>
            doc.document_category === reqDoc.category && doc.document_type === reqDoc.type
          );
          return {
            ...reqDoc,
            uploaded
          };
        });

        setDocumentStatuses(statuses);
      } catch (error: any) {
        console.error('Error initializing onboarding:', error);
        toast.error('Failed to load onboarding data');
      } finally {
        setLoading(false);
      }
    };

    initializeOnboarding();
  }, [employeeId, navigate]);

  const handleDocumentUploadSuccess = async () => {
    // Refresh document statuses
    if (!employeeProfile?.id) return;

    try {
      const existingDocuments = await getEmployeeDocuments(employeeProfile.id);

      const updatedStatuses = requiredDocuments.map(reqDoc => {
        const uploaded = existingDocuments.some((doc: any) =>
          doc.document_category === reqDoc.category && doc.document_type === reqDoc.type
        );
        return {
          ...reqDoc,
          uploaded
        };
      });

      setDocumentStatuses(updatedStatuses);
      toast.success('Document uploaded successfully!');
    } catch (error) {
      console.error('Error refreshing document statuses:', error);
    }
  };

  const getCompletionPercentage = () => {
    const requiredDocs = documentStatuses.filter(doc => doc.required);
    const uploadedRequired = requiredDocs.filter(doc => doc.uploaded).length;
    return requiredDocs.length > 0 ? (uploadedRequired / requiredDocs.length) * 100 : 0;
  };

  const getRequiredDocumentsCount = () => {
    return documentStatuses.filter(doc => doc.required).length;
  };

  const getUploadedRequiredCount = () => {
    return documentStatuses.filter(doc => doc.required && doc.uploaded).length;
  };

  const canProceedToNextStep = () => {
    if (currentStep === 0) {
      // Welcome step - always allow
      return true;
    } else if (currentStep === 1) {
      // Document upload step - check if all required documents are uploaded
      return getUploadedRequiredCount() === getRequiredDocumentsCount();
    }
    return true;
  };

  const handleNext = () => {
    if (canProceedToNextStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // Complete onboarding
        handleCompleteOnboarding();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCompleteOnboarding = async () => {
    try {
      // Mark onboarding as complete (you might want to add an onboarding_status field to profiles)
      toast.success('Onboarding completed successfully! Welcome to the team!');
      navigate('/profiles');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete onboarding');
    }
  };

  const steps = [
    {
      title: 'Welcome',
      description: 'Welcome to your onboarding journey!',
      component: (
        <div className="text-center space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Welcome to the Team!</h2>
            <p className="text-gray-600">
              We're excited to have you join us. This onboarding process will help you get set up with all the necessary documentation.
            </p>
          </div>

          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">What you'll need to complete:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">KYC Documents</p>
                  <p className="text-sm text-blue-700">Aadhaar, PAN, Utility Bill</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Education Certificates</p>
                  <p className="text-sm text-blue-700">SSC, HSC, Graduation</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Experience Documents</p>
                  <p className="text-sm text-blue-700">Experience letters, salary slips</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-left">
                <p className="font-medium text-yellow-900">Important Notes:</p>
                <ul className="text-sm text-yellow-800 mt-2 space-y-1">
                  <li>• All documents must be in PDF, JPG, PNG, or DOC format</li>
                  <li>• Maximum file size is 10MB per document</li>
                  <li>• Ensure documents are clearly readable</li>
                  <li>• HR will review and approve your documents</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Document Upload',
      description: 'Upload your required documents',
      component: (
        <div className="space-y-6">
          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Document Upload Progress</span>
                <Badge variant={getCompletionPercentage() === 100 ? 'default' : 'secondary'}>
                  {getUploadedRequiredCount()}/{getRequiredDocumentsCount()} Required Documents
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Overall Progress</span>
                    <span>{Math.round(getCompletionPercentage())}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-2" style={{ width: `${getCompletionPercentage()}%` }} />
                  </div>
                </div>

                {/* Document Status Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documentStatuses.map((doc, index) => (
                    <div
                      key={index}
                      className={`p-4 border rounded-lg ${
                        doc.uploaded
                          ? 'bg-green-50 border-green-200'
                          : doc.required
                          ? 'bg-red-50 border-red-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{doc.type}</span>
                        {doc.uploaded ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : doc.required ? (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <FileText className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{doc.category}</p>
                      {doc.required && (
                        <Badge variant="destructive" className="text-xs mt-2">
                          Required
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document Upload Component */}
          {employeeProfile?.id && (
            <DocumentUpload
              employeeId={employeeProfile.id}
              onUploadSuccess={handleDocumentUploadSuccess}
            />
          )}

          {/* Completion Status */}
          {getCompletionPercentage() === 100 && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-900">All Required Documents Uploaded!</h3>
                    <p className="text-sm text-green-700">
                      Your documents will be reviewed by HR. You can proceed to complete your onboarding.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )
    },
    {
      title: 'Complete',
      description: 'Review and finalize your onboarding',
      component: (
        <div className="text-center space-y-6">
          <div className="space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">Ready to Complete Onboarding!</h2>
            <p className="text-gray-600">
              You've successfully uploaded all required documents. Your onboarding is almost complete.
            </p>
          </div>

          <Card className="bg-blue-50">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">What's Next?</h3>
              <div className="space-y-3 text-left">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-semibold">1</div>
                  <div>
                    <p className="font-medium text-blue-900">HR Review</p>
                    <p className="text-sm text-blue-700">Your documents will be reviewed and approved by HR</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-semibold">2</div>
                  <div>
                    <p className="font-medium text-blue-900">Account Setup</p>
                    <p className="text-sm text-blue-700">You'll receive access to all company systems and tools</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-semibold">3</div>
                  <div>
                    <p className="font-medium text-blue-900">Welcome Meeting</p>
                    <p className="text-sm text-blue-700">Join us for an orientation session with your team</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  if (!employeeProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <CardContent className="text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h2>
            <p className="text-gray-600 mb-4">Unable to load your employee profile.</p>
            <Button onClick={() => navigate('/profiles')}>
              Go to Profiles
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Employee Onboarding</h1>
              <p className="text-gray-600 mt-1">
                Welcome, {employeeProfile.full_name || employeeProfile.email}
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/profiles')}>
              Back to Profiles
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    index <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {index < currentStep ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-2 ${
                      index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm">
              {steps.map((step, index) => (
                <div key={index} className="text-center">
                  <p className={`font-medium ${
                    index <= currentStep ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Current Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep].title}</CardTitle>
          </CardHeader>
          <CardContent>
            {steps[currentStep].component}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceedToNextStep()}
          >
            {currentStep === steps.length - 1 ? (
              <>
                Complete Onboarding
                <CheckCircle className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
