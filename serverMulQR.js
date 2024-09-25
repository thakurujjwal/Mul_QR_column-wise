const express = require('express');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const cors = require('cors');

// const app = express();
const router = express.Router();
// const PORT = process.env.PORT || 4000;

router.use(express.json());
router.use(cors());

router.get('/', (req, res) => {
    res.send('Welcome to the QR Code Generator API');
});

router.post('/api/generate-qrs', async (req, res) => {
    try {
        const { x, qrPerColumnReq } = req.body;
        // if (!x || !Array.isArray(x) || !qrPerColumnReq || typeof qrPerColumnReq !== 'number') {
        //     return res.status(400).json({ error: 'Array of data and qrPerColumn required' });

        // }
        if (!x || !Array.isArray(x)) {
            return res.status(400).json({ error: 'Array of data required' });
        }


        let qrPerColumn;

        // Check if qrPerColumnReq is provided and is a valid number
        if (typeof qrPerColumnReq === 'number' && qrPerColumnReq > 0) {
            const totalQty = x.reduce((sum, item) => sum + item.TotQty, 0);
            qrPerColumn = Math.ceil(totalQty / qrPerColumnReq);
        } else {
            // Calculate total quantity and qrPerColumn if not provided or invalid
            const totalQty = x.reduce((sum, item) => sum + item.TotQty, 0);
            qrPerColumn = Math.ceil(totalQty / 41) + 1;
        }
        // if (qrPerColumnReq && typeof qrPerColumnReq === 'number') {
        //     qrPerColumn = qrPerColumnReq;
        // } else {
        //     // Calculate total quantity and qrPerColumn
        //     const totalQty = x.reduce((sum, item) => sum + item.TotQty, 0);
        //     qrPerColumn = Math.ceil(totalQty / 41) + 1;
        // }

        const pageWidth = 72 * 72; // 72 inches in points
        const columnsPerPage = 41; // 41 columns
        const columnWidth = (pageWidth / columnsPerPage) - 2 * 0.7; // width of each column
        const qrBoxWidth = columnWidth - 20; // leave some padding (10 on each side)
        const qrBoxHeight = 200 * 0.7;
        const qrWidth = qrBoxWidth - 20; // leave some padding (10 on each side)
        const qrHeight = qrWidth; // make QR square
        const paddingY = 60;
        const paddingX = 20; // Padding on the X-axis
        const totalqrheight = qrBoxHeight + paddingY + 10;
        const contentPaddingX = 60; // Padding inside the page on the X-axis
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
                doc.rect(xPosition - 15, yPosition - 40, qrBoxWidth + 10, qrBoxHeight + 60).stroke();

                doc.image(qrCode, xPosition, yPosition + (qrBoxHeight - qrHeight - 45), { // Adjust position to align at the bottom
                    fit: [qrWidth, qrHeight],
                    align: 'center',
                    valign: 'center'
                });
                // doc.text(qrData, xPosition, yPosition + qrBoxHeight - 65, { // Adjust position to align text below the QR code
                //     align: 'center',
                //     width: qrWidth
                // });
                const originalFontSize = 12; // Assuming the original font size is 12 (you can adjust based on your actual size)
                const reducedFontSize = originalFontSize * 0.7; // Reduce by 30%

                doc.fontSize(10).text(qrData, xPosition, yPosition + qrBoxHeight - 45, { // Adjust position to align text below the QR code
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

// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });
module.exports = router;