const express = require('express');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const cors = require('cors');



// const app = express();
const router = express.Router();
router.use(express.json());
router.use(cors());

router.post('/api/generate-pdf', async (req, res) => {
    const { qrDataArray } = req.body; // Array of QR data objects

    if (!qrDataArray || qrDataArray.length === 0) {
        return res.status(400).send('Invalid input data');
    }

    // Define the margin size for the page (equal padding on all sides)
    const margin = 20;
    const boxSpacing = 10; // Space between each QR box (horizontal and vertical)

    // Create a new PDF document and pipe it directly to the response, set margins
    const doc = new PDFDocument({ size: 'A4', margin });

    // Set the content type and disposition to serve the file for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=qr_codes_with_labels.pdf');

    // Pipe the document directly to the response
    doc.pipe(res);

    const qrCodesPerRow = 5; // Number of QR codes per row
    const pageWidth = 595.28 - 2 * margin; // A4 page width in points (subtracting the left and right margins)
    const qrBoxSize = (pageWidth - (qrCodesPerRow - 1) * boxSpacing) / qrCodesPerRow; // Box width with space between
    const qrBoxHeight = qrBoxSize + 40; // Increase box height for padding
    const qrSize = qrBoxSize - 20; // QR size reduced for padding
    let row = 0, col = 0;

    const drawQRWithLabel = async (doc, qrData, currentNum, x, y, qrSize, qrBoxSize, qrBoxHeight) => {
        const qrString = `${currentNum} ! ${qrData.PNo} ! ${qrData.StyleCode} !  ${qrData.Color} ! ${qrData.Size} !  ${qrData.BNo} `;

        // Generate the QR code image as a base64 string
        const qrCodeDataUrl = await QRCode.toDataURL(qrString, { errorCorrectionLevel: 'M', width: qrSize });
        const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');

        // Draw the box with border
        doc.rect(x, y, qrBoxSize, qrBoxHeight).stroke(); // Increase the height of the box

        // Add QR code image inside the box, adjusted for padding
        doc.image(Buffer.from(base64Data, 'base64'), x + 10, y + 15, { fit: [qrSize - 10, qrSize - 10] });

        // Add label under the QR code
        doc.fontSize(8).text(`BNo: ${qrData.BNo} , Style: ${qrData.StyleCode} , Size: ${qrData.Size} , Color: ${qrData.Color} , QR No: ${currentNum}`, x + 5, y + qrSize + 10, { width: qrBoxSize - 10, align: 'center' });
    };

    // Loop through the array of QR data
    for (const qrData of qrDataArray) {
        const from = qrData.RFr; // Starting number (e.g., 11)
        const to = qrData.RTo;   // Ending number (e.g., 25)

        // Loop through the range of QR codes
        for (let currentNum = from; currentNum <= to; currentNum++) {
            const x = margin + col * (qrBoxSize + boxSpacing); // Add margin and spacing to x
            const y = margin + 10 + row * (qrBoxHeight + boxSpacing); // Add margin and spacing to y

            await drawQRWithLabel(doc, qrData, currentNum, x, y, qrSize, qrBoxSize, qrBoxHeight);

            col++;
            if (col >= qrCodesPerRow) {
                col = 0;
                row++;
                if (margin + 10 + (row + 1) * (qrBoxHeight + boxSpacing) > doc.page.height - margin) { // Check for page height with margin and spacing
                    doc.addPage();
                    row = 0;
                }
            }
        }
    }

    // Finalize the PDF document
    doc.end();
});

// Start the server
// app.listen(4000, () => {
//     console.log('Server is running on port 4000');
// });
module.exports = router;