import { PDFDownloadLink } from '@react-pdf/renderer';
import { OfferLetterPdf } from './OfferLetterPdf';
import { ExperienceLetterPdf } from './ExperienceLetterPdf';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const DownloadButton = ({ data, documentType }: { data: any, documentType: string }) => {

    const getDocument = () => {
        switch (documentType) {
            case 'offer_letter':
                return <OfferLetterPdf data={data} />;
            case 'experience_letter':
                return <ExperienceLetterPdf data={data} />;
            default:
                return <OfferLetterPdf data={data} />;
        }
    };

    return (
        <PDFDownloadLink
            document={getDocument()}
            fileName={`${documentType}_${data?.employeeId || 'draft'}.pdf`}
            title="Download PDF"
        >
            {({ loading }) => (
                <Button disabled={loading} variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    {loading ? 'Preparing PDF...' : 'Download PDF (Client-Side)'}
                </Button>
            )}
        </PDFDownloadLink>
    );
};
