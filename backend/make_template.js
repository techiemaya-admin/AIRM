import * as fs from 'fs';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx';

const doc = new Document({
    sections: [
        {
            properties: {},
            children: [
                new Paragraph({
                    text: "MELLOW MINDS CONSULTING SERVICES PRIVATE LIMITED",
                    heading: HeadingLevel.HEADING_2,
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                    text: "Payslip for the month",
                    heading: HeadingLevel.HEADING_3,
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({ text: "" }), // spacing

                // Employee Info Table
                new Table({
                    width: {
                        size: 100,
                        type: WidthType.PERCENTAGE,
                    },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph("Name:")] }),
                                new TableCell({ children: [new Paragraph("{Employee Name}")] }),
                                new TableCell({ children: [new Paragraph("Employee Code:")] }),
                                new TableCell({ children: [new Paragraph("{Employee Code}")] }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph("Joining Date:")] }),
                                new TableCell({ children: [new Paragraph("{Joiningdate}")] }),
                                new TableCell({ children: [new Paragraph("Bank Name:")] }),
                                new TableCell({ children: [new Paragraph("{Bank Name}")] }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph("Designation:")] }),
                                new TableCell({ children: [new Paragraph("{Designation}")] }),
                                new TableCell({ children: [new Paragraph("Bank Account No:")] }),
                                new TableCell({ children: [new Paragraph("{Bank Account No}")] }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph("Department:")] }),
                                new TableCell({ children: [new Paragraph("{Department}")] }),
                                new TableCell({ children: [new Paragraph("IFSC:")] }),
                                new TableCell({ children: [new Paragraph("{IFSC}")] }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph("Effective Work Days:")] }),
                                new TableCell({ children: [new Paragraph("{Effective work day}")] }),
                                new TableCell({ children: [new Paragraph("PAN:")] }),
                                new TableCell({ children: [new Paragraph("{PAN}")] }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph("LOP:")] }),
                                new TableCell({ children: [new Paragraph("{LOP}")] }),
                                new TableCell({ children: [new Paragraph("Location:")] }),
                                new TableCell({ children: [new Paragraph("{Location}")] }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph("Leave Balance:")] }),
                                new TableCell({ children: [new Paragraph("{Leave balance}")] }),
                                new TableCell({ children: [new Paragraph("Leave Availed:")] }),
                                new TableCell({ children: [new Paragraph("{Leave Availed}")] }),
                            ],
                        }),
                    ],
                }),

                new Paragraph({ text: "" }), // spacing

                // Earnings/Deductions Table
                new Table({
                    width: {
                        size: 100,
                        type: WidthType.PERCENTAGE,
                    },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph("Description")], columnSpan: 2 }),
                                new TableCell({ children: [new Paragraph("Amount")], columnSpan: 2 }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph("Basic Salary")] }),
                                new TableCell({ children: [new Paragraph("{Basic Salary}")] }),
                                new TableCell({ children: [new Paragraph("PT")] }),
                                new TableCell({ children: [new Paragraph("{PT}")] }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph("HRA")] }),
                                new TableCell({ children: [new Paragraph("{HRA}")] }),
                                new TableCell({ children: [new Paragraph("")] }),
                                new TableCell({ children: [new Paragraph("")] }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph("Other Allowances")] }),
                                new TableCell({ children: [new Paragraph("{Other Allowances}")] }),
                                new TableCell({ children: [new Paragraph("")] }),
                                new TableCell({ children: [new Paragraph("")] }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph("Gross Payable:")] }),
                                new TableCell({ children: [new Paragraph("{Gross Payable}")] }),
                                new TableCell({ children: [new Paragraph("Total Deduction:")] }),
                                new TableCell({ children: [new Paragraph("{Total Deduction}")] }),
                            ],
                        }),
                    ],
                }),

                new Paragraph({ text: "" }), // spacing

                // Net Pay
                new Table({
                    width: {
                        size: 100,
                        type: WidthType.PERCENTAGE,
                    },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph("Net Pay for the month : {Net Pay}")] }),
                            ],
                        }),
                    ],
                }),
            ],
        },
    ],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync('C:/Users/prasanna/Downloads/REAL_TEXT_Payslip_Template.docx', buffer);
    console.log('Created working template at C:/Users/prasanna/Downloads/REAL_TEXT_Payslip_Template.docx');
});
