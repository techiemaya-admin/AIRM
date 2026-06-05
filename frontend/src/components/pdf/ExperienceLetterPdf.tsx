import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: {
        paddingTop: 40,
        paddingHorizontal: 40,
        paddingBottom: 60,
        fontSize: 12,
        lineHeight: 1.5,
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingBottom: 10,
    },
    companyName: {
        fontSize: 16,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    companyAddress: {
        fontSize: 10,
        color: '#666',
        marginTop: 4,
    },
    title: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 20,
        textDecoration: 'underline',
        textTransform: 'uppercase',
    },
    content: {
        marginTop: 10,
        marginBottom: 10,
        textAlign: 'justify',
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
    footer: {
        marginTop: 50,
    },
    signatureLine: {
        marginTop: 40,
        borderTopWidth: 1,
        borderTopColor: '#000',
        width: 200,
        paddingTop: 5,
    },
    authorizedSignatory: {
        fontWeight: 'bold',
    }
});

export const ExperienceLetterPdf = ({ data }: { data: any }) => (
    <Document>
        <Page size="A4" style={styles.page}>

            {/* Header with Company Info */}
            <View style={styles.header}>
                <Text style={styles.companyName}>{data?.companyName || 'Techiemaya FZE'}</Text>
                <Text style={styles.companyAddress}>
                    {data?.companyAddress || 'Mezzanine Floor, Office 08, IDS Building, Al Karama, Dubai, UAE'}
                </Text>
            </View>

            <Text style={styles.title}>TO WHOM SO EVER IT MAY CONCERN</Text>

            <View style={styles.content}>
                <Text>
                    Date: {data?.currentDate || new Date().toLocaleDateString()}
                </Text>
            </View>

            <View style={styles.content}>
                <Text>
                    This is to certify that <Text style={{ fontWeight: 'bold' }}>{data?.employeeName || '[Employee Name]'}</Text> (Employee ID: {data?.employeeId || '[ID]'}) was employed with us from <Text style={{ fontWeight: 'bold' }}>{data?.dateOfJoining || '[Date]'}</Text> to <Text style={{ fontWeight: 'bold' }}>{data?.dateOfLeaving || 'Present'}</Text>.
                </Text>
            </View>

            <View style={styles.content}>
                <Text>
                    During their tenure, they held the position of <Text style={{ fontWeight: 'bold' }}>{data?.designation || '[Designation]'}</Text> in the <Text style={{ fontWeight: 'bold' }}>{data?.department || '[Department]'}</Text> department.
                </Text>
            </View>

            <View style={styles.content}>
                <Text>
                    They performed their duties with diligence and commitment. We found them to be sincere, hard-working, and reliable.
                </Text>
            </View>

            <View style={styles.content}>
                <Text>
                    We wish them all the best in their future endeavors.
                </Text>
            </View>

            <View style={styles.footer}>
                <Text>For {data?.companyName || 'Techiemaya FZE'},</Text>

                <View style={styles.signatureLine}>
                    <Text style={styles.authorizedSignatory}>Authorized Signatory</Text>
                </View>
            </View>
        </Page>
    </Document>
);
