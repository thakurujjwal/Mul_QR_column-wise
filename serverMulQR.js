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
        // const { x, qrPerColumn } = req.body;
        // if (!x || !Array.isArray(x) || !qrPerColumn || typeof qrPerColumn !== 'number') {
        //     return res.status(400).json({ error: 'Array of data and qrPerColumn required' });
        // }

        const { x } = req.body;
        if (!x || !Array.isArray(x)) {
            return res.status(400).json({ error: 'Array of data required' });
        }

        // Calculate total quantity and qrPerColumn
        const totalQty = x.reduce((sum, item) => sum + item.TotQty, 0);
        const qrPerColumn = Math.ceil(totalQty / 41)+1;

        const pageWidth = 72 * 72; // 72 inches in points
        const columnsPerPage = 41; // 41 columns
        const columnWidth = (pageWidth / columnsPerPage) - 2; // width of each column
        const qrBoxWidth = columnWidth - 20; // leave some padding (10 on each side)
        const qrBoxHeight = 200;
        const qrWidth = qrBoxWidth - 20; // leave some padding (10 on each side)
        const qrHeight = qrWidth; // make QR square
        const paddingY = 60;
        const paddingX = 20; // Padding on the X-axis
        const totalqrheight = qrBoxHeight + paddingY + 10;
        const contentPaddingX = 40; // Padding inside the page on the X-axis
        const contentPaddingY = 40; // Padding inside the page on the Y-axis
        const pageHeight = totalqrheight * qrPerColumn + 15 + contentPaddingY; // height of the page in points

        const doc = new PDFDocument({ autoFirstPage: false });
        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="QR_Codes.pdf"`
        });
        doc.pipe(res);

        let columnIndex = 0;
        let rowIndex = 0;
        let qrCount = 0; // Object to track QR count for each item type
        let prevItemType = null; // Track previous item type

        const addNewPage = () => {
            doc.addPage({ size: [pageWidth, pageHeight] });
            columnIndex = 0;
            rowIndex = 0;
        };

        addNewPage(); // Add the first page

        for (const item of x) {
            const currentItemKey = `${item.PNo}-${item.StyleCode}-${item.Color}-${item.Size}`;

            if (currentItemKey !== prevItemType) {
                // Add separator box with text
                if (rowIndex > 0) {
                    rowIndex++;
                }

                const xPosition = columnIndex * columnWidth + paddingX + contentPaddingX; // Add content padding on X-axis
                const yPosition = rowIndex * (qrBoxHeight + paddingY) + paddingY + 20 + contentPaddingY; // Add content padding on Y-axis

                // Draw a dotted border as a separator
                doc.rect(xPosition - 20, yPosition - 40, qrBoxWidth + 20, qrBoxHeight + 60)
                    .dash(5, { space: 5 })
                    .stroke();
                doc.undash();

                // Add text inside the box
                doc.fillColor('red').text(`New Item Type: ${item.PNo} ! ${item.StyleCode} ! ${item.Color} ! ${item.Size}`, xPosition - 10, (yPosition - qrHeight) - 100, {
                    align: 'center',
                    width: qrBoxWidth,
                    Color: 'red'
                });
                // Reset the color back to default for the rest of the text
                doc.fillColor('black');

                // rowIndex++;
                prevItemType = currentItemKey;
            }

            for (let i = 0; i < item.TotQty; i++) {
                qrCount++;
                const qrNumber = String(qrCount).padStart(7, '0');
                const qrData = `QR${qrNumber} ! ${item.PNo} ! ${item.StyleCode} ! ${item.Color} ! ${item.Size}`;
                const qrCode = await QRCode.toDataURL(qrData);

                const xPosition = columnIndex * columnWidth + paddingX + contentPaddingX; // Apply content padding on X-axis
                const yPosition = rowIndex * (qrBoxHeight + paddingY) + paddingY + 20 + contentPaddingY; // Apply content padding on Y-axis

                // Draw border
                doc.rect(xPosition - 20, yPosition - 40, qrBoxWidth + 20, qrBoxHeight + 60).stroke();

                doc.image(qrCode, xPosition, yPosition + (qrBoxHeight - qrHeight - 75), { // Adjust position to align at the bottom
                    fit: [qrWidth, qrHeight],
                    align: 'center',
                    valign: 'center'
                });
                doc.text(qrData, xPosition, yPosition + qrBoxHeight - 65, { // Adjust position to align text below the QR code
                    align: 'center',
                    width: qrWidth
                });

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
