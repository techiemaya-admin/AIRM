import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts if needed, otherwise fallback to Helvetica/Times
// Font.register({
//   family: 'TimesNewRoman',
//   src: '/fonts/times.ttf',
// });

const styles = StyleSheet.create({
    page: {
        paddingTop: 40,
        paddingHorizontal: 40,
        paddingBottom: 60,
        // fontFamily: 'TimesNewRoman', // Use generic if font not available
        fontSize: 12,
        lineHeight: 1.4,
    },
    title: {
        textAlign: 'center',
        fontSize: 18,
        marginBottom: 10,
        fontWeight: 'bold',
    },
    h2: {
        textAlign: 'center',
        fontSize: 14,
        marginBottom: 8,
        textDecoration: 'underline',
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 12,
    },
    row: {
        display: 'flex',
        flexDirection: 'row',
        marginBottom: 5,
    },
    label: {
        width: 150,
        fontWeight: 'bold',
    },
    value: {
        flex: 1,
    },
});

export const OfferLetterPdf = ({ data }: { data: any }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <Text style={styles.title}>OFFER OF EMPLOYMENT</Text>

            <View style={styles.section}>
                <Text>Date: {data?.dateOfJoining ? new Date(data.dateOfJoining).toLocaleDateString() : new Date().toLocaleDateString()}</Text>
            </View>

            <View style={styles.section}>
                <Text>To,</Text>
                <Text>{data?.employeeName || '[Candidate Name]'}</Text>
                <Text>{data?.address || '[Address]'}</Text>
            </View>

            <Text style={styles.h2}>Subject: Offer Letter</Text>

            <View style={styles.section}>
                <Text>Dear {data?.employeeName || 'Candidate'},</Text>
                <Text>
                    We are pleased to offer you the position of {data?.designation || '[Designation]'} at {data?.companyName || 'Techiemaya FZE'}, based in {data?.department || '[Department]'}.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Terms of Employment:</Text>
                <View style={styles.row}>
                    <Text style={styles.label}>Designation:</Text>
                    <Text style={styles.value}>{data?.designation}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Department:</Text>
                    <Text style={styles.value}>{data?.department}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Date of Joining:</Text>
                    <Text style={styles.value}>{data?.dateOfJoining}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Compensation:</Text>
                    <Text style={styles.value}>{data?.grossSalary ? `INR ${data.grossSalary}` : '[Salary]'}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text>
                    We look forward to welcoming you to our team. Please sign and return a copy of this letter as a token of your acceptance.
                </Text>
            </View>

            <View style={{ marginTop: 50 }}>
                <Text>Sincerely,</Text>
                <Text style={{ marginTop: 30, fontWeight: 'bold' }}>Authorized Signatory</Text>
                <Text>{data?.companyName || 'Techiemaya FZE'}</Text>
            </View>
        </Page>
    </Document>
);
