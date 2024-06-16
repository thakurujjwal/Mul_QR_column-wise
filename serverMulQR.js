const express = require('express');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send('Welcome to the QR Code Generator API');
});

app.post('/api/generate-qrs', async (req, res) => {
    try {
        const { x, qrPerColumn } = req.body;
        if (!x || !Array.isArray(x) || !qrPerColumn || typeof qrPerColumn !== 'number') {
            return res.status(400).json({ error: 'Array of data and qrPerColumn required' });
        }

        const pageWidth = 72 * 72; // 72 inches in points
        // const pageHeight = 2190.55; // height of the page in points

        const columnsPerPage = 41; // 42 columns
        const columnWidth = pageWidth / columnsPerPage; // width of each column
        const qrBoxWidth = columnWidth - 20; // leave some padding (10 on each side)
        const qrBoxHeight = 200;
        const qrWidth = qrBoxWidth - 20; // leave some padding (10 on each side)
        const qrHeight = qrWidth; // make QR square
        const paddingY = 60;
        const paddingX = 20; // Padding on the X-axis
        const totalqrheight= qrBoxHeight + paddingY +10
        const pageHeight = totalqrheight *qrPerColumn; // height of the page in points

        const doc = new PDFDocument({ autoFirstPage: false });
        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="QR_Codes.pdf"`
        });
        doc.pipe(res);

        let columnIndex = 0;
        let rowIndex = 0;
        let qrCount = 0; // Object to track QR count for each item type

        const addNewPage = () => {
            doc.addPage({ size: [pageWidth, pageHeight] });
            columnIndex = 0;
            rowIndex = 0;
        };

        addNewPage(); // Add the first page

        for (const item of x) {
            // qrCount[item.StyleCode] = 0; // Initialize QR count for each item type

            for (let i = 0; i < item.TotQty; i++) {
                qrCount++;
                // qrCount[item.StyleCode]++; // Increment QR count for the current item type
                const qrNumber = String(qrCount).padStart(7, '0');
                const qrData = `QR${qrNumber} ! ${item.PNo} ! ${item.StyleCode} ! ${item.Color} ! ${item.Size}`;
                const qrCode = await QRCode.toDataURL(qrData);

                const xPosition = columnIndex * columnWidth + paddingX; // Apply padding on X-axis
                const yPosition = rowIndex * (qrBoxHeight + paddingY) + paddingY;

                doc.image(qrCode, xPosition, yPosition, {
                    fit: [qrWidth, qrHeight],
                    align: 'center',
                    valign: 'center'
                });
                doc.text(qrData, xPosition, yPosition + qrHeight + 10, { align: 'center', width: qrWidth });

                rowIndex++;

                if (rowIndex >= qrPerColumn) {
                    rowIndex = 0;
                    columnIndex++;

                    // If starting a new column, check if it's a new page
                    if (columnIndex >= columnsPerPage) {
                        addNewPage();
                    }
                }
            }

            // Check if a new page is needed after each item
            if (columnIndex >= columnsPerPage) {
                addNewPage();
            }
        }

        doc.end();
    } catch (err) {
        console.error(err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
