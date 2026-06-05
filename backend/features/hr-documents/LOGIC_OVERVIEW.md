# HR Document Generation Logic

The HR Document Generator in the AIRM system is built as a robust template-to-document pipeline. It allows users to upload standard Word documents (`.docx`) and merge them with employee data to create professional PDFs or Word files.

## 1. Template Processing Architecture

When a template is uploaded or selected, the following logic is executed:

### A. Template Ingestion (`mammoth.js`)
*   **Conversion**: The backend uses the `mammoth` library to convert `.docx` files into clean, semantic HTML. This preserves structure while making the content editable by templating engines.
*   **Metadata Storage**: A metadata file (`.meta.json`) is created for each template, storing the original filename, upload date, and a list of extracted fields.

### B. Placeholder Extraction
The system automatically identifies two types of placeholders in the templates:
1.  **Handlebars Tokens**: `{{employee_name}}`, `{{salary}}`, etc.
2.  **Business Brackets**: `[Employee Name]`, `[Designation]`, `[Date of joining]`.

## 2. Rendering Engines

The system supports two primary output formats, each using a specialized logic path:

### A. PDF Generation (Puppeteer Pipeline)
This is the most complex path, designed for high-fidelity documents:
1.  **Selection**: The system retrieves the base HTML from the template.
2.  **Mapping**: It applies a `bracketMappings` object to replace bracketed strings with actual employee data (e.g., replacing `[Employee name]` with `John Doe`).
3.  **Handlebars Compilation**: The `handlebars` library is then run over the HTML to resolve any remaining `{{}}` tokens.
4.  **Styling Wrapper**: The merged HTML is wrapped in a standard document header containing CSS for:
    *   **A4 Paper size** (210mm x 297mm)
    *   **Typography** (Times New Roman, 12pt)
    *   **Margins** (10mm - 20mm)
5.  **Puppeteer Rendering**: A headless Chrome instance (`puppeteer`) is launched. It "prints" the HTML to a PDF buffer with `networkidle0` wait time to ensure all styles are loaded.

### B. DOCX Generation (Binary Merging)
For users who need editable Word files:
1.  **Library**: Uses `docxtemplater` and `pizzip`.
2.  **Binary Editing**: Instead of converting to HTML, it opens the `.docx` XML structure directly.
3.  **Data Injection**: It performs a direct data merge into the document's XML tags and returns the modified binary buffer.

## 3. Data Schema

The generation logic expects a JSON data object. Common mapped fields include:

| Field | Description |
| :--- | :--- |
| `employee_name` | Full name of the employee |
| `designation` | Job title / Position |
| `department` | Business unit |
| `date_of_joining` | Start date |
| `salary` | Compensation details |
| `address` | Residence details |
| `manager_name` | Reporting manager |

## 4. File Delivery

The final step is dynamic filename generation. The system constructs a name using the pattern:
`{EmployeeName}_{DocumentType}_{Timestamp}.pdf`

**Example**: `John_Doe_Offer_Letter_2026-04-20.pdf`

---

### Technical Stack Summary
*   **Extraction**: `mammoth` (DOCX -> HTML)
*   **Templating**: `handlebars` (Logic-based merging)
*   **PDF Engine**: `puppeteer` (Headless Chrome rendering)
*   **DOCX Engine**: `docxtemplater` (XML-level merging)
*   **Storage**: Local `uploads/hr-documents` directory with metadata tracking
